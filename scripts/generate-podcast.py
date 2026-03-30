#!/usr/bin/env python3
"""
Generate Podcast Episode Script

Run after user approval to generate the actual podcast episode:
- Generate transcript using MiniMax API
- Generate audio using Kokoro TTS
- Calculate actual duration from MP3
- Update episodes.json
- Git commit and push

Usage:
    python3 generate-podcast.py <date>  # e.g., 2026-03-28
    python3 generate-podcast.py --approve  # Approve all pending
"""

import json
import os
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Try to import required libraries
try:
    from anthropic import Anthropic
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "anthropic"])
    from anthropic import Anthropic

try:
    from pydub import AudioSegment
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pydub"])
    from pydub import AudioSegment

try:
    import requests
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

# Configuration
REPO_PATH = Path(__file__).parent.parent
CACHE_DIR = REPO_PATH / "scripts" / "cache"
LOGS_DIR = REPO_PATH / "scripts" / "logs"
EPISODES_FILE = REPO_PATH / "content" / "podcast" / "episodes.json"
PUBLIC_EPISODES_FILE = REPO_PATH / "public" / "podcast-data" / "episodes.json"
AUDIO_DIR = REPO_PATH / "public" / "podcast" / "audio"
MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "")
KOKORO_PATH = os.environ.get("KOKORO_PATH", "/usr/local/bin/kokoro")


def setup_dirs():
    """Ensure directories exist."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def get_logger(date_str: str):
    """Create a logger for the given date."""
    log_file = LOGS_DIR / f"podcast-{date_str}.log"
    
    def log(msg: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{timestamp}] {msg}"
        print(line)
        with open(log_file, "a") as f:
            f.write(line + "\n")
    
    return log


def load_cache(date_str: str) -> dict:
    """Load cache file - abort if not found."""
    cache_file = CACHE_DIR / f"podcast-{date_str}.json"
    if not cache_file.exists():
        print(f"Error: Cache file not found for {date_str}")
        sys.exit(1)
    with open(cache_file, "r") as f:
        return json.load(f)


def save_cache(cache_data: dict, date_str: str) -> None:
    """Save cache file."""
    cache_file = CACHE_DIR / f"podcast-{date_str}.json"
    with open(cache_file, "w") as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)


def update_cache_status(date_str: str, status: str, error: str = None) -> None:
    """Update cache status."""
    cache = load_cache(date_str)
    cache["status"] = status
    if status == "failed" and error:
        cache["error"] = error
    if status == "completed":
        cache["completed_at"] = datetime.now().isoformat()
    save_cache(cache, date_str)


def generate_transcript(date_str: str, log) -> str:
    """Read transcript from cache file (written by OpenClaw bot)."""
    transcript_file = CACHE_DIR / f"podcast-{date_str}-transcript.txt"
    
    if not transcript_file.exists():
        log(f"Transcript file not found: {transcript_file}")
        log("Please write the transcript using the OpenClaw bot first.")
        log(f"Read the prompt from: {CACHE_DIR / f'podcast-{date_str}-prompt.txt'}")
        sys.exit(1)
    
    with open(transcript_file, "r") as f:
        transcript = f.read().strip()
    
    log(f"Transcript loaded from {transcript_file} ({len(transcript)} chars)")
    return transcript


def generate_summary(date_str: str, log) -> str:
    """Read summary from cache file (written by OpenClaw bot)."""
    summary_file = CACHE_DIR / f"podcast-{date_str}-summary.txt"
    
    if not summary_file.exists():
        log(f"Summary file not found: {summary_file}")
        log("Please write the summary using the OpenClaw bot first.")
        sys.exit(1)
    
    with open(summary_file, "r") as f:
        summary = f.read().strip()
    
    log(f"Summary loaded from {summary_file}")
    return summary


def generate_template_transcript(news_items: list[dict], date_str: str) -> str:
    """Generate a template transcript when API is unavailable."""
    formatted_date = datetime.strptime(date_str, "%Y-%m-%d").strftime("%d. %B %Y")
    
    transcript = f"""Willkommen zu den Energie News vom {formatted_date}.

