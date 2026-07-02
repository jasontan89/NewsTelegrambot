---
name: telegram-supabase-bot
description: >
  Build and deploy a Telegram bot to Supabase Edge Functions for free, 24/7 hosting.
  Covers creating the TypeScript/Deno bot code using grammY, handling commands,
  inline keyboards, callback queries, and all known gotchas discovered during
  real deployment (import errors, JWT auth, webhook adapter issues).
  Trigger this skill when the user wants to create, update, or deploy a Telegram bot
  using Supabase Edge Functions.
---

# Telegram Bot on Supabase Edge Functions

## Overview

Supabase Edge Functions are serverless Deno functions that run only when a request arrives — perfect for a Telegram bot using **webhooks** (Telegram calls your function URL each time a user sends a message). This approach is **completely free** within Supabase's free tier, and the bot never "sleeps".

**Key technology:** [grammY](https://grammy.dev/) — the Telegram bot framework for Deno/TypeScript.

---

## Project Structure

```
your-project/
├── supabase/
│   └── functions/
│       └── <bot-name>/         ← Edge Function folder named after the bot (e.g. doac-bot)
│           └── index.ts        ← All bot logic goes here
├── .env                        ← Local secrets (never commit)
├── .gitignore                  ← Must exclude .env
└── DEPLOYMENT.md               ← Deployment reference
```

---

## Critical Rules (Lessons Learned)

> [!CAUTION]
> These are real bugs encountered and fixed. Follow them exactly.

### 1. Import grammY using the `npm:` specifier ONLY
```typescript
// ✅ CORRECT — use npm: specifier
import { Bot, webhookCallback, InlineKeyboard } from "npm:grammy@^1";

// ❌ WRONG — deno.land/x grammy imports cdn.skypack.dev which Supabase blocks
import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.20.3/mod.ts";
```
**Why:** Supabase's bundler blocks imports from `cdn.skypack.dev`. Older grammY versions from `deno.land/x` pull in skypack as a transitive dependency, causing a `Requires import access to "cdn.skypack.dev:443"` error.

### 2. Use `"std/http"` adapter, NOT `"deno-deploy"`
```typescript
// ✅ CORRECT
const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  try {
    return await handleUpdate(req);
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});

// ❌ WRONG — "deno-deploy" calls Deno.serve() internally
// Wrapping it in another Deno.serve causes: "TypeError: server is not a function"
const handleUpdate = webhookCallback(bot, "deno-deploy");
Deno.serve(async (req) => { return await handleUpdate(req); });
```

### 3. Disable JWT Verification
Supabase Edge Functions require a JWT auth header by default. Telegram does NOT send one — so every message gets a `401 Unauthorized` response.

**Fix:** When deploying the Edge Function via the Supabase MCP tool `deploy_edge_function`, ALWAYS set the `verify_jwt` argument to `false`.

### 4. Use Polling for local Python bots, Webhooks for Supabase
- **Python + local machine:** `application.run_polling()` works fine
- **Supabase Edge Function:** Must use webhooks. Register the webhook once:
  ```
  https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project-ref>.supabase.co/functions/v1/<function-name>
  ```

### 5. Edge Function Naming & Overwrites
When creating a new bot from scratch, **NEVER overwrite** an existing generic `telegram-bot` Edge Function if the user already has one.
- The primary Edge Function for the bot MUST be named after the bot (e.g., `<bot-name>`).
- Any supporting functions (cron jobs, sync scripts, etc.) MUST be prefixed with the bot's name (e.g., `<bot-name>-sync-rss`).

### 6. Proactive Setup (GitHub & Webhook)
- **GitHub:** When a new Telegram bot project is created, automatically initialize a new private GitHub repository for it and commit the code.
- **Webhook:** Once the user provides the Telegram Bot API Token and the Edge function is deployed, proactively register the webhook (using HTTP request or curl) to point to the Edge Function URL. Do not wait for the user to do this manually.

### 7. Documentation
- **README:** Always create a `README.md` file in the root of the bot's repository containing an overview of the bot's features, commands, and architecture.

### 8. Manual vs Automated Deployment Disconnects
- If providing manual step-by-step instructions for the user to deploy via the Supabase Dashboard, be aware they might miss a step (e.g., creating the new function) or overwrite the wrong function. 
- If relying on other systems like `pg_cron` that expect a specific Edge Function URL, ALWAYS verify the function exists first or deploy it on their behalf using the Supabase MCP tool (`deploy_edge_function`) to guarantee it's live before configuring the cron job.

### 9. Always Commit After Deployment (Best Practice)
- **Golden Rule:** Whenever an Edge Function is deployed to Supabase (either manually or via MCP), immediately commit the latest working code to the GitHub repository. The Git repository should always act as the single source of truth for the deployed state.

---

## Complete `index.ts` Template

```typescript
import { Bot, webhookCallback, InlineKeyboard } from "npm:grammy@^1";

// Prefix your token with your bot's name (e.g., COCKTAIL_BOT_TELEGRAM_BOT_TOKEN)
const token = Deno.env.get("<BOT_NAME>_TELEGRAM_BOT_TOKEN");
if (!token) throw new Error("<BOT_NAME>_TELEGRAM_BOT_TOKEN is not set");

const bot = new Bot(token);

// ── Commands ─────────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const name = ctx.from?.first_name ?? "there";
  await ctx.reply(`Hi ${name}! 👋\n\nI'm your bot. Use /help to see commands.`);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Available commands:\n" +
    "• /start - Greet the bot\n" +
    "• /help  - Show this message"
  );
});

