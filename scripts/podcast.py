#!/usr/bin/env python3
"""
Energie Weekly Podcast Generator

Fully automatic podcast generation - no approval required.
Runs via cron on Mon/Wed/Fri at 05:00.

Pipeline:
1. Scrape news from RSS sources
2. Generate transcript via OpenClaw bot
3. Generate audio via Piper TTS
4. Update episodes.json
5. Git commit and push
6. Send status notification to user
"""

import json
import os
import re
import sys
import wave
import subprocess
from datetime import date, datetime
from pathlib import Path

# Try to import required libraries
try:
    import feedparser
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "feedparser"])
    import feedparser

try:
    import requests
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

try:
    from pydub import AudioSegment
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pydub"])
    from pydub import AudioSegment

from dotenv import load_dotenv
load_dotenv()

# Config
REPO_DIR = Path('/home/markus/.openclaw/workspace/markus')
CACHE_DIR = REPO_DIR / 'scripts' / 'cache'
VOICES_DIR = REPO_DIR / 'scripts' / 'voices'
AUDIO_DIR = REPO_DIR / 'public' / 'podcast' / 'audio'
EPISODES_JSON = REPO_DIR / 'content' / 'podcast' / 'episodes.json'
PUBLIC_EPISODES_JSON = REPO_DIR / 'public' / 'podcast-data' / 'episodes.json'
LOG_DIR = REPO_DIR / 'scripts' / 'logs'
VOICE_MODEL = VOICES_DIR / 'de_DE-thorsten-high.onnx'
VOICE_CONFIG = str(VOICE_MODEL) + '.json'

TODAY = date.today().isoformat()
LOG_FILE = LOG_DIR / f'podcast-{TODAY}.log'


def log(msg: str):
    timestamp = datetime.now().strftime('%H:%M:%S')
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')


def setup_dirs():
    """Ensure all required directories exist."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def scrape_news() -> list[dict]:
    """Scrape news from all configured RSS sources."""
    sources = [
        # Austria
        ("Der Standard", "https://www.derstandard.at/rss/wirtschaft"),
        ("Kleine Zeitung", "https://www.kleinezeitung.at/rss/wirtschaft"),
        # Germany
        ("PV Magazine", "https://www.pv-magazine.de/feed/"),
        ("SolarServer", "https://www.solarserver.de/feed/"),
        # International
        ("Carbon Brief", "https://www.carbonbrief.org/feed/"),
        ("Energy Monitor", "https://energymonitor.ai/feed/"),
        ("CleanTechnica", "https://cleantechnica.com/feed/"),
        ("Phys.org", "https://phys.org/rss-feed/"),
    ]

    keywords = [
        "energie", "strom", "gas", "solar", "wind", "wasserstoff",
        "photovoltaik", "erneuerbar", "klimaschutz", "energiewende",
        "speicher", "netz", "co2", "carbon", "renewable", "energy",
        "hydrogen", "grid", "climate", "power", "electricity",
        "emission", "kohle", "fossil", "temperatur", "kühlung",
    ]

    articles = []
    for source_name, url in sources:
        try:
            feed = feedparser.parse(url)
            count = 0
            for entry in feed.entries[:20]:
                text = (entry.get('title', '') + ' ' + entry.get('summary', '')).lower()
                if any(kw in text for kw in keywords):
                    articles.append({
                        "title": entry.get('title', ''),
                        "summary": entry.get('summary', '')[:500],
                        "url": entry.get('link', ''),
                        "source": source_name
                    })
                    count += 1
            log(f"  {source_name}: {count} articles")
        except Exception as e:
            log(f"  {source_name}: ERROR — {e}")
            continue

    # Deduplicate by title similarity
    seen = []
    unique = []
    for a in articles:
        if not any(a['title'][:40] in s for s in seen):
            seen.append(a['title'][:40])
            unique.append(a)

    return unique[:25]


def write_prompt(articles: list[dict]) -> tuple[Path, Path]:
    """Write transcript prompt and summary prompt for OpenClaw bot."""
    formatted = "\n\n".join([
        f"Quelle: {a['source']}\nTitel: {a['title']}\n{a['summary']}"
        for a in articles
    ])

    transcript_prompt = f"""Schreibe einen deutschen Podcast-Text für "Energie Weekly"
basierend auf diesen Nachrichten vom {TODAY}:

{formatted}

Struktur:
1. Begrüßung und Übersicht (ca. 100 Wörter)
2. Hauptthemen (3-4 Themen, je ca. 350 Wörter)
3. Ausblick und Verabschiedung (ca. 100 Wörter)

Gesamtlänge: 1400-1600 Wörter.
Kein Markdown, nur fließender gesprochener Text.
Beginne mit: "Willkommen bei Energie Weekly..." """

    summary_prompt = f"""Schreibe eine kurze Zusammenfassung (2-3 Sätze) für die Episode "{TODAY}" des Energie Weekly Podcasts.
