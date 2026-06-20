# Fadfada (فضفضة) — Design System Specification

This document is a complete, implementation-ready spec. Every value here is taken directly from the working codebase. Copy these tokens and component specs exactly — no interpretation needed.

---

## 1. Design Philosophy (read this first)

Fadfada is **not** a chat-bubble app with a settings menu for "modes." The core idea:

> **The screen performs understanding before the reply text appears.** When the user's words imply a story, poem, prayer, or task — the background gradient, particle physics, orb shape, font, and text-reveal speed all shift *immediately*, before Gemini's reply streams in. The transformation itself is the proof the system understood the moment.

There are two layered systems:
- **Modes** (`lib/modes.ts`) — the *functional* classification of what the user needs (listen, support, joy, organize, expert, coach, research). Used for picking the system prompt.
- **Worlds** (`lib/worlds.ts`) — the *sensory* environment the screen becomes (calm, story, poetry, faith, learning, build, celebration, grief). Used for picking colors, particles, orb shape, font, type speed.

A mode has a *default* world, but the user can override it any time via **World Shift** — re-narrating the same already-given message into a different world without retyping anything.

---

## 2. Color Tokens

```css
--ink: #0E0D10;        /* app background, near-black */
--bone: #F7F3EC;       /* primary text, warm off-white */
--gold: #C9A86A;       /* accent, CTAs, build/learning world */
--dusk: #8B7BB8;       /* calm/support world */
--terracotta: #D4724A; /* story/celebration world */
--sage: #5C7C6B;       /* learning/build world */
--line: rgba(247,243,236,0.12); /* hairline borders on dark bg */
```

Tailwind config (`tailwind.config.ts`):
```js
colors: {
  ink: "#0E0D10",
  bone: "#F7F3EC",
  gold: "#C9A86A",
  dusk: "#8B7BB8",
  terracotta: "#D4724A",
  sage: "#5C7C6B",
  line: "rgba(247,243,236,0.12)",
}
```

**Rule:** Never use pure black or pure white. Never use bright saturated purple/blue gradients (generic-AI-chatbot look). Everything sits on `#0E0D10` with low-alpha bone text (`text-bone/75`, `/80`, `/90`, `/95` depending on hierarchy).

---

## 3. Typography

| Token | Font | Used for |
|---|---|---|
| `--font-naskh` (`font-arserif`) | Noto Naskh Arabic | Arabic display/literary moments (faith world) |
| `--font-cormorant` (`font-enserif`) | Cormorant Garamond | English display, story/poetry worlds, italic logo wordmark |
| `--font-plex-arabic` (`font-arsans`) | IBM Plex Sans Arabic | Default Arabic body text |
| `--font-inter` (`font-ensans`) | Inter | Default English body text |
| `--font-plex-mono` (`font-mono`) | IBM Plex Mono | Metadata, badges, timestamps, build-world replies, buttons |

Google Fonts import (use exactly this, single request):
```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@400;500&family=Noto+Naskh+Arabic:wght@400;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500&display=swap');
```

**Rule:** Body text is always `dir="auto"` so Arabic and English both render with correct direction per-message. Page root is `lang="ar" dir="rtl"`. Line height for conversation text: `1.9` (generous, intimate, not cramped like a chat app).

---

## 4. Layout — Not Chat Bubbles

There are no message bubbles, no avatar circles per message, no left/right alignment split by sender. Every message is right-aligned text (RTL-first), differentiated only by opacity:
- User messages: `text-bone/95` (brighter) + a small `28px` gold underline (`bg-gold/40`, `1px` tall) below, right-aligned, as the only "sent" marker.
- Companion replies: `text-bone/75–80` (softer), no marker, often typewriter-revealed.

Page structure, top to bottom:
1. Top bar: italic English wordmark "Fadfada" (left, muted) + Arabic logotype "فضفضة" (right, full opacity) — `font-enserif italic` and `font-arserif` respectively.
2. **Presence Orb** — centered, ambient, animated.
3. **Mode/World badge** — small pill below the orb.
4. **World Shift row** — small pill buttons: حكاية / شعر / إيمان / بناء / هادئ.
5. Scrollable conversation column, `max-width: 42rem (672px)`, centered.
6. Bottom input bar — borderless textarea + small mono "ابعت" (send) text-button, no icon-button, no rounded chat-input pill.

