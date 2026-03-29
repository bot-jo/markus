#!/usr/bin/env python3
"""
Generate audio for a podcast episode.
Reads transcript from cache, generates MP3, saves to public/.
"""

import re
import sys
import wave
import subprocess
import os
from pathlib import Path

# Add parent to path for piper
sys.path.insert(0, str(Path(__file__).parent))

try:
    from piper import PiperVoice
except ImportError:
    print("Installing piper...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "piper-tts"])
    from piper import PiperVoice

try:
    from pydub import AudioSegment
except ImportError:
    print("Installing pydub...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pydub"])
    from pydub import AudioSegment


def get_duration(file_path):
    """Get duration of audio file using ffmpeg."""
    local_bin = Path.home() / '.local' / 'bin'
    ffmpeg_path = local_bin / 'ffmpeg' if local_bin.exists() else 'ffmpeg'
    env = os.environ.copy()
    if local_bin.exists():
        env["PATH"] = f"{local_bin}:{env.get('PATH', '')}"

    result = subprocess.run(
        [str(ffmpeg_path), '-i', str(file_path)],
        capture_output=True, text=True, env=env
    )
    for line in result.stderr.split('\n'):
        if 'Duration:' in line:
            time_str = line.split('Duration:')[1].split(',')[0].strip()
            h, m, s = time_str.split(':')
            minutes = int(h) * 60 + int(m)
            seconds = int(s.split('.')[0])
            return f"{minutes}:{seconds:02d}"
    return "10:00"


def generate_audio(date_str: str) -> str:
    """Generate MP3 audio for the given date."""
    from pathlib import Path

    REPO_DIR = Path(__file__).parent.parent
    VOICE_MODEL = REPO_DIR / 'scripts' / 'voices' / 'de_DE-thorsten-high.onnx'
    VOICE_CONFIG = str(VOICE_MODEL) + '.json'
    CACHE_DIR = REPO_DIR / 'scripts' / 'cache'
    AUDIO_DIR = REPO_DIR / 'public' / 'podcast' / 'audio'
    LOG_DIR = REPO_DIR / 'scripts' / 'logs'

    transcript_file = CACHE_DIR / f'podcast-{date_str}-transcript.txt'
    audio_file = AUDIO_DIR / f'{date_str}.mp3'

    if not transcript_file.exists():
        print(f"Transcript not found: {transcript_file}")
        return None

    transcript = transcript_file.read_text(encoding='utf-8').strip()
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', transcript.strip()) if s.strip()]

    print(f"Loading voice: {VOICE_MODEL}")
    voice = PiperVoice.load(str(VOICE_MODEL), config_path=VOICE_CONFIG)
    sample_rate = voice.config.sample_rate

    print(f"Generating audio for {len(sentences)} sentences...")

    segment_dir = CACHE_DIR / f'segments_{date_str}'
    segment_dir.mkdir(exist_ok=True)

    audio_log = LOG_DIR / f'audio-{date_str}.log'
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
            msg = f"  [{i+1}/{len(sentences)}] ERROR: {e}"
            print(msg)
            with open(audio_log, 'a') as f:
                f.write(msg + '\n')
            continue

    if not segment_paths:
        print("No audio segments generated")
        return None

    print(f"Merging {len(segment_paths)} segments...")

    combined_wav = CACHE_DIR / f'combined_{date_str}.wav'
    with wave.open(str(combined_wav), 'wb') as out_wav:
        out_wav.setnchannels(1)
        out_wav.setsampwidth(2)
        out_wav.setframerate(sample_rate)
        for i, path in enumerate(segment_paths):
            with wave.open(path, 'rb') as seg:
                out_wav.writeframes(seg.readframes(seg.getnframes()))
            if i < len(segment_paths) - 1:
                out_wav.writeframes(b'\x00' * silence_samples * 2)

    print("Converting to MP3...")
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    local_bin = Path.home() / '.local' / 'bin'
    env = os.environ.copy()
    if local_bin.exists():
        env["PATH"] = f"{local_bin}:{env.get('PATH', '')}"
    ffmpeg_path = local_bin / 'ffmpeg' if local_bin.exists() else 'ffmpeg'

    result = subprocess.run(
        [str(ffmpeg_path), '-y', '-i', str(combined_wav),
         '-codec:a', 'libmp3lame', '-qscale:a', '2', str(audio_file)],
        capture_output=True, text=True, env=env
    )

    if result.returncode != 0:
        print(f"ffmpeg error: {result.stderr}")
        return None

    combined_wav.unlink()
    for path in segment_paths:
        Path(path).unlink()
    segment_dir.rmdir()

    duration = get_duration(audio_file)
    print(f"Audio generated: {audio_file} ({duration})")
    return duration


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate-audio.py <date>")
        sys.exit(1)

    date_str = sys.argv[1]
    duration = generate_audio(date_str)

    if duration:
        print(f"\nDuration: {duration}")
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
