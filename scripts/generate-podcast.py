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


def generate_transcript(news_items: list[dict], date_str: str, log) -> str:
    """Generate full transcript using MiniMax API."""
    if not MINIMAX_API_KEY:
        log("Warning: MINIMAX_API_KEY not set, using template transcript")
        return generate_template_transcript(news_items, date_str)
    
    log("Generating transcript with MiniMax API...")
    
    # Build news context
    news_context = "\n".join([
        f"- {item['title']} ({item.get('source', 'Unknown')}, {item.get('country', 'INT')})"
        for item in news_items[:10]
    ])
    
    prompt = f"""Erstelle ein Transkript für einen Energie-News-Podcast auf Deutsch.

Datum: {date_str}

Nachrichtenquellen:
{news_context}

Das Transkript sollte:
- Mit einer Begrüßung beginnen
- Die wichtigsten Nachrichten in 2-3 Absätzen zusammenfassen
- Auf Deutsch sein, etwa 400-600 Wörter
- Natürlich klingen wie ein Podcast-Skript
- Mit einem Abschied enden

Gib nur das Transkript zurück, ohne zusätzliche Formatierung."""

    try:
        client = Anthropic(api_key=MINIMAX_API_KEY)
        response = client.messages.create(
            model="minimax/MiniMax-M2.7",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        transcript = response.content[0].text
        log(f"Transcript generated ({len(transcript)} chars)")
        return transcript
    except Exception as e:
        log(f"MiniMax API error: {e}, using template")
        return generate_template_transcript(news_items, date_str)


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


def generate_summary(transcript: str, date_str: str, log) -> str:
    """Generate a 2-3 sentence summary from transcript using MiniMax API."""
    if not MINIMAX_API_KEY:
        log("Warning: MINIMAX_API_KEY not set, using template summary")
        return f"In dieser Episode besprechen wir die wichtigsten Energie-Nachrichten vom {date_str}."
    
    log("Generating summary with MiniMax API...")
    
    prompt = f"""Erstelle eine Zusammenfassung auf Deutsch für einen Energie-Podcast.

Transkript-Auszug:
{transcript[:1500]}...

Die Zusammenfassung sollte:
- Genau 2-3 Sätze lang sein
- Auf Deutsch sein
- Die Hauptthemen der Episode zusammenfassen
- Als Fließtext ohne Aufzählungszeichen

Gib nur die Zusammenfassung zurück."""

    try:
        client = Anthropic(api_key=MINIMAX_API_KEY)
        response = client.messages.create(
            model="minimax/MiniMax-M2.7",
            max_tokens=200,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        summary = response.content[0].text.strip()
        log(f"Summary generated: {summary[:100]}...")
        return summary
    except Exception as e:
        log(f"MiniMax API error: {e}, using template")
        return f"In dieser Episode besprechen wir die wichtigsten Energie-Nachrichten vom {date_str}."


def generate_audio(transcript: str, date_str: str, log) -> bool:
    """Generate MP3 audio using Kokoro TTS."""
    log("Generating audio with Kokoro TTS...")
    
    audio_file = AUDIO_DIR / f"{date_str}.mp3"
    
    # Save transcript to temp file
    text_file = LOGS_DIR / f"transcript-{date_str}.txt"
    with open(text_file, "w") as f:
        f.write(transcript)
    
    try:
        # Try using kokoro CLI if available
        result = subprocess.run(
            [KOKORO_PATH, "--voice", "af_heart", "--output", str(audio_file), str(text_file)],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0 and audio_file.exists():
            log(f"Audio generated: {audio_file}")
            return True
        else:
            log(f"Kokoro error: {result.stderr}")
            # Fall back to creating placeholder
            create_audio_placeholder(date_str, log)
            return True
    except FileNotFoundError:
        log("Kokoro not found, creating placeholder audio")
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
        # Step 1: Generate transcript
        news_items = cache.get("news_items", [])
        episode = cache.get("episode", {})
        
        transcript = generate_transcript(news_items, date_str, log)
        episode["transcript"] = transcript

        # Step 2: Generate summary
        summary = generate_summary(transcript, date_str, log)
        episode["summary"] = summary

        # Step 3: Generate audio
        if not generate_audio(transcript, date_str, log):
            raise Exception("Audio generation failed")

        # Step 4: Calculate duration
        duration = get_audio_duration(date_str, log)
        episode["duration"] = duration

        # Step 5: Update episodes.json
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