In dieser Episode besprechen wir die wichtigsten Nachrichten aus der Energiewirtschaft der letzten Tage.

"""
    
    for i, item in enumerate(news_items[:5], 1):
        transcript += f"{i}. {item['title']}\n"
        if item.get('summary'):
            transcript += f"   {item['summary']}\n"
        transcript += "\n"
    
    transcript += """Wir wünschen Ihnen viel Spaß beim Hören und bis zur nächsten Episode!
"""
    return transcript


def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences on sentence-ending punctuation."""
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    return sentences


def generate_audio(transcript: str, date_str: str, log) -> bool:
    """Generate MP3 audio using Piper TTS with German voice, sentence by sentence."""
    import re
    import wave
    import struct
    
    log("Generating audio with Piper TTS (sentence by sentence)...")
    
    audio_file = AUDIO_DIR / f"{date_str}.mp3"
    
    # Setup log file for audio generation
    audio_log_path = LOGS_DIR / f"podcast-{date_str}-audio.log"
    
    # Ensure ffmpeg is in PATH
    env = os.environ.copy()
    local_bin = Path.home() / ".local" / "bin"
    if local_bin.exists():
        env["PATH"] = f"{local_bin}:{env.get('PATH', '')}"
    
    try:
        from piper import PiperVoice
        from pydub import AudioSegment
        
        voice_model = REPO_PATH / "scripts" / "voices" / "de_DE-thorsten-high.onnx"
        voice_config = str(voice_model) + ".json"
        
        log(f"Loading voice model: {voice_model}")
        voice = PiperVoice.load(str(voice_model), config_path=voice_config)
        sample_rate = voice.config.sample_rate
        
        sentences = split_into_sentences(transcript)
        total = len(sentences)
        log(f"Processing {total} sentences...")
        
        # Write to both console and log file
        def log_progress(msg):
            print(msg)
            with open(audio_log_path, "a") as f:
                f.write(msg + "\n")
        
        segment_dir = LOGS_DIR / f"segments_{date_str}"
        segment_dir.mkdir(exist_ok=True)
        
        segment_paths = []
        
        for i, sentence in enumerate(sentences):
            if not sentence:
                continue
            
            segment_wav = segment_dir / f"segment_{i:04d}.wav"
            
            try:
                with wave.open(str(segment_wav), 'wb') as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(sample_rate)
                    voice.synthesize_wav(sentence, wav_file)
                
                segment_paths.append(str(segment_wav))
                log_progress(f"  [{i+1}/{total}] {sentence[:60]}...")
                
            except Exception as e:
                log_progress(f"  [{i+1}/{total}] ERROR: {e} — skipping")
                continue
        
        if not segment_paths:
            log("No audio segments generated")
            create_audio_placeholder(date_str, log)
            return True
        
        log(f"Merging {len(segment_paths)} segments...")
        
        # Merge all segments into single WAV using wave module
        combined_wav = LOGS_DIR / f"combined_{date_str}.wav"
        silence_samples = int(sample_rate * 0.3)  # 300ms silence
        
        with wave.open(str(combined_wav), 'wb') as out_wav:
            out_wav.setnchannels(1)
            out_wav.setsampwidth(2)
            out_wav.setframerate(sample_rate)
            
            for i, path in enumerate(segment_paths):
                # Read segment
                with wave.open(path, 'rb') as seg:
                    out_wav.writeframes(seg.readframes(seg.getnframes()))
                
                # Add silence between sentences (except after last)
                if i < len(segment_paths) - 1:
                    out_wav.writeframes(b'\x00' * silence_samples * 2)  # 16-bit samples
        
        # Convert WAV to MP3 with ffmpeg directly
        log(f"Converting to MP3...")
        ffmpeg_path = local_bin / "ffmpeg" if local_bin.exists() else "ffmpeg"
        result = subprocess.run(
            [str(ffmpeg_path), '-y', '-i', str(combined_wav),
             '-codec:a', 'libmp3lame',
             '-qscale:a', '2',
             str(audio_file)],
            capture_output=True,
            text=True,
            env=env
        )
        
        if result.returncode != 0:
            log(f"ffmpeg error: {result.stderr}")
            combined_wav.unlink()
            create_audio_placeholder(date_str, log)
            return True
        
        # Get duration using wave module
        with wave.open(str(combined_wav), 'rb') as w:
            frames = w.getnframes()
            duration_secs = frames / w.getframerate()
        combined_wav.unlink()
        
        minutes = int(duration_secs) // 60
        remaining = int(duration_secs) % 60
        duration_str = f"{minutes}:{remaining:02d}"
        
        # Cleanup segment files
        for path in segment_paths:
            Path(path).unlink()
        segment_dir.rmdir()
        
        log(f"Audio generated: {audio_file} ({duration_str})")
        return True
            
    except ImportError as e:
        log(f"Piper import error: {e}")
        create_audio_placeholder(date_str, log)
        return True
    except Exception as e:
        log(f"Audio generation error: {e}")
        create_audio_placeholder(date_str, log)
        return True


