#!/usr/bin/env python3
"""
Automated Energy News Podcast Preparation Script

Runs via cron on Mon/Wed/Fri at 06:00.
Scrapes news, prepares a topic preview, asks for approval,
and stores everything in a cache file for the generate script.

Usage:
    python3 prepare-podcast.py [--dry-run]
"""

import json
import os
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

# Try to import required libraries, install if missing
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
    from bs4 import BeautifulSoup
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "beautifulsoup4"])
    from bs4 import BeautifulSoup

# Configuration
REPO_PATH = Path(__file__).parent.parent
CACHE_DIR = REPO_PATH / "scripts" / "cache"
LOGS_DIR = REPO_PATH / "scripts" / "logs"
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


def setup_dirs():
    """Ensure cache and logs directories exist."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


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


def fetch_rss_feed(source_name: str, source_config: dict, log) -> list[dict]:
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
        log(f"Fetched {len(news_items)} items from {source_name}")
    except Exception as e:
        log(f"Error fetching {source_name}: {e}")

    return news_items


def scrape_webpage(source_name: str, source_config: dict, log) -> list[dict]:
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
        log(f"Scraped {len(news_items)} items from {source_name}")
    except Exception as e:
        log(f"Error scraping {source_name}: {e}")

    return news_items


def scrape_all_news(log) -> list[dict]:
    """Scrape news from all configured sources."""
    all_news = []

    # RSS feeds
    for source_name, source_config in RSS_SOURCES.items():
        news = fetch_rss_feed(source_name, source_config, log)
        all_news.extend(news)

    # Web scraping fallback
    for source_name, source_config in SCRAPE_SOURCES.items():
        news = scrape_webpage(source_name, source_config, log)
        all_news.extend(news)

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

    return {
        "slug": date_str,
        "title": f"Energie News — {date_str}",
        "date": date_str,
        "duration": "10:00",  # Will be updated after MP3 generation
        "summary": summary,
        "transcript": "",  # Will be generated by MiniMax API
        "audioFile": f"{date_str}.mp3",
    }


def load_episodes() -> list[dict]:
    """Load existing episodes from JSON file."""
    episodes_file = REPO_PATH / "content" / "podcast" / "episodes.json"
    if not episodes_file.exists():
        return []
    with open(episodes_file, "r") as f:
        return json.load(f)


def save_cache(cache_data: dict, date_str: str) -> None:
    """Save cache file for the generate script."""
    cache_file = CACHE_DIR / f"podcast-{date_str}.json"
    with open(cache_file, "w") as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)


def load_cache(date_str: str) -> Optional[dict]:
    """Load cache file if it exists."""
    cache_file = CACHE_DIR / f"podcast-{date_str}.json"
    if not cache_file.exists():
        return None
    with open(cache_file, "r") as f:
        return json.load(f)


def save_episodes(episodes: list[dict]) -> None:
    """Save episodes to JSON file."""
    episodes_file = REPO_PATH / "content" / "podcast" / "episodes.json"
    episodes_file.parent.mkdir(parents=True, exist_ok=True)
    with open(episodes_file, "w") as f:
        json.dump(episodes, f, ensure_ascii=False, indent=2)


def send_approval_request(episode_preview: dict, news_items: list[dict], news_count: int, log) -> None:
    """Send approval request and save cache."""
    date_str = episode_preview["slug"]
    
    # Format articles for the prompt
    articles_text = "\n".join([
        f"- {item['title']} ({item.get('source', 'Unknown')}, {item.get('country', 'INT')})"
        for item in news_items[:15]
    ])
    
    # Create prompt file for OpenClaw bot
    prompt_file = CACHE_DIR / f"podcast-{date_str}-prompt.txt"
    prompt_content = f"""Schreibe einen deutschen Podcast-Text für "Energie Weekly" basierend auf diesen Nachrichten vom {date_str}:

{articles_text}

Struktur:
1. Begrüßung und Übersicht (ca. 100 Wörter)
2. Hauptthemen (3-4 Themen, je ca. 300-400 Wörter)
3. Ausblick und Verabschiedung (ca. 100 Wörter)

Gesamtlänge: ca. 1400-1600 Wörter.
Beginne mit: "Willkommen bei Energie Weekly..."
"""
    with open(prompt_file, "w") as f:
        f.write(prompt_content)
    
    # Build preview text
    preview_text = f"""
🎙️ *Neue Podcast-Episode zur Genehmigung*

📅 *Datum:* {episode_preview['date']}
📰 *Nachrichten:* {news_count} Artikel gesammelt
⏱️ *Dauer:* ~10 Minuten

*Zusammenfassung:*
{episode_preview['summary'][:200]}...

---

Zum Genehmigen und Generieren:
`/generate-podcast {date_str}`

Zum Ablehnen:
`/reject-podcast {date_str}`
"""

    # Save cache with pending status
    cache_data = {
        "status": "pending",
        "episode": episode_preview,
        "news_items": news_items,
        "created_at": datetime.now().isoformat(),
        "approved_at": None,
        "completed_at": None,
        "error": None,
    }
    save_cache(cache_data, date_str)

    log(f"Approval request saved for {date_str}")
    log(f"Prompt file saved: {prompt_file}")
    print(preview_text)
    print(f"\nWaiting for user approval...")


def main():
    parser = argparse.ArgumentParser(description="Prepare energy news podcast episode")
    parser.add_argument("--dry-run", action="store_true", help="Run without sending approval request")
    args = parser.parse_args()

    setup_dirs()

    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")

    log = get_logger(date_str)
    log(f"=== Podcast Preparation Script ===")
    log(f"Date: {date_str}")
    log(f"Dry run: {args.dry_run}")

    # Check if episode already exists
    episodes = load_episodes()
    if any(ep["slug"] == date_str for ep in episodes):
        log(f"Episode for {date_str} already exists!")
        sys.exit(0)

    # Check if cache already exists
    existing_cache = load_cache(date_str)
    if existing_cache and existing_cache.get("status") in ["pending", "approved", "completed"]:
        log(f"Cache for {date_str} already exists with status: {existing_cache.get('status')}")
        sys.exit(0)

    # Scrape news
    log("Scraping news from all sources...")
    news_items = scrape_all_news(log)
    log(f"Total unique news items: {len(news_items)}")

    if len(news_items) < 3:
        log(f"Error: Only {len(news_items)} articles found (minimum 3 required)")
        sys.exit(1)

    # Generate episode preview
    episode_preview = generate_episode_metadata(news_items, date_str)
    log(f"Episode preview generated: {episode_preview['title']}")

    if args.dry_run:
        log("[Dry run - no approval request sent]")
        sys.exit(0)

    # Send approval request
    send_approval_request(episode_preview, news_items, len(news_items), log)
    log("Approval request sent. Waiting for user response.")


if __name__ == "__main__":
    main()
