# Project Brief: Habit Stack Visualizer (Telegram Mini App)

## 1. Executive Summary
A high-precision habit tracking application built as a Telegram Mini App. Unlike traditional trackers that focus on isolated habits, this tool emphasizes "habit stacking"—grouping rituals (fitness, nutrition, supplements, sleep) into cohesive blocks. It provides advanced "Quantified Self" analytics, including correlations and cohesion scores, to help users understand how their habits interact.

## 2. Product Vision
- **Core Value Prop**: Move from "Did I do X?" to "How does X affect Y?"
- **Target Audience**: Data-driven individuals, performance optimizers, and the quantified-self community.
- **Design Philosophy**: "Quantified Precision"—calm, data-forward, and professional. Avoids gamification in favor of high-fidelity data visualization.

## 3. Platform & Technical Constraints
- **Host**: Telegram Mini App (TMA).
- **Environment**: Mobile WebView (approx. 390x844px).
- **UX Constraints**: 
    - No browser chrome (handled by Telegram header).
    - Reserved bottom space (56px) for Telegram's native `MainButton`.
    - One-handed operation: minimum 44px touch targets.
- **Backend Stack**: Supabase (Postgres + RLS + Edge Functions).
- **Auth**: Telegram `initData` validation with custom JWT minting.

## 4. Visual Identity
- **Design System**: *Quantified Precision*
- **Theme**: Dark-mode primary (Near-black `#10131b`), single confident accent (`#007aff`).
- **Typography**: Geist (Geometric Sans-Serif). Numbers are treated as "hero" elements.
- **Feedback**: Haptic feedback on logging actions via Telegram SDK.

## 5. Screen Map & Features
1. **Today Dashboard**: 
    - Central progress ring (% of stack completion).
    - Stack cards with inline logging (check-offs, quantity steppers).
    - Live countdown for time-window habits (e.g., fasting).
2. **Logging Detail**:
    - Per-habit input controls for numeric, boolean, and time-range data.
    - Optional reflection/notes field.
3. **Calendar Heatmap**:
    - GitHub-style contribution grid for long-term consistency.
    - Streak counters (Current vs. Longest).
4. **Correlation View**:
    - Dual-axis chart comparing two variables (e.g., Sleep vs. Run Pace).
    - Variable selector for exploratory analysis.
5. **Insights & Cohesion**:
    - Radial "Cohesion Gauge" measuring stack integrity.
    - Rule-based pattern detection (e.g., "Compliance drops on weekends").
6. **Settings & Reminders**:
    - Habit categorization (Fitness, Nutrition, Recovery).
    - Global and per-habit reminder scheduling.

## 6. Technical Spec (Key RPCs)
- `weekly_completion_rate`: Aggregates logs into percentage-based weekly views.
- `stack_cohesion_score`: Calculates the frequency of full-stack completion.
- `auth_telegram`: Validates HMAC signatures from Telegram and issues app sessions.

## 7. Success Metrics
- **Stack Cohesion**: Increase in the % of days users complete entire stacks rather than partials.
- **Logging Velocity**: Average time to complete a daily log (Target: < 30 seconds).
- **Retention**: Correlation between dashboard engagement and habit consistency.
