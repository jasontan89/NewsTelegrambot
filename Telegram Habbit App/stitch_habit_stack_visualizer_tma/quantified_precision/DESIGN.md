---
name: Quantified Precision
colors:
  surface: '#10131b'
  surface-dim: '#10131b'
  surface-bright: '#363942'
  surface-container-lowest: '#0b0e16'
  surface-container-low: '#181c23'
  surface-container: '#1c2028'
  surface-container-high: '#272a32'
  surface-container-highest: '#31353d'
  on-surface: '#e0e2ed'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#e0e2ed'
  inverse-on-surface: '#2d3039'
  outline: '#8b90a0'
  outline-variant: '#414755'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e69'
  primary-container: '#4b8eff'
  on-primary-container: '#00285c'
  inverse-primary: '#005bc1'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb595'
  on-tertiary: '#571e00'
  tertiary-container: '#ef6719'
  on-tertiary-container: '#4c1a00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#10131b'
  on-background: '#e0e2ed'
  surface-variant: '#31353d'
  fitness: '#10B981'
  nutrition: '#F59E0B'
  supplement: '#A855F7'
  sleep: '#6366F1'
  background-dark: '#0A0A0A'
  surface-dark: '#171717'
  border-dark: '#262626'
typography:
  stat-hero:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.05em
  stat-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-margin: 1.25rem
  stack-gap: 1.5rem
  element-gap: 0.75rem
  touch-target-min: 44px
  telegram-bottom-safe: 56px
---

## Brand & Style

The design system is rooted in the **Quantified Self** movement, prioritizing data transparency, objective tracking, and analytical clarity over gamified rewards. The brand personality is professional, scientific, and calm—acting as a high-performance instrument for personal optimization.

The design style is **Modern Minimalist with a focus on Information Density**. It utilizes heavy whitespace to provide mental breathing room around complex data visualizations. The aesthetic avoids "cutesy" elements, instead using precise geometry and tonal layering to convey a sense of rigorous self-command.

**Key Principles:**
- **Analytical Calm:** Neutral backgrounds paired with intentional, data-driven accents.
- **Utility First:** High-density data is presented through elegant, legible charts rather than decorative illustrations.
- **Instrumental Feel:** UI elements should feel like components of a precision tool, responding with haptic feedback and crisp transitions.

## Colors

The system uses a **Dark Mode** default to align with the professional, technical aesthetic of data dashboards. The primary color is a confident **Electric Blue** used strictly for progress indicators and primary interactions.

**Functional Palette:**
- **Primary:** Electric Blue (#007AFF) — Reserved for active states, primary progress rings, and focal interaction points.
- **Category Accents:** Used for "soft dots," tags, and specific habit-type visualizations. 
  - **Fitness:** Emerald
  - **Nutrition:** Amber
  - **Supplement:** Amethyst
  - **Sleep:** Indigo
- **Neutrals:** A high-contrast range from a near-black background (#0A0A0A) to clean white text. Surface layers use subtle grays to create depth without relying on heavy borders.

In Light Mode (for OS-level overrides), the background shifts to pure white with light gray (#F4F4F5) surfaces and borders.

## Typography

The typography system pairs **Geist** for headlines and data-heavy numbers with **Inter** for functional body text. 

**Data Presentation:**
- **Hero Stats:** Streaks and primary metrics use `stat-hero` for immediate impact. 
- **Hierarchy:** Geist’s geometric precision is used for labels and headers to maintain the "technical" feel. Inter is used for notes and descriptions to ensure maximum legibility at smaller sizes.
- **Numbers:** All numerical data should utilize tabular figures (monospace-like spacing) where possible to ensure alignment in lists and charts.

## Layout & Spacing

Designed specifically for the **390x844px mobile portrait** environment. The layout follows a **Fixed Grid** model with a focus on vertical stackability.

**Spacing Strategy:**
- **Generous Gaps:** Despite high data density, cards are separated by `stack-gap` (24px) to prevent visual clutter and reduce cognitive load.
- **Telegram Constraints:** The bottom 56px is strictly reserved as a "No-UI Zone" to accommodate the Telegram `MainButton`.
- **Touch Areas:** All interactive elements (toggles, steppers, habit checks) maintain a minimum hit area of 44px.
- **Data Grids:** Heatmaps and charts should bleed to the edge of their parent containers but maintain internal padding consistent with `element-gap`.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** rather than traditional shadows. This maintains a flat, modern aesthetic suitable for mobile web views.

- **Level 0 (Background):** Near-black (#0A0A0A).
- **Level 1 (Cards/Containers):** Deep charcoal surface (#171717) with a subtle 1px border (#262626).
- **Level 2 (Modals/Overlays):** Slightly lighter gray (#262626) with a very soft, diffused ambient shadow (10% opacity black) to provide separation during retroactive editing.
- **Glassmorphism:** Use a light backdrop blur (8px) on navigation headers and floating action elements to maintain context of the scrollable content behind them.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional, architectural feel that is more sophisticated than hyper-rounded "bubbly" designs.

- **Primary Components:** Cards, input fields, and status tags use a 4px corner radius.
- **Charts:** Bar charts and heatmaps should use sharp corners or very minimal (2px) rounding to maintain the "data-forward" precision.
- **Exceptions:** Progress rings and category "dots" are fully circular.

## Components

**Habit Cards (Stacks):**
Cards should feature a high-contrast label, a category-colored dot indicator, and a right-aligned interaction area (stepper or toggle). The background should be Level 1 Tonal Layer.

**Data Visualizations:**
- **Heatmaps:** A 7-column CSS grid (Mon-Sun). Completed days use the Category Accent color at 100% opacity; partial completion uses 40-60% opacity.
- **Radial Gauges:** Use for "Stack Cohesion" scores. The track should be the surface color (#171717) with a Primary Electric Blue stroke.
- **Dual-Axis Charts:** Use thin (1px) lines and small 4px data points. Grid lines should be faint (#262626).

**Input Fields:**
Minimalist design. No labels—only placeholders within a subtle Level 2 surface. Focus state is indicated by a Primary Electric Blue 1px border.

**Checkboxes & Steppers:**
- **Checkboxes:** When checked, the entire background of the habit card can subtly tint with the category color at 10% opacity. 
- **Steppers:** Large '-' and '+' buttons (44px) flanking a monospaced numerical value.

**Feedback:**
Trigger `HapticFeedback.impactOccurred('light')` via the Telegram SDK for every successful log or habit check-off.