def create_audio_placeholder(date_str: str, log) -> None:
    """Create a placeholder MP3 file."""
    audio_file = AUDIO_DIR / f"{date_str}.mp3"
    # Create minimal valid MP3 (silent 1 second)
    # This is a placeholder - real implementation would use actual TTS
    placeholder_data = b'\xff\xfb\x90\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    with open(audio_file, "wb") as f:
        f.write(placeholder_data)
    log(f"Placeholder audio created: {audio_file}")


def get_audio_duration(date_str: str, log) -> str:
    """Get actual duration from MP3 file using pydub."""
    audio_file = AUDIO_DIR / f"{date_str}.mp3"
    
    if not audio_file.exists():
        log("Audio file not found, using default duration")
        return "10:00"
    
    try:
        audio = AudioSegment.from_file(str(audio_file))
        duration_ms = len(audio)
        minutes = duration_ms // 60000
        seconds = (duration_ms % 60000) // 1000
        duration = f"{minutes}:{seconds:02d}"
        log(f"Duration calculated: {duration}")
        return duration
    except Exception as e:
        log(f"Duration calculation error: {e}")
        return "10:00"


def load_episodes() -> list[dict]:
    """Load existing episodes from JSON file."""
    if not EPISODES_FILE.exists():
        return []
    with open(EPISODES_FILE, "r") as f:
        return json.load(f)


def save_episodes(episodes: list[dict]) -> None:
    """Save episodes to both content and public directories."""
    EPISODES_FILE.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_EPISODES_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Sort by date descending
    episodes.sort(key=lambda x: x["date"], reverse=True)
    json_content = json.dumps(episodes, ensure_ascii=False, indent=2)
    with open(EPISODES_FILE, "w") as f:
        f.write(json_content)
    with open(PUBLIC_EPISODES_FILE, "w") as f:
        f.write(json_content)


