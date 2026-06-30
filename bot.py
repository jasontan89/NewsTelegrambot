import logging
import ssl

# Monkey-patch ssl.create_default_context to return an unverified context globally.
# This fixes SSL certificate errors for httpx (used by python-telegram-bot) in local/corporate environments.
orig_create_default_context = ssl.create_default_context
def unverified_create_default_context(*args, **kwargs):
    context = orig_create_default_context(*args, **kwargs)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context
ssl.create_default_context = unverified_create_default_context
ssl._create_default_https_context = ssl._create_unverified_context

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from telegram.constants import ParseMode

from config import TELEGRAM_BOT_TOKEN
from news_parser import get_news_for_category, format_news_html

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", 
    level=logging.INFO
)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a greeting message when the command /start is issued."""
    user = update.effective_user
    welcome_message = (
        f"Hi {user.first_name if user else 'there'}! 👋\n\n"
        f"I am a news bot that brings you the latest stories from top sources.\n"
        f"Use the `/news` command to view available news categories and fetch updates!"
    )
    await update.message.reply_text(welcome_message)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a help message when the command /help is issued."""
    help_message = (
        "Here are the commands you can use:\n"
        "• /start - Start the bot and get a greeting\n"
        "• /help - Display this help message\n"
        "• /news - Show news categories and get the top 10 articles on-demand"
    )
    await update.message.reply_text(help_message)

def get_category_keyboard():
    """Generates the inline keyboard for news categories."""
    keyboard = [
        [
            InlineKeyboardButton("🌍 World News", callback_data="category_world"),
            InlineKeyboardButton("💻 Tech News", callback_data="category_tech"),
        ],
        [
            InlineKeyboardButton("💼 Business News", callback_data="category_business"),
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

async def news_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send an inline keyboard to choose news categories."""
    reply_markup = get_category_keyboard()
    await update.message.reply_text("Please choose a category below:", reply_markup=reply_markup)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inline keyboard button presses."""
    query = update.callback_query
    await query.answer()  # Acknowledge button press immediately
    
    data = query.data
    if not data.startswith("category_"):
        return
        
    category = data.replace("category_", "")
    category_display = {
        "world": "World News",
        "tech": "Tech News",
        "business": "Business News"
    }.get(category, category.capitalize())
    
    # Notify user that we are fetching news
    await query.edit_message_text(text=f"🔄 Fetching the latest {category_display}...")
    
    # Retrieve and format news
    try:
        articles = get_news_for_category(category)
        formatted_message = format_news_html(category_display, articles)
        reply_markup = get_category_keyboard()
        
        # Edit the message with the top news articles
        await query.edit_message_text(
            text=formatted_message,
            parse_mode=ParseMode.HTML,
            reply_markup=reply_markup,
            disable_web_page_preview=True  # Keeps chat tidy
        )
    except Exception as e:
        logger.error(f"Error handling news button category={category}: {e}", exc_info=True)
        reply_markup = get_category_keyboard()
        await query.edit_message_text(
            text=f"❌ Error fetching {category_display}. Please try again later.",
            reply_markup=reply_markup
        )

def main() -> None:
    """Start the bot."""
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_telegram_bot_token_here":
        logger.critical("TELEGRAM_BOT_TOKEN is not set correctly in your environment (.env file).")
        print("\n[CRITICAL ERROR] TELEGRAM_BOT_TOKEN not found or has placeholder value.")
        print("Please configure your .env file with a valid Telegram Bot token before running.\n")
        return
        
    # Build the application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Register command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("news", news_command))
    
    # Register callback query handlers (buttons)
    application.add_handler(CallbackQueryHandler(button_handler))
    
    # Run the bot
    print("Bot is starting up... Press Ctrl+C to stop.")
    application.run_polling()

if __name__ == "__main__":
    main()
