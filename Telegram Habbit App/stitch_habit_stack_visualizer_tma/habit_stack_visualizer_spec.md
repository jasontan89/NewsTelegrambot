# Habit Stack Visualizer — Telegram Mini App + Supabase
## Detailed Technical Research & Build Spec

---

## 1. Architecture Overview

```
┌─────────────────────┐        ┌──────────────────────┐        ┌────────────────────┐
│  Telegram Client     │        │  Frontend (Mini App) │        │  Supabase           │
│  (iOS/Android/Desk)  │◄──────►│  React + Vite         │◄──────►│  Postgres + RLS      │
│  opens Web App via   │  WebApp│  Telegram SDK         │ REST/  │  Edge Functions      │
│  bot button/command   │  API   │  hosted on Vercel     │  RPC   │  Auth (custom JWT)   │
└─────────────────────┘        └──────────────────────┘        └────────────────────┘
                                          ▲
                                          │ Bot API (webhook)
                                          ▼
                                ┌──────────────────────┐
                                │  Telegram Bot         │
                                │  Node.js (grammY)      │
                                │  hosted as Supabase    │
                                │  Edge Function or       │
                                │  small serverless host  │
                                └──────────────────────┘
```

**Why this shape:**
- Telegram gives you free identity (no signup/login screens) via `initData`.
- Supabase gives you Postgres + RLS + Edge Functions + cron, so you don't need a separate backend server.
- The bot and the Mini App share the same Supabase project — the bot writes reminders/logs via chat commands, the Mini App reads/writes via the REST/RPC API, both scoped to the same `telegram_user_id`.

---

## 2. Authentication Flow (Telegram → Supabase)

This is the part every tutorial gets subtly wrong, so it's worth being precise.

**Telegram's guarantee:** when your Mini App loads, `window.Telegram.WebApp.initData` contains a signed, HMAC-SHA256 payload (`user`, `auth_date`, `hash`, etc.), signed with a secret derived from your bot token. Telegram also now supports an Ed25519 `signature` field for third-party verification without exposing the bot token, but the HMAC method remains the standard approach for your own backend.

**Recommended flow:**

1. **Frontend**: On load, call `window.Telegram.WebApp.ready()` immediately (delaying this causes "Mini App not available" errors in some clients), then grab the raw `initData` string.
2. **Frontend → Supabase Edge Function** (`POST /auth-telegram`): send the raw `initData` string, not the parsed object — parsing and re-stringifying can silently break the hash due to escaped characters (e.g. `photo_url` slashes).
3. **Edge Function**:
   - Recompute `secret_key = HMAC_SHA256(bot_token, "WebAppData")`
   - Recompute `hash = HMAC_SHA256(data_check_string, secret_key)` where `data_check_string` is all fields except `hash`, sorted alphabetically, joined with `\n`
   - Compare hashes; reject on mismatch
   - **Reject if `auth_date` is older than ~5 minutes** (replay-attack protection — this is the standard threshold used across Mini App implementations)
   - Upsert the user into a `users` table keyed by `telegram_user_id`
   - Issue a Supabase session. Since Telegram isn't a native Supabase Auth provider, the clean pattern is: mint your own signed JWT (using Supabase's JWT secret) with `sub` = a stable internal UUID mapped to the Telegram user, and return it to the client to use as the Supabase session token. Alternatively, use `signInWithIdToken`-style custom token minting via a Supabase Auth Hook if you want it to appear as a native Supabase Auth session.
4. **Frontend**: stores the returned JWT in memory (React state) — **never localStorage in the Mini App context**, and per Telegram's `CloudStorage` API you can optionally persist a short-lived refresh token there instead of relying on browser storage, which behaves inconsistently across Telegram's embedded WebView implementations.
5. Every subsequent Supabase call (`supabase.from(...)`, RPC, Edge Function) sends this JWT as the `Authorization` bearer token, and RLS policies key off `auth.uid()` / a custom claim like `telegram_user_id`.

**Security notes worth building in from day one:**
- Never trust `initDataUnsafe` (the pre-parsed client object) for anything security-relevant — always re-validate server-side.
- Enforce HTTPS (required by Telegram anyway for Mini Apps to load at all).
- Sanitize any free-text fields (habit notes) — standard XSS hygiene since this is a WebView.
- Keep `verify_jwt = true` on your Supabase Edge Functions that serve the authenticated app, and use a separate `auth: 'secret'` function (validated against a Supabase secret key, not a user JWT) for the bot's server-to-server writes (e.g. reminder delivery confirmations).

