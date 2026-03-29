#!/bin/bash
# Setup cron job for fully automatic podcast generation
# Runs podcast.py at 05:00 on Mon, Wed, Fri

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo "Setting up cron job for fully automatic podcast generation..."
echo "Repo path: $REPO_DIR"

# Remove existing podcast cron entries
crontab -l 2>/dev/null | grep -v -E "podcast|prepare-podcast|generate-podcast" | crontab - 2>/dev/null || true

# Add single cron job: Mon/Wed/Fri at 05:00
CRON_LINE="0 5 * * 1,3,5 cd $REPO_DIR && /usr/bin/python3 scripts/podcast.py >> scripts/logs/cron.log 2>&1"
(crontab -l 2>/dev/null; echo "# Energie Weekly Podcast — Mon/Wed/Fri 05:00") | crontab -
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo ""
echo "Cron job installed:"
crontab -l | grep podcast || echo "(no podcast entries)"
echo ""
echo "Schedule: Mon/Wed/Fri at 05:00"
echo ""
echo "To remove:"
echo "  crontab -l | grep -v podcast | crontab -"