Die Zusammenfassung sollte die Hauptthemen der Episode kurz zusammenfassen.
Maximal 300 Zeichen. Auf Deutsch."""

    transcript_file = CACHE_DIR / f'podcast-{TODAY}-transcript.txt'
    summary_file = CACHE_DIR / f'podcast-{TODAY}-summary.txt'
    prompt_file = CACHE_DIR / f'podcast-{TODAY}-prompt.txt'

    # Only write the prompt to prompt file - NOT to transcript file
    # The OpenClaw bot will read the prompt and write actual content to transcript/summary
    prompt_file.write_text(transcript_prompt, encoding='utf-8')
    summary_file.write_text(summary_prompt, encoding='utf-8')

    log(f"Prompt saved to {prompt_file}")
    log(f"Transcript will be generated by OpenClaw bot...")

    return transcript_file, summary_file


def signal_openclaw():
    """Signal OpenClaw bot to generate transcript and summary."""
    marker_file = CACHE_DIR / f'podcast-{TODAY}-generate.marker'
    marker_file.write_text(datetime.now().isoformat(), encoding='utf-8')
    log(f"OpenClaw marker created: {marker_file}")
    log("OpenClaw bot will generate transcript and summary...")


def wait_for_transcript(timeout_minutes: int = 10) -> tuple[str, str]:
    """Wait for OpenClaw bot to generate transcript and summary."""
    transcript_file = CACHE_DIR / f'podcast-{TODAY}-transcript.txt'
    summary_file = CACHE_DIR / f'podcast-{TODAY}-summary.txt'
    prompt_file = CACHE_DIR / f'podcast-{TODAY}-prompt.txt'

    # Read the prompt to detect when transcript differs from it
    prompt_content = prompt_file.read_text(encoding='utf-8').strip()[:100] if prompt_file.exists() else ""

    log(f"Waiting for transcript generation (timeout: {timeout_minutes} min)...")

    start = datetime.now()
    while (datetime.now() - start).seconds < timeout_minutes * 60:
        if transcript_file.exists() and summary_file.exists():
            transcript = transcript_file.read_text(encoding='utf-8').strip()
            summary = summary_file.read_text(encoding='utf-8').strip()
            # Ensure transcript is not just the prompt and has real content
            if transcript and len(transcript) > 500 and transcript[:50] != prompt_content[:50]:
                log(f"Transcript ready ({len(transcript)} chars)")
                log(f"Summary ready ({len(summary)} chars)")
                return transcript, summary
        import time
        time.sleep(30)
        elapsed = int((datetime.now() - start).seconds / 60)
        log(f"  ...still waiting ({elapsed} min)")

    raise TimeoutError(f"Transcript generation timed out after {timeout_minutes} minutes")


def generate_audio(transcript: str) -> tuple[str, str]:
    """Generate MP3 audio using Piper TTS, sentence by sentence."""
    from piper import PiperVoice

    log("Loading Piper voice model...")
    voice = PiperVoice.load(str(VOICE_MODEL), config_path=VOICE_CONFIG)
    sample_rate = voice.config.sample_rate

    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', transcript.strip()) if s.strip()]
    log(f"Generating audio for {len(sentences)} sentences...")

    audio_file = AUDIO_DIR / f'{TODAY}.mp3'
    segment_dir = CACHE_DIR / f'segments_{TODAY}'
    segment_dir.mkdir(exist_ok=True)

    audio_log = LOG_DIR / f'podcast-{TODAY}-audio.log'
    silence_samples = int(sample_rate * 0.3)

    segment_paths = []
    for i, sentence in enumerate(sentences):
        seg_path = segment_dir / f"seg_{i:04d}.wav"
        try:
            with wave.open(str(seg_path), 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                voice.synthesize_wav(sentence, wf)
            segment_paths.append(str(seg_path))
            if i % 10 == 0:
                msg = f"  [{i+1}/{len(sentences)}] {sentence[:50]}..."
                print(msg)
                with open(audio_log, 'a') as f:
                    f.write(msg + '\n')
        except Exception as e:
            msg = f"  [{i+1}/{len(sentences)}] ERROR: {e} — skipping"
            print(msg)
            with open(audio_log, 'a') as f:
                f.write(msg + '\n')
            continue

    if not segment_paths:
        raise RuntimeError("No audio segments generated")

    log(f"Merging {len(segment_paths)} segments...")

    combined_wav = CACHE_DIR / f'combined_{TODAY}.wav'
    with wave.open(str(combined_wav), 'wb') as out_wav:
        out_wav.setnchannels(1)
        out_wav.setsampwidth(2)
        out_wav.setframerate(sample_rate)

        for i, path in enumerate(segment_paths):
            with wave.open(path, 'rb') as seg:
                out_wav.writeframes(seg.readframes(seg.getnframes()))
            if i < len(segment_paths) - 1:
                out_wav.writeframes(b'\x00' * silence_samples * 2)

    log("Converting to MP3...")
    env = os.environ.copy()
    local_bin = Path.home() / '.local' / 'bin'
    if local_bin.exists():
        env["PATH"] = f"{local_bin}:{env.get('PATH', '')}"

    ffmpeg_path = local_bin / 'ffmpeg' if local_bin.exists() else 'ffmpeg'
    result = subprocess.run(
        [str(ffmpeg_path), '-y', '-i', str(combined_wav),
         '-codec:a', 'libmp3lame', '-qscale:a', '2', str(audio_file)],
        capture_output=True, text=True, env=env
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr}")

    combined_wav.unlink()

    # Get duration using ffmpeg directly
    env = os.environ.copy()
    local_bin = Path.home() / '.local' / 'bin'
    if local_bin.exists():
        env["PATH"] = f"{local_bin}:{env.get('PATH', '')}"
    ffmpeg_path = local_bin / 'ffmpeg' if local_bin.exists() else 'ffmpeg'

    probe_result = subprocess.run(
        [str(ffmpeg_path), '-i', str(audio_file)],
        capture_output=True, text=True, env=env
    )
    # Parse duration from ffmpeg output
    duration = "10:00"  # default
    for line in probe_result.stderr.split('\n'):
        if 'Duration:' in line:
            # Format: Duration: 00:10:23.39, start: ...
            time_str = line.split('Duration:')[1].split(',')[0].strip()
            h, m, s = time_str.split(':')
            minutes = int(h) * 60 + int(m)
            seconds = int(s.split('.')[0])
            duration = f"{minutes}:{seconds:02d}"
            break

    for path in segment_paths:
        Path(path).unlink()
    segment_dir.rmdir()

    log(f"Audio generated: {audio_file} ({duration})")
    return str(audio_file), duration


def update_episodes_json(episode: dict):
    """Update episodes.json in both content and public directories."""
    episodes = json.loads(EPISODES_JSON.read_text())
    episodes = [e for e in episodes if e['slug'] != episode['slug']]
    episodes.insert(0, episode)

    json_content = json.dumps(episodes, ensure_ascii=False, indent=2)
    EPISODES_JSON.write_text(json_content)
    PUBLIC_EPISODES_JSON.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_EPISODES_JSON.write_text(json_content)
    log("episodes.json updated")


def git_push():
    """Git add, commit and push."""
    log("Git commit and push...")

    cmds = [
        ['git', '-C', str(REPO_DIR), 'add',
         f'public/podcast/audio/{TODAY}.mp3',
         str(EPISODES_JSON),
         str(PUBLIC_EPISODES_JSON)],
        ['git', '-C', str(REPO_DIR), 'commit', '-m',
         f'feat(podcast): add episode {TODAY} [US-025, US-028]'],
        ['git', '-C', str(REPO_DIR), 'push']
    ]

    for cmd in cmds:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Git error: {result.stderr}")

    log("Pushed to GitHub")


def notify(success: bool, details: str = ""):
    """Send notification to user via OpenClaw."""
    if success:
        msg = f"""✅ Podcast Episode bereit!

