#!/usr/bin/env python3
"""
Automated Energy News Podcast Preparation Script

Runs via cron on Mon/Wed/Fri at 06:00.
Scrapes news from multiple sources, prepares a topic preview,
and asks the user for approval before generating the episode.

Usage:
    python3 prepare-podcast.py [--dry-run]
"""

import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional

# Try to import required libraries, install if missing
try:
    import feedparser
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "feedparser"])
    import feedparser

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

from bs4 import BeautifulSoup

# Configuration
REPO_PATH = Path(__file__).parent.parent
EPISODES_FILE = REPO_PATH / "content/podcast/episodes.json"
AUDIO_DIR = REPO_PATH / "public/podcast/audio"
OPENCLAW_SESSION = os.environ.get("OPENCLAW_SESSION", "main")

# News sources with RSS feeds
RSS_SOURCES = {
    # Österreich
    "orf_news": {
        "url": "https://rss.orf.at/news.xml",
        "keywords": ["energie", "strom", "gas", "erneuerbar", "photovoltaik", "wind", "wärme"],
        "country": "AT",
    },
    "der_standard": {
        "url": "https://www.derstandard.at/rss/wirtschaft",
        "keywords": ["energie", "strom", "gas", "erneuerbar", "photovoltaik", "wind"],
        "country": "AT",
    },
    "kleine_zeitung": {
        "url": "https://www.kleinezeitung.at/service/rss/wirtschaft.rss",
        "keywords": ["energie", "strom", "gas", "erneuerbar"],
        "country": "AT",
    },
    # Deutschland
    "tagesspiegel_energie": {
        "url": "https://www.tagesspiegel.de/wirtschaft/energie/feed/",
        "keywords": ["energie", "strom", "gas", "erneuerbar", "wind", "solar"],
        "country": "DE",
    },
    "handelsblatt_energie": {
        "url": "https://www.handelsblatt.com/rss/energie",
        "keywords": ["energie", "strom", "gas", "erneuerbar"],
        "country": "DE",
    },
    "energie_management": {
        "url": "https://www.energie-und-management.de/feed/",
        "keywords": ["energie", "strom", "gas", "erneuerbar", "wind", "solar"],
        "country": "DE",
    },
    "energiezukunft": {
        "url": "https://energiezukunft.eu/feed/",
        "keywords": ["energie", "strom", "gas", "erneuerbar", "wind", "solar", "klimawandel"],
        "country": "DE",
    },
    # International
    "renewables_now": {
        "url": "https://renewablesnow.com/feed/",
        "keywords": ["energy", "renewable", "solar", "wind", "power"],
        "country": "INT",
    },
    "pv_magazine": {
        "url": "https://www.pv-magazine.de/feed/",
        "keywords": ["photovoltaik", "solar", "energie", "pv"],
        "country": "DE",
    },
    "carbon_brief": {
        "url": "https://www.carbonbrief.org/feed/",
        "keywords": ["energy", "climate", "carbon", "renewable"],
        "country": "INT",
    },
    "energy_monitor": {
        "url": "https://energymonitor.ai/feed/",
        "keywords": ["energy", "renewable", "wind", "solar", "grid"],
        "country": "INT",
    },
}

# Additional web scraping sources (fallback if RSS fails)
SCRAPE_SOURCES = {
    "apa": {
        "url": "https://www.apa.at/",
        "keywords": ["energie", "strom", "gas", "erneuerbar", "photovoltaik", "wind"],
        "country": "AT",
    },
    "reuters_energy": {
        "url": "https://feeds.reuters.com/reuters/businessNews",
        "keywords": ["energy", "oil", "gas", "renewable", "solar", "wind"],
        "country": "INT",
    },
}


def fetch_rss_feed(source_name: str, source_config: dict) -> list[dict]:
    """Fetch and parse RSS feed, filtering by keywords."""
    news_items = []
    try:
        feed = feedparser.parse(source_config["url"])
        keywords = [k.lower() for k in source_config["keywords"]]

        for entry in feed.entries[:10]:  # Limit to 10 entries per source
            title = entry.get("title", "").lower()
            summary = ""
            if hasattr(entry, "summary"):
                summary = entry.summary.lower()
            elif hasattr(entry, "description"):
                summary = entry.description.lower()
            elif hasattr(entry, "content"):
                summary = entry.content[0].value.lower() if entry.content else ""

            # Check if any keyword matches
            if any(kw in title or kw in summary for kw in keywords):
                news_items.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "source": source_name,
                    "country": source_config["country"],
                    "summary": summary[:200] + "..." if len(summary) > 200 else summary,
                })
    except Exception as e:
        print(f"Error fetching {source_name}: {e}")

    return news_items


def scrape_webpage(source_name: str, source_config: dict) -> list[dict]:
    """Fallback: scrape webpage for news articles."""
    news_items = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; PodcastBot/1.0)",
        }
        response = requests.get(source_config["url"], headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, "html.parser")
        keywords = [k.lower() for k in source_config["keywords"]]

        # Find article links and titles
        for link in soup.find_all("a", href=True)[:10]:
            title = link.get_text().lower()
            href = link["href"]

            if any(kw in title for kw in keywords) and href.startswith("http"):
                news_items.append({
                    "title": link.get_text().strip(),
                    "link": href,
                    "source": source_name,
                    "country": source_config["country"],
                    "summary": "",
                })
    except Exception as e:
        print(f"Error scraping {source_name}: {e}")

    return news_items


