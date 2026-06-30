# Telegram Bot Deployment Guide 🚀

To keep your news Telegram bot running 24/7 even when your laptop is turned off, you need to host it on a cloud server. Below are the three best and most common methods to do this.

---

## Method 1: PaaS (Platform-as-a-Service) — *Easiest*

Platforms like **Railway** or **Render** are the easiest way to deploy python applications. They can connect directly to your GitHub repository and redeploy automatically whenever you push code.

### Option A: Railway.app (Recommended)
1. Sign up on [Railway.app](https://railway.app/).
2. Push your project to a GitHub repository.
3. Click **New Project** -> **Deploy from GitHub repo** and select your repository.
4. Go to the service **Variables** tab and add:
   * `TELEGRAM_BOT_TOKEN`: `your_actual_bot_token_here`
5. Railway will automatically detect the [Dockerfile](file:///c:/Users/tanse/Documents/Antigravity/Dockerfile) we created and deploy the container.

### Option B: Render.com
1. Sign up on [Render.com](https://render.com/).
2. Click **New +** -> **Background Worker** (since this bot doesn't need to listen to incoming web requests).
3. Connect your GitHub repository.
4. Set the following details:
   * **Runtime**: `Docker` (Render will use our [Dockerfile](file:///c:/Users/tanse/Documents/Antigravity/Dockerfile) automatically).
5. Under **Environment Variables**, add:
   * `TELEGRAM_BOT_TOKEN`: `your_actual_bot_token_here`
6. Click **Deploy**.

---

## Method 2: Linux VPS (Virtual Private Server) — *Most Control & Cheapest*

If you want to host it on a VPS (DigitalOcean, Linode, AWS Lightsail, Hetzner, etc.), you can run it as a background service. A basic VPS costs around $4–$6/month.

Once you have your VPS running Ubuntu/Debian:

### 1. Set Up the Server
SSH into your server and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip python3-venv git -y
```

### 2. Clone and Setup Project
```bash
git clone <your-github-repo-url> /opt/news-bot
cd /opt/news-bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment variables
Create a `.env` file inside `/opt/news-bot`:
```env
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
```

### 4. Create a systemd Service (Keeps the bot running 24/7)
Create a service file so Linux automatically manages the bot (restarts on crashes or server reboots):
```bash
sudo nano /etc/systemd/system/newsbot.service
```

Paste the following configuration:
```ini
[Unit]
Description=Telegram News Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/news-bot
ExecStart=/opt/news-bot/.venv/bin/python bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`), then run:
```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Start the bot service
sudo systemctl start newsbot

# Enable it to run on boot automatically
sudo systemctl enable newsbot

# Check the status of the bot
sudo systemctl status newsbot
```

To view live bot logs:
```bash
journalctl -u newsbot.service -f
```

---

## Method 3: Deploying on a VPS using Docker — *Cleanest*

If your VPS has Docker installed, you can build and run the container using the provided [Dockerfile](file:///c:/Users/tanse/Documents/Antigravity/Dockerfile).

1. Build the image:
   ```bash
   docker build -t news-telegram-bot .
   ```
2. Run the container in the background (detached mode):
   ```bash
   docker run -d \
     --name news-bot \
     --restart always \
     -e TELEGRAM_BOT_TOKEN="your_actual_bot_token_here" \
     news-telegram-bot
   ```
3. To view logs:
   ```bash
   docker logs -f news-bot
   ```
