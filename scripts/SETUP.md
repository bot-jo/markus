# Podcast Cron Setup

## Install Dependencies

```bash
cd scripts
pip install -r requirements.txt
```

## Cron Job Setup

Add to crontab (`crontab -e`):

```
# Run podcast preparation script Mon/Wed/Fri at 06:00
0 6 * * 1,3,5 /usr/bin/python3 /home/markus/.openclaw/workspace/markus/scripts/prepare-podcast.py >> /var/log/podcast-prepare.log 2>&1
```

## Manual Run

```bash
# Dry run (no approval sent)
python3 scripts/prepare-podcast.py --dry-run

# Force generate without approval
python3 scripts/prepare-podcast.py --force

# Normal run (sends approval request)
python3 scripts/prepare-podcast.py
```

## OpenClaw Integration

The script creates `.pending-podcast-approval.json` when approval is needed.

For approval handling, the user can:
- Approve via OpenClaw message to generate the episode
- Reject to discard the pending episode

## Audio Generation

After episode is approved, generate MP3 using ElevenLabs TTS:

```bash
# Example: Generate MP3 from transcript
sag --voice "Matthew" --output public/podcast/audio/2026-03-28.mp3 "Willkommen zu den Energie News..."
```

## Episode Publication Flow

1. Cron triggers `prepare-podcast.py` at 06:00
2. Script scrapes news, generates preview
3. Approval request sent via OpenClaw
4. User approves → episode metadata saved to `content/podcast/episodes.json`
5. User generates MP3 audio file
6. GitHub Pages automatically deploys updated site