def scrape_all_news() -> list[dict]:
    """Scrape news from all configured sources."""
    all_news = []

    # RSS feeds
    for source_name, source_config in RSS_SOURCES.items():
        news = fetch_rss_feed(source_name, source_config)
        all_news.extend(news)
        print(f"Fetched {len(news)} items from {source_name}")

    # Web scraping fallback
    for source_name, source_config in SCRAPE_SOURCES.items():
        news = scrape_webpage(source_name, source_config)
        all_news.extend(news)
        print(f"Scraped {len(news)} items from {source_name}")

    # Deduplicate by title
    seen_titles = set()
    unique_news = []
    for item in all_news:
        title_key = item["title"].lower()[:50]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_news.append(item)

    return unique_news


def generate_episode_metadata(news_items: list[dict], date_str: str) -> dict:
    """Generate episode metadata from news items."""
    # Group by country
    by_country = {}
    for item in news_items:
        country = item.get("country", "INT")
        if country not in by_country:
            by_country[country] = []
        by_country[country].append(item)

    # Create summary
    summary_parts = []
    if "AT" in by_country and by_country["AT"]:
        summary_parts.append(f"{len(by_country['AT'])} Meldungen aus Österreich")
    if "DE" in by_country and by_country["DE"]:
        summary_parts.append(f"{len(by_country['DE'])} Meldungen aus Deutschland")
    if "INT" in by_country and by_country["INT"]:
        summary_parts.append(f"{len(by_country['INT'])} internationale Meldungen")

    summary = f"In dieser Episode besprechen wir {' und '.join(summary_parts)}. "
    summary += "Die Themen reichen von Photovoltaik-Ausbau über Windenergie bis hin zu internationalen Marktentwicklungen."

    # Create transcript
    transcript = f"""Willkommen zu den Energie News vom {date_str}.

In today's episode, we cover the latest developments in the energy sector.
"""

    # Add top news items to transcript
    for i, item in enumerate(news_items[:5], 1):
        transcript += f"\n\n{i}. {item['title']}"
        if item.get("summary"):
            transcript += f"\n   {item['summary']}"

    transcript += f"""

Wir wünschen Ihnen viel Spaß beim Hören!
"""

    return {
        "slug": date_str,
        "title": f"Energie News — {date_str}",
        "date": date_str,
        "duration": "10:00",
        "summary": summary,
        "transcript": transcript.strip(),
        "audioFile": f"{date_str}.mp3",
    }


def load_episodes() -> list[dict]:
    """Load existing episodes from JSON file."""
    if not EPISODES_FILE.exists():
        return []
    with open(EPISODES_FILE, "r") as f:
        return json.load(f)


def save_episodes(episodes: list[dict]) -> None:
    """Save episodes to JSON file."""
    EPISODES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(EPISODES_FILE, "w") as f:
        json.dump(episodes, f, ensure_ascii=False, indent=2)


def send_approval_request(episode_preview: dict, news_count: int) -> None:
    """Send approval request via OpenClaw."""
    preview_text = f"""
🎙️ *Neue Podcast-Episode zur Genehmigung*

📅 *Datum:* {episode_preview['date']}
📰 *Nachrichten:* {news_count} Artikel gesammelt
⏱️ *Dauer:* {episode_preview['duration']}

*Zusammenfassung:*
{episode_preview['summary'][:200]}...

---

Zum Genehmigen:
`/approve-podcast {episode_preview['slug']}`

Zum Ablehnen:
`/reject-podcast {episode_preview['slug']}`
"""

    # Write to a pending approval file for OpenClaw to pick up
    pending_file = REPO_PATH / ".pending-podcast-approval.json"
    with open(pending_file, "w") as f:
        json.dump({
            "episode": episode_preview,
            "news_count": news_count,
            "created_at": datetime.now().isoformat(),
        }, f, ensure_ascii=False, indent=2)

    print(preview_text)
    print(f"\n[Approval request saved to {pending_file}]")
    print("Waiting for user approval...")


def main():
    parser = argparse.ArgumentParser(description="Prepare energy news podcast episode")
    parser.add_argument("--dry-run", action="store_true", help="Run without sending approval request")
    parser.add_argument("--force", action="store_true", help="Skip approval and generate directly")
    args = parser.parse_args()

    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")

    print(f"=== Podcast Preparation Script ===")
    print(f"Date: {date_str}")
    print(f"Dry run: {args.dry_run}")
    print()

    # Check if episode already exists
    episodes = load_episodes()
    if any(ep["slug"] == date_str for ep in episodes):
        print(f"Episode for {date_str} already exists!")
        sys.exit(0)

    # Scrape news
    print("Scraping news from all sources...")
    news_items = scrape_all_news()
    print(f"Total unique news items: {len(news_items)}")

    if not news_items:
        print("No news items found. Aborting.")
        sys.exit(1)

    # Generate episode preview
    episode_preview = generate_episode_metadata(news_items, date_str)
    print(f"\nEpisode preview generated:")
    print(f"  Title: {episode_preview['title']}")
    print(f"  Summary: {episode_preview['summary'][:100]}...")

    if args.dry_run:
        print("\n[Dry run - no approval request sent]")
        sys.exit(0)

    if args.force:
        # Directly add episode without approval
        episodes.append(episode_preview)
        save_episodes(episodes)
        print(f"\nEpisode added and saved to {EPISODES_FILE}")
    else:
        # Send approval request
        send_approval_request(episode_preview, len(news_items))


if __name__ == "__main__":
    main()
