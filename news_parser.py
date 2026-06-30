import re
import html
import feedparser
import requests
import urllib3
from datetime import datetime
import time
from config import RSS_FEEDS, MAX_ARTICLES_PER_FEED

# Disable insecure request warning from urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def clean_html(text):
    """Strips HTML tags and unescapes HTML entities."""
    if not text:
        return ""
    # Strip HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities (e.g., &quot; to ")
    clean = html.unescape(clean)
    # Normalize whitespaces
    clean = " ".join(clean.split())
    return clean

def parse_published_time(entry):
    """Tries to extract and format the published time from feed entry."""
    for attr in ('published_parsed', 'updated_parsed'):
        struct_time = getattr(entry, attr, None)
        if struct_time:
            try:
                dt = datetime.fromtimestamp(time.mktime(struct_time))
                return dt.strftime("%b %d, %H:%M")
            except Exception:
                pass
    return "Recent"

def get_news_for_category(category):
    """Fetches and parses articles for a specific category."""
    feeds = RSS_FEEDS.get(category.lower())
    if not feeds:
        return []
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    articles = []
    for source_name, url in feeds:
        try:
            # Use requests with verify=False to prevent SSL errors in limited/corporate environments
            response = requests.get(url, headers=headers, timeout=15, verify=False)
            parsed = feedparser.parse(response.content)
            
            # Take up to MAX_ARTICLES_PER_FEED entries
            entries = parsed.entries[:MAX_ARTICLES_PER_FEED]
            for entry in entries:
                title = clean_html(getattr(entry, 'title', 'No Title'))
                link = getattr(entry, 'link', '')
                summary = clean_html(getattr(entry, 'summary', ''))
                
                # Truncate summary if too long
                if len(summary) > 160:
                    summary = summary[:157].strip() + "..."
                
                pub_time = parse_published_time(entry)
                
                articles.append({
                    "source": source_name,
                    "title": title,
                    "link": link,
                    "summary": summary,
                    "pub_time": pub_time
                })
        except Exception as e:
            print(f"Error parsing feed {source_name} ({url}): {e}")
            
    return articles

def format_news_html(category_display_name, articles):
    """Formats list of articles into a single HTML message for Telegram."""
    if not articles:
        return f"⚠️ <b>Could not retrieve news for {category_display_name} at this moment.</b>"
    
    header = f"📰 <b>TOP NEWS: {category_display_name.upper()}</b>\n"
    header += f"<i>Last updated: {datetime.now().strftime('%b %d, %H:%M:%S')}</i>\n\n"
    
    body = ""
    for idx, article in enumerate(articles, 1):
        escaped_title = html.escape(article['title'])
        escaped_source = html.escape(article['source'])
        escaped_time = html.escape(article['pub_time'])
        escaped_summary = html.escape(article['summary'])
        link = article['link']
        
        # Link the title using Telegram's HTML anchor syntax
        body += f"{idx}. <b><a href=\"{link}\">{escaped_title}</a></b> ({escaped_source})\n"
        if escaped_summary:
            body += f"<i>{escaped_time}</i> — {escaped_summary}\n\n"
        else:
            body += f"<i>{escaped_time}</i>\n\n"
            
    return header + body
