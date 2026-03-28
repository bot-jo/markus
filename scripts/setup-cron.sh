#!/bin/bash
# Setup cron job for podcast preparation
# Runs prepare-podcast.py at 06:00 on Mon, Wed, Fri

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo "Setting up cron job for podcast preparation..."
echo "Repo path: $REPO_DIR"

# Cron job definition
CRON="0 6 * * 1,3,5 cd $REPO_DIR && /usr/bin/python3 scripts/prepare-podcast.py >> scripts/logs/cron.log 2>&1"

# Remove any existing podcast cron entries first
crontab -l 2>/dev/null | grep -v "prepare-podcast.py" | crontab - 2>/dev/null || true

# Add new cron entry
(crontab -l 2>/dev/null; echo "$CRON") | crontab -

echo "Cron job installed successfully."
echo ""
echo "Current crontab:"
crontab -l | grep -v "^#" || echo "(no entries)"
echo ""
echo "To remove the cron job, run:"
echo "  crontab -l | grep -v 'prepare-podcast.py' | crontab -"