---

## 3. Database Schema (Supabase / Postgres)

```sql
-- Users (mirrors Telegram identity, decoupled from Supabase's own auth.users if you mint custom JWTs)
create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique not null,
  username text,
  first_name text,
  photo_url text,
  timezone text default 'Asia/Singapore',
  created_at timestamptz default now()
);

-- Habits
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  emoji text,
  category text check (category in ('fitness','nutrition','supplement','sleep','custom')),
  habit_type text check (habit_type in ('boolean','quantitative','time_window','multi_check')) not null,
  unit text,                          -- e.g. 'km', 'hours', 'mg'
  target_value numeric,               -- e.g. target km, target hours fasted
  schedule jsonb default '{"days":"daily"}'::jsonb,  -- daily / weekday list / N-times-per-week
  color text,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Stacks (habit groupings, e.g. "Morning Stack")
create table stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table stack_habits (
  stack_id uuid references stacks(id) on delete cascade,
  habit_id uuid references habits(id) on delete cascade,
  sort_order int default 0,
  primary key (stack_id, habit_id)
);

-- Daily logs (one row per habit per day; supports retroactive edits)
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  log_date date not null,
  completed boolean,                  -- for boolean habits
  value numeric,                      -- for quantitative habits
  start_time timestamptz,             -- for time_window habits
  end_time timestamptz,
  note text,
  logged_via text default 'app' check (logged_via in ('app','bot')),
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);

-- Reminders
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  stack_id uuid references stacks(id) on delete set null,
  habit_id uuid references habits(id) on delete set null,
  send_at time not null,              -- local time, converted using users.timezone
  days jsonb default '["mon","tue","wed","thu","fri","sat","sun"]'::jsonb,
  active boolean default true
);
```

**RLS policies (applied to every table above):**

```sql
alter table users enable row level security;
alter table habits enable row level security;
alter table stacks enable row level security;
alter table stack_habits enable row level security;
alter table habit_logs enable row level security;
alter table reminders enable row level security;

-- Pattern used throughout: match the row's user_id against a custom claim
-- embedded in the JWT you mint during the Telegram auth step (e.g. `telegram_user_id`
-- resolved to the internal `users.id` and stored as `sub` or a custom claim).

create policy "own habits only" on habits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- repeat the same using/with check pattern for stacks, stack_habits (via join),
-- habit_logs, and reminders.
```

Wrapping `auth.uid()` in `(select ...)` lets Postgres cache it as an initPlan instead of re-evaluating per row — a documented ~100x performance difference on larger tables, worth doing from the start rather than retrofitting.

Index `user_id` and `(habit_id, log_date)` — the heatmap and streak queries will hit these constantly.

---

## 4. Feature Spec (Detailed)

### 4.1 Habit & Stack Management
- CRUD for habits with type selection (boolean / quantitative / time-window / multi-check)
- Stack builder — drag-to-reorder habits into a stack (e.g. "Morning Stack": supplements checklist + fasting check-in)
- Schedule editor — daily, specific weekdays, or "X times per week" (stored as `jsonb`, evaluated client-side for "is this due today")

### 4.2 Logging UX
- **Today screen**: stack cards with inline check-off, quantity steppers, and a ring showing % of today's stack completed
- **Quick-log via bot**: `/log ran 5km` or a free-text message parsed by a lightweight intent matcher (regex + habit name fuzzy-match is enough — no need for an LLM here for v1) writes directly into `habit_logs` with `logged_via = 'bot'`
- **Retroactive edit**: tap any past date on the calendar to open that day's log sheet

### 4.3 Dashboards (the core differentiator)
| View | Data source | Chart approach |
|---|---|---|
| Streak counters | `habit_logs` rolling window query | Simple number + flame icon |
| Calendar heatmap | `habit_logs` grouped by `log_date` | Custom CSS-grid heatmap (cheaper than a charting lib for this shape) or `react-calendar-heatmap` |
| Weekly/monthly completion % | Aggregation RPC (`select date_trunc('week', log_date), count(*) ...`) | Recharts `BarChart` |
| Correlation view | Two habits joined on `log_date` | Recharts `ComposedChart` with dual Y-axes |
| Stack cohesion score | RPC: % of days where all habits in a stack were completed together | Recharts `RadialBarChart` (gauge) |
| Trend lines | Rolling average via SQL window function or client-side | Recharts `LineChart` |