📅 Episode: Energie News — {TODAY}
🎙 Energie Weekly ist live auf der GitHub Page.

{details}"""
    else:
        msg = f"""❌ Podcast Generierung fehlgeschlagen

📅 Datum: {TODAY}
Fehler: {details}

Log: scripts/logs/podcast-{TODAY}.log"""

    notify_file = CACHE_DIR / f'notify-{TODAY}.txt'
    notify_file.write_text(msg, encoding='utf-8')
    log(f"Notification saved: {notify_file}")

    # Also print for immediate visibility
    print("\n" + "="*50)
    print(msg)
    print("="*50 + "\n")


def main():
    setup_dirs()

    log(f"=== Energie Weekly Podcast Generator ===")
    log(f"Date: {TODAY}")

    try:
        # Step 1: Scrape news
        log("Scraping news from RSS sources...")
        articles = scrape_news()
        log(f"Total articles collected: {len(articles)}")

        if len(articles) < 3:
            raise RuntimeError(f"Only {len(articles)} articles found (minimum 3 required)")

        # Step 2: Write prompt for OpenClaw bot
        write_prompt(articles)

        # Step 3: Signal OpenClaw to generate transcript
        signal_openclaw()

        # Step 4: Wait for transcript and summary
        transcript, summary = wait_for_transcript(timeout_minutes=15)

        # Step 5: Build episode object
        episode = {
            "slug": TODAY,
            "title": f"Energie News — {TODAY}",
            "date": TODAY,
            "duration": "10:00",  # Will be updated
            "summary": summary,
            "transcript": transcript,
            "audioFile": f"{TODAY}.mp3",
            "sources": [
                {"title": a["title"], "url": a["url"], "source": a["source"]}
                for a in articles
            ]
        }

        # Step 6: Generate audio
        audio_path, duration = generate_audio(transcript)
        episode["duration"] = duration

        # Step 7: Update episodes.json
        update_episodes_json(episode)

        # Step 8: Git push
        git_push()

        # Step 9: Notify
        notify(True, f"Duration: {duration}, Sources: {len(articles)}")

        log("Podcast generation completed successfully!")

    except Exception as e:
        error_msg = str(e)
        log(f"ERROR: {error_msg}")
        notify(False, error_msg)
        raise


if __name__ == "__main__":
    main()
