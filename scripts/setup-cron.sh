#!/bin/bash
# NOTE: The podcast generation cron job is now managed by OpenClaw.
# Use: openclaw cron list / openclaw cron rm <id>
# The job runs via OpenClaw cron, not system cron.

echo "Podcast cron job is managed by OpenClaw."
echo ""
openclaw cron list 2>/dev/null | grep -i podcast || echo "(no podcast cron jobs)"
