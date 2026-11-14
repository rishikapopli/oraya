# ORAYA — Master Design System

> Source of truth for all ORAYA UI. Page files under `pages/` override this file.
> Direction: the ORAYA product mockup (warm cream, coral, sage, chunky rounded display type).
> The skill-generated Claymorphism category informed style/shape; **the mockup governs color and type**.

## 1. Style

- **Pattern:** Feature-Rich Showcase (landing) + Funnel 3-Step (onboarding) + workspace layout (app).
- **Style family:** Claymorphism-lite — soft, rounded, tactile, but restrained and "premium education SaaS", not toy-like.
- **Mood:** friendly, calm, confident, playful-adjacent. Never childish, never generic-AI-gradient.
- **Mode:** Light only (dark mode intentionally unsupported — anti-pattern for this product).

## 2. Color tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#F7F4EF` | Page background (warm cream) |
| `--bg-sunken` | `#F1EDE6` | Section bands, input fills |
| `--surface` | `#FFFFFF` | Cards, panels, sheets |
| `--surface-2` | `#FBFAF7` | Nested cards, hover fills |
| `--text` | `#1B1B1A` | Primary text (near-black) |
| `--text-muted` | `#6E6A63` | Secondary text (must stay ≥4.5:1 on `--bg`) |
| `--border` | `#E4DFD6` | Default 1px borders / dividers |
| `--border-strong` | `#CFC8BC` | Input borders, hover borders |
| `--primary` | `#E8705B` | Primary CTA (coral) |
| `--primary-hover` | `#D95F4A` | CTA hover / active |
| `--primary-soft` | `#FBEAE5` | Tinted backgrounds, focus rings on coral |
| `--sage` | `#A9C4A1` | Selected chip / positive-neutral state |
| `--sage-soft` | `#E8F0E5` | Selected surfaces, mastery bars |
| `--sage-ink` | `#2F4A2B` | Text on sage-soft (contrast ≥4.5:1) |
| `--info` | `#4C5BD4` | Links, focus ring, active nav underline |
| `--danger` | `#D64545` | Errors, destructive |
| `--warning` | `#B7791F` | Warnings (text-safe amber) |
| `--success` | `#3F8A52` | Success states |

**Rules:** one coral CTA per view region; sage = selection/mastery only; `--info` blue is for links/focus, never a CTA. No gradients on surfaces; at most a single subtle coral→transparent wash behind hero illustration.

## 3. Typography

- **Display:** `Baloo 2` 700/800 — hero H1, page titles, big numbers. Rounded, chunky (matches mockup).
- **UI/Body:** `DM Sans` 400/500/700 — everything else.
- Scale: Hero 56/60 (mobile 36/40) · H1 40/44 · H2 28/34 · H3 20/26 · Body 16/24 · Small 14/20 · Caption 12/16 uppercase +0.08em tracking for "STEP 1 OF 3" labels.
- Sentence case everywhere except step/eyebrow captions (uppercase).
- Max measure for prose: 68ch.

```css
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap');
```

## 4. Shape, spacing, elevation

- Radius: chip/pill `999px` · button `14px` · card `20px` · input `14px` · modal `24px`.
- Spacing scale (4/8 rhythm): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Card border: `1px solid var(--border)`; shadow: `0 1px 2px rgba(27,27,26,.04), 0 8px 24px rgba(27,27,26,.05)`.
- Hover elevation: translateY(-2px) + shadow grow, 180ms ease-out. Press: scale(.98), 120ms.

## 5. Components

- **Button primary:** coral bg, white text, 14px radius, h48 (md) / h44, hover `--primary-hover`.
- **Button secondary:** transparent, 1px `--border-strong`, ink text.
- **Text link (mockup style):** ink text with 2px `--info` underline offset 4px; hover shifts underline to coral.
- **Chip:** pill, white bg, 1px `--border`; selected = sage bg + sage-ink text, no border.
- **Input/select:** h48, white bg, 1px `--border-strong`, 14px radius; focus ring `0 0 0 3px var(--primary-soft), border --primary`.
- **Card:** as above; no nested-card stacking beyond depth 2.
- **Badge:** pill, 12px/700, soft tint bg + matching ink.
- **Progress dots (onboarding):** 14px dots, active = coral fill, done = coral ring, todo = `--border-strong`.

## 6. Iconography

- **Lucide React** only (web app). 18/20/24px sizes as tokens (icon-sm/md/lg).
- Stroke 1.75–2, `currentColor`. Decorative icons beside text get `aria-hidden="true"`; icon-only buttons get `aria-label`.
- No emoji as icons, ever.

## 7. Motion

- Durations: 120ms (press) · 180ms (hover/state) · 240ms (panel) · 400ms (page/entrance).
- Easing: `cubic-bezier(.2,.8,.3,1)` standard; stagger 60ms for lists ≤8 items.
- Respect `prefers-reduced-motion: reduce` — disable transforms/entrance, keep opacity/color.

## 8. Accessibility

- Body text ≥4.5:1; focus-visible ring = 2px `--info` outline + 2px offset (never remove).
- Touch targets ≥44px; form errors inline below field (`aria-describedby` + `role="alert"`), error summary on failed submit with focus moved to it.
- Color never the sole indicator (selected chips also change border/weight; mastery shows % text).

## 9. Anti-patterns (never)

- Dark mode / navy-violet "AI SaaS" gradient look · emoji icons · glassmorphism stacks ·
- more than one coral CTA per region · Comic Neue or childish type · fake analytics ·
- dead buttons · low-contrast gray text · layout-shifting press states.