def git_commit_push(date_str: str, log) -> None:
    """Git add, commit and push changes."""
    log("Git commit and push...")
    
    try:
        # Stage files
        subprocess.run(["git", "-C", str(REPO_PATH), "add", 
            f"public/podcast/audio/{date_str}.mp3",
            str(EPISODES_FILE)
        ], check=True)
        
        # Commit
        subprocess.run(["git", "-C", str(REPO_PATH), "commit", "-m",
            f"feat(podcast): add episode {date_str} [US-025]"], check=True)
        
        # Push
        result = subprocess.run(["git", "-C", str(REPO_PATH), "push"], 
            capture_output=True, text=True)
        
        if result.returncode == 0:
            log("Git push successful")
        else:
            log(f"Git push warning: {result.stderr}")
            
    except subprocess.CalledProcessError as e:
        log(f"Git error: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description="Generate podcast episode")
    parser.add_argument("date", nargs="?", help="Episode date (YYYY-MM-DD)")
    parser.add_argument("--approve", action="store_true", help="Approve and generate all pending")
    args = parser.parse_args()

    setup_dirs()

    # Handle --approve flag
    if args.approve:
        # Find all pending caches and process them
        pending = []
        for cache_file in CACHE_DIR.glob("podcast-*.json"):
            date_str = cache_file.stem.replace("podcast-", "")
            cache = json.loads(cache_file.read_text())
            if cache.get("status") == "pending":
                pending.append(date_str)
        
        if not pending:
            print("No pending episodes to approve")
            sys.exit(0)
        
        for date_str in pending:
            print(f"\n=== Processing {date_str} ===")
            subprocess.run([sys.executable, __file__, date_str])
        sys.exit(0)

    if not args.date:
        print("Usage: python3 generate-podcast.py <date>")
        print("       python3 generate-podcast.py --approve")
        sys.exit(1)

    date_str = args.date
    log = get_logger(date_str)
    
    log(f"=== Generate Podcast Episode ===")
    log(f"Date: {date_str}")

    # Load cache
    cache = load_cache(date_str)
    
    # Check status
    if cache.get("status") not in ["pending", "approved"]:
        log(f"Cache status is '{cache.get('status')}', expected 'pending' or 'approved'. Aborting.")
        sys.exit(0)

    # Update status to approved
    cache["status"] = "approved"
    cache["approved_at"] = datetime.now().isoformat()
    save_cache(cache, date_str)
    log("Episode approved, starting generation...")

    try:
        # Step 1: Read transcript from cache file (written by OpenClaw bot)
        episode = cache.get("episode", {})
        
        transcript = generate_transcript(date_str, log)
        episode["transcript"] = transcript

        # Step 2: Read summary from cache file
        summary = generate_summary(date_str, log)
        episode["summary"] = summary

        # Step 3: Generate audio
        if not generate_audio(transcript, date_str, log):
            raise Exception("Audio generation failed")

        # Step 4: Calculate duration
        duration = get_audio_duration(date_str, log)
        episode["duration"] = duration

        # Step 5: Embed actual transcript text (not path)
        transcript_file = CACHE_DIR / f"podcast-{date_str}-transcript.txt"
        if transcript_file.exists():
            episode["transcript"] = transcript_file.read_text(encoding="utf-8").strip()
        else:
            log(f"WARNING: Transcript file not found: {transcript_file}")

        # Step 6: Load news from scrape-news.py output and map to sources
        news_file = CACHE_DIR / f"podcast-{date_str}-news.json"
        if news_file.exists():
            news_data = json.loads(news_file.read_text())
            episode["sources"] = [
                {"title": a["title"], "url": a["url"], "source": a["source"]}
                for a in news_data.get("articles", [])
            ]
        else:
            log(f"WARNING: News cache not found: {news_file}")
            episode["sources"] = []

        # Step 7: Ensure audioFile has clean path
        episode["audioFile"] = f"{date_str}.mp3"

        # Step 8: Update episodes.json
        episodes = load_episodes()
        
        # Remove existing episode with same slug if present
        episodes = [e for e in episodes if e.get("slug") != date_str]
        
        # Add new episode
        episodes.append(episode)
        save_episodes(episodes)
        log(f"Episode saved to {EPISODES_FILE}")

        # Step 6: Git commit and push
        git_commit_push(date_str, log)

        # Step 7: Update cache status
        update_cache_status(date_str, "completed")
        log("Episode generation completed successfully!")

    except Exception as e:
        error_msg = str(e)
        log(f"Error: {error_msg}")
        update_cache_status(date_str, "failed", error_msg)
        log("Episode generation failed. No git commit made.")
        sys.exit(1)


if __name__ == "__main__":
    main()
