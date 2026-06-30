import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# RSS Feed configurations
# Each category contains a list of tuples: (source_display_name, rss_feed_url)
RSS_FEEDS = {
    "world": [
        ("BBC News World", "http://feeds.bbci.co.uk/news/world/rss.xml"),
        ("AP News", "https://news.google.com/rss/search?q=when:24h+source:Associated+Press&hl=en-US&gl=US&ceid=US:en")
    ],
    "tech": [
        ("TechCrunch", "https://techcrunch.com/feed/"),
        ("Wired", "https://www.wired.com/feed/rss")
    ],
    "business": [
        ("CNBC Business", "https://www.cnbc.com/id/10001147/device/rss/rss.html"),
        ("Reuters Business", "https://news.google.com/rss/search?q=when:24h+source:Reuters+business&hl=en-US&gl=US&ceid=US:en")
    ]
}

# Maximum number of articles to retrieve per source in a category
# To get a total of 10 articles from 2 sources, we fetch up to 5 articles per source.
MAX_ARTICLES_PER_FEED = 5