// ── Inline Keyboard Example ───────────────────────────────────────────────────

const myKeyboard = new InlineKeyboard()
  .text("Option A", "action_a")
  .text("Option B", "action_b");

bot.command("menu", async (ctx) => {
  await ctx.reply("Choose an option:", { reply_markup: myKeyboard });
});

bot.callbackQuery(/^action_(.+)$/, async (ctx) => {
  const action = ctx.match[1];
  await ctx.answerCallbackQuery();                   // must acknowledge immediately
  await ctx.editMessageText(`You picked: ${action}`);
});

// ── Serve ─────────────────────────────────────────────────────────────────────
// "std/http" is required when you control your own Deno.serve()
// Never use "deno-deploy" inside Deno.serve — it tries to call Deno.serve internally
const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  try {
    return await handleUpdate(req);
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
```

---

## Step-by-Step Deployment (Browser — No CLI)

### Step 1: Get a Bot Token
1. Open Telegram and message [@BotFather](https://t.me/botfather).
2. Send `/newbot`, follow the prompts, copy the **token**.

### Step 2: Create a Supabase Project
1. Sign up / log in at [supabase.com](https://supabase.com).
2. Click **New Project**, give it a name, wait for it to provision.
3. Note your **Project Reference ID** from the URL: `https://supabase.com/dashboard/project/<ref-id>`

### Step 3: Create the Edge Function
1. In your project dashboard, click **Edge Functions** (sidebar).
2. Click **Deploy a new function** → **Via Editor**.
3. Name it: `<bot-name>` (Avoid generic names like `telegram-bot` to prevent overwriting other bots in the same project).
4. Delete the default template code.
5. Paste your complete `index.ts` code (from the template above, with your bot logic).
6. Click **Deploy**.
7. **Copy the Function URL** shown — looks like:
   `https://<ref-id>.supabase.co/functions/v1/<bot-name>`

### Step 4: Add Your Bot Token as a Secret
1. In the Supabase sidebar → **Project Settings** (gear icon) → **Edge Functions**.
2. Under **Secrets**, click **Add Secret**:
   - **Name:** `<BOT_NAME>_TELEGRAM_BOT_TOKEN` (Prefix with your bot's name to help manage multiple bots)
   - **Value:** your bot token from BotFather
3. Save.

### Step 5: Disable JWT Verification ⚠️
When deploying the edge function using the `deploy_edge_function` tool, ensure that `verify_jwt` is set to `false`. If done correctly, you do not need to manually disable it in the Supabase Dashboard.

> [!IMPORTANT]
> Skipping this step causes every Telegram request to get a `401 Unauthorized` response. The bot will be deployed but will never reply.

### Step 6: Register the Webhook with Telegram
Open this URL in your browser (replace the placeholders):
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<ref-id>.supabase.co/functions/v1/<bot-name>
```
You should see:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Step 7: Test
Send `/start` to your bot in Telegram. It should respond instantly.

---

## Troubleshooting Reference

| Symptom | Cause | Fix |
|---|---|---|
| `Requires import access to "cdn.skypack.dev:443"` | Using `deno.land/x` grammy import | Change import to `npm:grammy@^1` |
| `POST \| 401` in invocations tab | JWT verification is ON | Redeploy with `verify_jwt: false` |
| `TypeError: server is not a function` | Using `"deno-deploy"` adapter inside `Deno.serve` | Change adapter to `"std/http"` |
| `POST \| 500` in invocations tab | Runtime error in bot code | Check the Logs tab in Supabase for the full error stack trace |
| Bot deployed but no response | Webhook not registered | Run the setWebhook URL in Step 6 |
| Webhook set but still no response | Old polling bot still running locally | Stop the local `bot.py` — two connections conflict |

---

## Checking Logs

1. Supabase Dashboard → **Edge Functions** → your function → **Logs** tab.
2. Each invocation shows the full request + any `console.error` output.
3. Look for the **Invocations** tab: `POST | 200` = success, `POST | 4xx/5xx` = error.

---

## Updating Your Bot

1. Go to Supabase Dashboard → **Edge Functions** → your function → **Code** tab.
2. Edit the code in the browser editor.
3. Click **Deploy updates**.
4. No need to re-register the webhook — it stays pointed at the same URL.

---

## Notes on Python vs TypeScript

Your original Python bot (`bot.py`) using `python-telegram-bot` cannot run on Supabase Edge Functions. Supabase runs **Deno** (TypeScript/JavaScript only). The TypeScript rewrite using **grammY** is functionally equivalent:

| Python (`python-telegram-bot`) | TypeScript (`grammY`) |
|---|---|
| `application.run_polling()` | `webhookCallback(bot, "std/http")` + `Deno.serve()` |
| `CommandHandler("start", fn)` | `bot.command("start", fn)` |
| `CallbackQueryHandler(fn)` | `bot.callbackQuery(pattern, fn)` |
| `InlineKeyboardMarkup / Button` | `new InlineKeyboard().text(label, data)` |
| `query.answer()` | `ctx.answerCallbackQuery()` |
| `query.edit_message_text(...)` | `ctx.editMessageText(...)` |

Keep the Python bot for local development/testing, and use the TypeScript version for Supabase hosting.