---

## 5. The Presence Orb (signature element)

A ~70-80px circular zone containing:
- A blurred glow disc behind it (`blur: 18-24px`, `opacity: 0.4-0.45`, colored per world).
- A foreground SVG shape, **breathing** via CSS animation (`scale(1) → scale(1.06)`, `opacity 0.85 → 1`, `4s ease-in-out infinite`; speeds up to `1.5-1.6s` while the AI is "thinking").

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.06); opacity: 1; }
}
.animate-breathe { animation: breathe 4s ease-in-out infinite; }
```

**The orb's shape itself changes per world** — this is not just a color swap. Exact SVG recipes (viewBox `0 0 100 100`):

| World | Shape concept | SVG approach |
|---|---|---|
| calm | `sphere` | Simple radial-gradient filled circle, or `<circle cx=50 cy=50 r=28>` |
| story | `flame` | Teardrop path: `M50 15 C 35 35, 25 45, 25 62 C 25 80, 38 90, 50 90 C 62 90, 75 80, 75 62 C 75 45, 65 35, 50 15 Z`, filled with radial gradient (opaque center → transparent edge) |
| poetry | `bloom` | 6 ellipses (`rx=11 ry=22`) rotated at 0/60/120/180/240/300° around center, translated outward, `opacity: 0.55`, plus a solid center circle `r=9` |
| faith | `crescent` | Two overlapping circles via path: `M65 20 A 35 35 0 1 0 65 80 A 27 27 0 1 1 65 20 Z` |
| learning | `lantern` | Rounded rect body (`x=35 y=30 w=30 h=40 rx=6`) + two smaller rounded rects above/below as cap/base |
| build | `spark` | 8-pointed star/asterisk path: `M50 10 L58 42 L90 50 L58 58 L50 90 L42 58 L10 50 L42 42 Z` |
| celebration | `spark` | Same as build, terracotta color |
| grief | `still-water` | Three concentric circles, decreasing opacity outward, **no breathing animation** (`animation: none`) — this is the one deliberate exception, stillness is the point |

Orb color per world = that world's `orbHex` (see Section 7 table).

---

## 6. Ambient Particle Canvas (the atmosphere layer)

A full-bleed `<canvas>` positioned `absolute inset-0`, `pointer-events: none`, `mix-blend-mode: screen`, sitting behind the conversation content (z-index below content, above background gradient).

Particle behavior is **per-world**, not generic confetti. Use `requestAnimationFrame`, respawn particles when they die or leave bounds.

| World particle type | Spawn point | Velocity | Size | Notes |
|---|---|---|---|---|
| `dust` (calm) | random anywhere on canvas | tiny random drift `±0.08px/frame` both axes | 0.8–2.3px | `maxLife: 9999` (never dies, just drifts) |
| `embers` (story) | bottom edge | rises: `vy: -0.4 to -1.0`, slight horizontal drift `±0.15` | 1.5–4px | fades in/out over `200-400` frame life |
| `petals` (poetry) | top edge | falls: `vy: 0.3-0.6`, drifts `±0.2` | 4–8px | fades in/out |
| `stars` (faith) | random anywhere | static, no velocity | 0.5–2px | twinkles via `sin()` of time, `maxLife: 9999` |
| `rain` (grief) | top edge | falls fast: `vy: 2.5-4`, slight leftward drift `-0.15` | thin vertical streaks `1px × 6×size` | |
| `confetti` (celebration) | top edge | falls: `vy: 0.8-2`, horizontal drift `±0.6`, rotates | 3–6px squares (not circles) | |
| `none` (build) | — | — | — | Zero particles. Build world is stark and still. |

Particle count: ~40-60 for continuous types (dust/stars), ~30-40 for transient types (embers/petals/rain/confetti).

Alpha fade curve for transient particles (life ratio `r = life/maxLife`):
```
alpha = r < 0.15 ? r/0.15 : r > 0.8 ? (1-r)/0.2 : 1
```
Then multiply final alpha by `0.55` so particles stay subtle, never distracting from text.

Particle color = that world's `particleColor` (see Section 7), rendered as `rgba()` from hex + computed alpha.

---

## 7. Complete World Table (exact values)

| World | nameAr | nameEn | Background gradient | Particle | Particle color | Orb shape | Orb hex | Font | Type speed (ms/char) |
|---|---|---|---|---|---|---|---|---|---|
| **calm** | مساحة هادئة | Calm Space | `radial-gradient(circle at 50% 15%, #1a1825 0%, #0E0D10 55%)` | dust | `#8B7BB8` | sphere | `#8B7BB8` | sans (arsans) | 14 |
| **story** | ركن الحكاية | Story Circle | `radial-gradient(circle at 50% 100%, #3a2418 0%, #1a120c 45%, #0E0D10 75%)` | embers | `#D4724A` | flame | `#D4724A` | serif italic (enserif) | 28 |
| **poetry** | غرفة الشعر | Poetry Room | `radial-gradient(circle at 30% 20%, #241a2e 0%, #150f1c 50%, #0E0D10 80%)` | petals | `#C9A86A` | bloom | `#C9A86A` | serif (enserif) | 45 |
| **faith** | طمأنينة إيمانية | Quiet Faith | `radial-gradient(circle at 50% 30%, #1c2520 0%, #10160f 50%, #0E0D10 80%)` | stars | `#9FB89F` | crescent | `#9FB89F` | Arabic serif (arserif) | 30 |
| **learning** | غرفة التعلم | Learning Room | `radial-gradient(circle at 50% 0%, #14201c 0%, #0d1512 50%, #0E0D10 80%)` | dust | `#5C7C6B` | lantern | `#5C7C6B` | sans (arsans) | 10 |
| **build** | استوديو البناء | Build Studio | `radial-gradient(circle at 50% 50%, #1a1a14 0%, #100f0c 50%, #0E0D10 80%)` | none | — | spark | `#C9A86A` | mono | 6 |
| **celebration** | مساحة الفرح | Celebration Room | `radial-gradient(circle at 50% 20%, #2e2210 0%, #1c1408 50%, #0E0D10 80%)` | confetti | `#D4724A` | spark | `#D4724A` | sans (arsans) | 12 |
| **grief** | سكينة | Stillness | `radial-gradient(circle at 50% 50%, #15151a 0%, #0E0D10 70%)` | rain | `#6B7280` | still-water | `#6B7280` | sans (arsans) | 22 |

**Background transition:** `transition: background 1200ms` on the root container — never an instant cut, always a slow cross-fade.

**Type speed note:** lower number = faster reveal. Poetry breathes slowly (45ms/char ≈ thoughtful pacing); Build is brisk and efficient (6ms/char ≈ near-instant, matches its no-nonsense tone).

---

## 8. Mode → Default World Mapping

| Mode | Default world | Trigger examples |
|---|---|---|
| `listen` | calm | casual venting, no advice wanted |
| `support` | calm | sadness, anxiety, emotional pain |
| `joy` | celebration | good news, achievement |
| `organize` | build | overwhelm, needs structure |
| `expert` | learning | medical/legal/financial questions |
| `coach` | build | goals, motivation, accountability |
| `research` | learning | wants to learn/study, asks for resources |

World Shift always available to override into: **story, poetry, faith, build** (plus calm as a "reset"), regardless of detected mode — re-narrating the last user message without asking them to repeat it.

---

## 9. Mode Badge Component

Small pill, centered below the orb:

```
┌─────────────────────────────┐
│ ●  CALM SPACE   مساحة هادئة │
└─────────────────────────────┘
```

- Dot: `6px` circle, solid world color.
- English label: `font-mono`, `10px`, uppercase, `tracking-widest` (letter-spacing ~0.08em), `text-bone/70`.
- Arabic label: `font-arsans`, `12px`, `text-bone/90`.
- Pill: `border: 1px solid {worldHex}55` (55 = ~33% alpha hex suffix), `background: {worldHex}15` (~8% alpha), `border-radius: 9999px` (full pill), `padding: 6px 12px`, transition `700ms` on color change.

---

## 10. World Shift Control

Row of small pill buttons below the badge, horizontally centered, wrapping on narrow screens:

```
حوّل اللحظة   [حكاية]  [شعر]  [إيمان]  [بناء]
```

- Label "حوّل اللحظة" (shift the moment): `font-mono`, `9px`, uppercase, `text-bone/30`.
- Each button: Arabic world name only (no English here), `font-arsans`, `11px`, `padding: 4px 10px`, `border-radius: 9999px`.
- Inactive state: `border: 1px solid rgba(247,243,236,0.12)`, transparent background, `color: rgba(247,243,236,0.55)`.
- Active state (current world): `border-color: {worldHex}`, `background: {worldHex}22`, `color: {worldHex}`.
- Disabled (while AI is responding, or before first message sent): `opacity: 0.3`.
- Transition: `all 300ms` on every property.

**Behavior:** Clicking a world button instantly re-paints the whole screen (background/orb/particles switch immediately, optimistically) *before* the network call to re-narrate completes. The new narration streams in below as a fresh message once it arrives. This instant visual switch — ahead of content — is what sells the "it understood" feeling.

---

## 11. Typewriter Text Reveal

Companion replies (not user messages) reveal character-by-character at the active world's `typeSpeed` (ms per character, see Section 7 table). Implementation: `setInterval` incrementing a slice index, cleared on unmount/text change.

```js
let i = 0;
const interval = setInterval(() => {
  i += 1;
  setShown(text.slice(0, i));
  if (i >= text.length) clearInterval(interval);
}, speed);
```

Respect `prefers-reduced-motion: reduce` — disable the breathing orb animation (not the typewriter, which is informational pacing, not decorative) for that media query.

---

## 12. Resource Cards (Research/Learning World)

When the assistant attaches real resources (video/article/PDF/audio), render collapsible cards below the message — never auto-expanded, never forcing the user to leave the app:

```
┌───────────────────────────────────────┐
│ ▶  How to learn X in 2026        [+]  │
│    YouTube · Channel Name             │
└───────────────────────────────────────┘
```

- Icon per type: `▶` video, `✎` article, `▤` pdf, `♪` audio — shown in `sage` color, `font-mono`.
- Title: `font-arsans`, `14px`, truncated to one line, `dir="auto"`.
- Source: `font-mono`, `10px`, uppercase, `text-bone/35`.
- Card: `border: 1px solid var(--line)`, `background: rgba(247,243,236,0.03)`, `border-radius: 8px` (`--border-radius-md` equivalent).
- On expand: video → 16:9 YouTube iframe embed; pdf → embedded iframe, `384px` height; audio → native `<audio controls>`; article → external link styled in gold, opens new tab.

---

## 13. Paywall / Usage Limit Card

Appears inline in the conversation flow (not a modal) when free sessions are exhausted:

```
┌───────────────────────────────────────┐
│ خلصت جلساتك المجانية الشهر ده.        │
│ [ اشترك بـ 9.99$ شهريًا ]             │
└───────────────────────────────────────┘
```

- Card: `border: 1px solid {gold}30`, `background: {gold}0a` (very subtle gold wash), `border-radius: 8px`, `padding: 16px`.
- CTA button: solid `gold` background, `ink` text, `font-mono`, uppercase, small, `border-radius: 6px`, `padding: 8px 16px`. Hover: `gold/90`.

---

## 14. Crisis Safety Resource Block

When crisis language is detected, the resource block is appended to the bottom of the AI's reply (same message, same styling as normal reply text) — **never a separate modal, never alarming red styling**. It should read as calm and supportive, matching the room's tone, not as a system alert.

Content includes: a soft opening line, 2-4 regional hotline numbers (GCC-focused: Kuwait 147, Saudi Mosanada 920033360, UAE 800-4673), and findahelpline.com as an international fallback. Always closes by reaffirming presence ("أنا معاك دلوقتي") before noting it isn't a substitute for a trained professional.

---

## 15. Personas (companion identities — optional layer)

Nine fictional, explicitly non-real companion personas, each with a distinct voice tone that layers on top of whichever World is active. Each has a gradient "portrait" (two hex stops, until real illustrated art exists):

| Persona | Arabic | Role (EN) | Gradient |
|---|---|---|---|
| Omar | عمر | Close friend | `#8B7BB8 → #534AB7` |
| Uncle Sami | عم سامي | Wise elder | `#C9A86A → #8A6A33` |
| Nora | نورا | Action coach | `#5C7C6B → #2E4A3C` |
| Laila | ليلى | Teacher | `#D4724A → #8A3F22` |
| Karim | كريم | Career mentor | `#8B7BB8 → #3F3766` |
| Mariam | مريم | Big sister | `#D4724A → #A14D2E` |
| Aunt Huda | خالة هدى | Warm aunt | `#C9A86A → #7A5B28` |
| Youssef | يوسف | Study buddy | `#5C7C6B → #33473D` |
| Dana | دانا | Project builder | `#C9A86A → #5C7C6B` |

Persona portrait placeholder: a circle, `48-56px`, filled with `linear-gradient(135deg, {gradientFrom}, {gradientTo})`, no photo, no illustration yet — purely a color identity until commissioned art replaces it. Never use a real human photo or any photorealistic face for these.

---

## 16. PWA Requirements

- `manifest.json`: `display: "standalone"`, `background_color: "#0E0D10"`, `theme_color: "#0E0D10"`, `dir: "rtl"`, `lang: "ar"`, `orientation: "portrait-primary"`.
- Icons: `192×192`, `512×512`, and a `512×512` maskable variant. Icon art = the orb motif (concentric gold/violet circles) on `#0E0D10` background — matches the in-app presence orb so the home-screen icon feels continuous with the app.
- Service worker via `next-pwa`, `register: true`, `skipWaiting: true`, disabled in dev mode.
- `viewport` meta: `width=device-width`, `initial-scale=1`, `maximum-scale=1`, `theme-color: #0E0D10`.

---

## 17. What to Avoid (explicit anti-patterns)

- ❌ No chat bubbles with rounded rects and tails.
- ❌ No bright purple/blue gradient header bar (the generic "AI chatbot" look).
- ❌ No avatar circles with initials next to every message.
- ❌ No emoji in the UI chrome (fine within Gemini's actual reply text if natural).
- ❌ No instant, un-animated mode switching — every transition (background, orb) must transition over 700-1200ms, never snap.
- ❌ No modal popups for the paywall or crisis resources — keep everything inline in the conversational flow.
- ❌ No photorealistic AI-generated human avatars for personas — gradient identity only, explicitly fictional.

---

## 18. File Reference (for Copilot context)

These are the actual source files this spec was extracted from, if you have repo access:

```
lib/worlds.ts          — world definitions, exact hex/gradient/particle values
lib/modes.ts           — functional mode definitions + system prompts
lib/personas.ts        — persona definitions
lib/gemini.ts          — mode/world resolution + Gemini calls
lib/safety.ts          — crisis detection + resource text (AR/EN)
lib/research.ts        — resource-finding via Gemini search grounding
components/PresenceOrb.tsx    — orb SVG shape switch logic
components/WorldCanvas.tsx    — particle canvas implementation
components/ModeBadge.tsx      — badge pill
components/WorldShift.tsx     — world shift buttons
components/TypewriterText.tsx — reveal-speed text component
components/ResourceList.tsx   — resource cards
components/ConversationRoom.tsx — top-level composition of all of the above
tailwind.config.ts     — color/font/animation tokens
```

If Copilot is implementing from scratch in a different stack, every value above (hex codes, gradient strings, timing numbers, font names) is stack-agnostic and should be copied exactly as written.
