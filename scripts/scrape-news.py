#!/usr/bin/env python3
"""
Scrape news for Energie Weekly podcast.
Only scrapes RSS sources and saves to cache.
No audio or API calls.
"""

import feedparser
import json
from datetime import date

TODAY = date.today().isoformat()
CACHE_DIR = None  # Set after REPO_PATH is determined

def get_cache_dir():
    global CACHE_DIR
    if CACHE_DIR is None:
        from pathlib import Path
        REPO_PATH = Path(__file__).parent.parent
        CACHE_DIR = REPO_PATH / 'scripts' / 'cache'
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR

def scrape_news():
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
            print(f"  {source_name}: {count} articles")
        except Exception as e:
            print(f"  {source_name}: ERROR — {e}")

    # Deduplicate by title similarity
    seen = []
    unique = []
    for a in articles:
        if not any(a['title'][:40] in s for s in seen):
            seen.append(a['title'][:40])
            unique.append(a)

    return unique[:25]

def main():
    today = date.today().isoformat()
    cache_dir = get_cache_dir()

    print(f"=== Scraping news for {today} ===")

    articles = scrape_news()
    print(f"\nTotal unique articles: {len(articles)}")

    if len(articles) < 3:
        print("ERROR: Fewer than 3 articles found")
        return 1

    # Save to cache
    cache_file = cache_dir / f'podcast-{today}-news.json'
    with open(cache_file, 'w') as f:
        json.dump({
            "date": today,
            "articles": articles,
            "count": len(articles)
        }, f, ensure_ascii=False, indent=2)

    print(f"Saved to {cache_file}")
    return 0

if __name__ == "__main__":
    exit(main())