**Push aggregation into Postgres RPCs** rather than pulling raw rows into the client and computing in JS — keeps the Mini App fast on mobile data and avoids shipping months of raw logs to the browser. Example:

```sql
create or replace function weekly_completion_rate(p_habit_id uuid, p_weeks int default 12)
returns table(week_start date, completion_rate numeric)
language sql stable as $$
  select date_trunc('week', log_date)::date,
         count(*) filter (where completed or value is not null)::numeric / 7
  from habit_logs
  where habit_id = p_habit_id
    and log_date >= current_date - (p_weeks * 7)
  group by 1
  order by 1;
$$;
```

### 4.4 Insights
- Weekly digest sent by the bot (via a Supabase cron-triggered Edge Function calling the Bot API) — best streak, weakest habit, one flagged correlation
- Rule-based pattern flags (no ML needed): e.g. "supplement compliance drops on days you also miss your run" — computed via a simple co-occurrence query, not inference

### 4.5 Telegram-Specific Integration
- `Telegram.WebApp.themeParams` → map directly to CSS custom properties so the app matches the user's Telegram theme (light/dark) automatically
- `Telegram.WebApp.HapticFeedback.impactOccurred('light')` on every check-off — cheap to add, makes it feel native
- `Telegram.WebApp.MainButton` for primary actions (e.g. "Save Stack") instead of a custom button, so it docks natively at the bottom
- `Telegram.WebApp.CloudStorage` for lightweight cross-device settings sync (reminder times, theme override) without building your own settings sync
- Bot commands: `/start`, `/today`, `/log`, `/streak`, `/stats`

---

## 5. Tech Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev loop, matches your FoodLens stack |
| Telegram SDK | `@telegram-apps/sdk-react` (actively maintained, has a mock mode for local dev outside Telegram) | Handles init, theming, launch params cleanly |
| Charts | Recharts | You've already got familiarity from prior projects; handles bar/line/radial well |
| Heatmap | Custom CSS grid or `react-calendar-heatmap` | Lighter than pulling in a full calendar lib |
| Backend | Supabase (Postgres + Edge Functions + Auth + Cron) | One platform for DB, RLS, serverless functions, and scheduled jobs |
| Bot runtime | grammY (Node/Deno-friendly, works well inside Supabase Edge Functions) | Modern, TypeScript-first, good webhook support |
| Hosting (frontend) | Vercel | Matches your existing FoodLens deployment pattern |

---

## 6. Build Phases

**Phase 1 — Skeleton (get something real inside Telegram fast)**
- BotFather setup, Mini App URL registration
- `initData` validation Edge Function + JWT minting
- Bare React shell rendering "Hello {first_name}" inside Telegram, themed correctly

**Phase 2 — Core logging**
- Habits + stacks CRUD
- Today screen with check-off
- `habit_logs` writes, RLS locked down

**Phase 3 — Dashboards**
- Heatmap, streaks, weekly completion chart
- Aggregation RPCs

**Phase 4 — Bot loop**
- Reminders via cron Edge Function → Bot API
- `/log`, `/today`, `/stats` commands
- Weekly digest

**Phase 5 — Correlation & polish**
- Cross-habit correlation chart
- Stack cohesion gauge
- Haptics, CloudStorage settings sync, retroactive editing polish

---

## 7. Open Design Decisions (worth deciding before Phase 2)

1. **JWT minting approach**: roll your own signed JWT in the Edge Function vs. using a Supabase Auth Hook to make Telegram sessions look like native Supabase Auth sessions. The Auth Hook route is more "correct" long-term (plays nicely with Supabase's built-in session refresh) but has a steeper setup; the hand-rolled JWT is faster to ship for a v1.
2. **Unified vs. per-type log table**: the schema above uses one `habit_logs` table with nullable columns per type (mirrors the unified-vs-per-domain question you wrestled with on the gym booking app). Given the smaller scope here, unified is the right call — four habit types don't justify four tables.
3. **Timezone handling**: reminders and "day boundaries" need a `users.timezone` field from day one — retrofitting this later is painful once logs exist.
