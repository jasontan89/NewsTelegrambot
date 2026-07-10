# Deploying Habit Stack to Supabase Cloud

This guide walks you through deploying your local database migrations, Deno Edge Functions, Telegram Bot webhook, and scheduled reminders cron to the Supabase Cloud.

---

## 1. Connect to Supabase Cloud
If you haven't already, sign up at [supabase.com](https://supabase.com) and create a new project. 

Once your project is created:
1. Copy your **Project Reference ID** from your project URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`.
2. Login to the Supabase CLI in your terminal:
   ```bash
   npx supabase login
   ```
3. Link your local project to your cloud project:
   ```bash
   npx supabase link --project-ref <PROJECT_REF>
   ```

---

## 2. Deploy Database Schema & Migrations
Deploy your database tables, indexes, and RLS policies from your local migrations:
```bash
npx supabase db push
```

---

## 3. Configure Production Secrets
Set the required environment variables in your Supabase cloud project:

1. **Telegram Bot Token**:
   Get your bot token from `@BotFather` and register it inside Supabase:
   ```bash
   npx supabase secrets set HABIT_STACK_TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
   ```
2. **Supabase URL & Service Role Key**:
   These are automatically injected by the Supabase Cloud runtime into your Edge Functions under Deno's environment, so you do not need to configure them manually!

---

## 4. Deploy Deno Edge Functions
Deploy all three edge functions to the cloud:
```bash
npx supabase functions deploy auth-telegram --no-verify-jwt
npx supabase functions deploy habit-stack-bot --no-verify-jwt
npx supabase functions deploy cron-reminders --no-verify-jwt
```
> **Note**: `--no-verify-jwt` is required so that Telegram's servers can deliver webhook updates without being blocked by authorization checks.

---

## 5. Register Webhook with Telegram
You must tell Telegram where to send messages received by your bot. Send a POST or GET request to the Telegram Bot API `setWebhook` endpoint:

Replace `<your-telegram-bot-token>` with your token and `<PROJECT_REF>` with your Supabase Project ID:
```
https://api.telegram.org/bot<your-telegram-bot-token>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/habit-stack-bot
```
**Verification**: Open that URL in your browser. You should receive a JSON response showing:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

---

## 6. Schedule Reminder Cron in Postgres
To run the reminder scans and send messages automatically in the cloud, schedule a `pg_cron` worker:

1. Go to your **Supabase Project Dashboard**.
2. Navigate to the **SQL Editor** in the left sidebar.
3. Enable `pg_cron` and schedule the function to fetch every minute (replace `<PROJECT_REF>` with your Supabase Project ID):
   ```sql
   -- Enable cron extension if not active
   create extension if not exists pg_cron;

   -- Schedule reminders scan every minute
   select cron.schedule(
     'deliver-reminders',
     '* * * * *',
     $$ select net.http_post(
          url:='https://<PROJECT_REF>.supabase.co/functions/v1/cron-reminders',
          headers:=jsonb_build_object('Content-Type', 'application/json')
        );
     $$
   );
   ```

---

## 7. Deploy Frontend Web App
To run your Telegram Mini App:
1. Build your Vite frontend package:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the generated `frontend/dist/` directory to Vercel, Netlify, or Github Pages.
3. Configure the cloud environment variables for the frontend:
   * `VITE_SUPABASE_URL`: Your cloud Supabase URL.
   * `VITE_SUPABASE_ANON_KEY`: Your cloud Supabase Anonymous Key.
4. Set the **Web App URL** inside Telegram using `@BotFather` (`/newapp` or `/editapp`) pointing to your deployed site.
