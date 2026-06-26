# FadFada | فضفضة

FadFada is an Arabic-first bilingual emotional reflection and personal growth PWA. It gives users a calm space to write what they feel, choose the right companion, reflect in Arabic or English, save meaningful moments, and leave with one small practical next step.

Live app: https://fad-fada.vercel.app

## Current Status

FadFada is in public beta. The core experience is free while live checkout configuration, hackathon materials, and early user feedback are finalized.

Payment state:
- Lemon Squeezy Merchant of Record approval is complete and is the recommended live checkout provider.
- Stripe remains available as a fallback checkout provider.
- Paddle was integrated and tested, but live checkout was rejected after the product was classified under AI / creative generative AI.
- Premium checkout requires live Lemon Squeezy product, variant, API key, and webhook secret configuration.

## Product Positioning
FadFada should be described as a wellbeing, journaling, emotional reflection, and personal growth web app. The primary value is guided reflection, emotional organization, cultural fit, and practical next steps.

Suggested external description:
> FadFada is an Arabic-first bilingual emotional reflection PWA. It helps users write what they feel, choose a companion style, complete check-ins, save meaningful moments, and turn reflection into one small next step.

FadFada is not a medical, therapeutic, emergency, legal, financial, or crisis-support service.

## Core Features

- Arabic/English bilingual interface with RTL/LTR support.
- Mobile-first installable PWA experience.
- Arabic-first UI/UX with calm dark theme, warm editorial typography, centered modals, and clean primary chat focus.
- Gemini / Google GenAI powered reflection with local fallback behavior.
- Guided freeform chat for venting, reflection, planning, learning, and storytelling.
- Voice input and browser speech playback where supported.
- Dynamic world modes: calm, story, poetry, faith, learning, build, celebration, and grief.
- Dynamic persona environment warp: selected companions change visual atmosphere, response typography, cadence, avatar glow, and typewriter particle accent.
- Daily Pulse check-in for mood, energy, and current need.
- Tiny Plans generated from assistant responses.
- Saved Moments stored locally on the device.
- Moment Capsules downloadable as Markdown.
- Journey Snapshots for saved progress summaries.
- 3-Day FadFada Quests with progress tracking and buddy/share text.
- Proof Cards that turn a response into a share-ready before/after artifact.
- Story Mirror mode with Rawiya for users who process feelings through story, play, symbolic scenes, and gentle roleplay.
- Early Believer Badge for follower growth and launch sharing.
- Follower-ready launch posts and judge-ready pitch text.
- Profile page with saved moments, snapshots, quests, tiny plans, public identity, profile logo/image, and social links.
- Admin dashboard with visitor/event/comment telemetry, avatar ratings, geographic visit sources, and product signals.
- Legal, pricing, privacy, refund, and terms pages for payment-provider review.

## Companion System

The visible companion drawer currently shows 24 primary personas grouped into two families:

- `يسمعك` / `Listens with you`: for presence, comfort, grief, dismissal, storytelling, and emotional containment.
- `يبنيك` / `Helps you build`: for planning, learning, strategy, creativity, business, legal/business framing, and execution.

Visible personas:

- Listen family: Omar, Uncle Sami, Maryam, Khalti Ne'ma, Sanad, Rawiya, Poetry Bot, DJ Layl.
- Build family: Nora, Captain Kareem, Malik GamerX, The Silicon Sheikh, Grandmaster, Professor Zein, Logoz, The Screenwriter, Dania, Adam, Ryan, Layan, Wamda, Radar, Sarah, Tareq.

Important registry files:

- `src/lib/personas.ts` is the source of truth for persona metadata, prompts, voice config, avatar paths, premium flags, and world mapping.
- `src/components/PersonaDrawer.tsx` controls which personas are visible in the drawer.
- `src/components/ChatWindow.tsx` applies the active persona to the chat, visual environment, voice, and demo flows.

## UI/UX And Theme

FadFada's interface is designed to feel like a quiet premium reflection room, not a crowded chatbot dashboard. The first screen keeps the chat, active companion, and primary actions visible, while secondary tools are moved into focused modals.

UX principles:

- Arabic-first, bilingual second: the default layout is RTL Arabic, with English UI switching cleanly to LTR.
- Chat-first hierarchy: the conversation stays central; advanced features live behind Tools, Companion, Profile, and Admin surfaces.
- Low-crowding interaction model: prompts, plans, demo shortcuts, product info, check-ins, and comments are grouped into tabs inside the Tools dialog.
- Companion visibility: the active companion avatar, name, role, aura, and current world are visible without forcing users into the drawer.
- Judge-ready flow: Demo Keys are discoverable inside Tools, and slash commands can launch polished demo/share artifacts without adding visible clutter.
- Mobile-first overlays: Tools and Companion use centered, scroll-safe modals with dimmed backdrops instead of bottom sheets that require users to scroll down.
- Progressive depth: users can simply vent, or they can save moments, create plans, download capsules, start quests, and share proof cards when ready.

Theme direction:

- Base canvas: deep ink `#0E0D10`.
- Primary text: warm bone `#F7F3EC`.
- Main accent: muted gold `#C9A86A`.
- Supporting accents: dusk `#8B7BB8`, terracotta `#D4724A`, and sage `#5C7C6B`.
- Surfaces: translucent dark panels, soft borders, backdrop blur, and subtle grid/radial background texture.
- Motion: slow breathing glow and rise-in transitions, with `prefers-reduced-motion` respected.
- PWA viewport theme color: `#0E0D10`.

Typography:

- Arabic UI: Cairo and Tajawal.
- Arabic expressive text: Noto Naskh Arabic.
- English expressive text: Cormorant Garamond.
- English UI: IBM Plex Sans.
- Mono/details: IBM Plex Mono.

Theme implementation files:

- `src/app/globals.css` defines global CSS variables, font imports, body background, motion, and shared utility classes such as `ui-kicker`, `ui-action`, `luxury-surface`, and `obsidian-hairline`.
- `tailwind.config.ts` mirrors the core theme tokens for Tailwind: `ink`, `bone`, `gold`, `dusk`, `terracotta`, `sage`, and `line`.
- `src/app/layout.tsx` sets the app manifest, mobile viewport, and browser theme color.
- `src/components/AppShell.tsx` owns global language direction, shell font class, fixed header, account menu, footer, PWA update manager, and notifications.
- `src/components/ChatWindow.tsx` owns the main product UI, active companion header, bottom navigation, Tools modal, world/persona atmosphere, and chat interaction states.
- `src/components/PersonaDrawer.tsx` owns the centered companion selector, grouped persona browsing, rating UI, custom companion form, and avatar studio.
- `src/components/TypewriterSync.tsx` owns the animated response typing and persona-accented particles.

## Tools Dialog

The main screen stays intentionally clean. Secondary actions live in the Tools dialog:

- Check-in: Daily Pulse mood/energy/need check-in.
- Tone: world shift and behavior style controls.
- Prompts: starter prompts, judge demo scenarios, and Demo Keys.
- Plans: Plus plan comparison and checkout entry.
- About: user flow guide, product positioning, feature strip, and visitor comments.

## Demo Keys And Hidden Commands

FadFada includes discoverable demo shortcuts for judges and growth moments.

Where to find them:

1. Open `Tools / الأدوات`.
2. Go to `Prompts / بدايات`.
3. Open `Demo keys / مفاتيح العرض`.

Users can also type these in the chat input.

Judge/demo commands:

- `/judge`, `/demo`, `/wow`
- Arabic: `/عرض`, `/حكام`

These launch the strongest judge demo flow, auto-selecting the intended companion and world.

Share/growth commands:

- `/proof`, `/card`, `/viral` or `/اثبات`, `/بطاقة`: creates a shareable Proof Card from the latest assistant reply.
- `/pitch`, `/judge-pitch`, `/deck` or `/ملخص`, `/عرض-سريع`: copies/shares a 60-second judge pitch.
- `/launch`, `/follow`, `/thread` or `/منشور`, `/تابع`: copies/shares a follower-ready launch post.
- `/badge`, `/believer`, `/early` or `/شارة`, `/مؤمن`: creates an Early Believer Badge post.
- `/story`, `/play`, `/scene` or `/حكاية`, `/مشهد`, `/لعب`: switches to Rawiya and turns the latest feeling into a compact Story Mirror.
- `/capsule`, `/memory` or `/كبسولة`, `/ذكرى`: downloads the latest Moment Capsule.
- `/quest`, `/3days` or `/تحدي`, `/رحلة`: starts a 3-Day FadFada Quest.

Natural-language aliases such as `Demo keys`, `secret commands`, `shortcuts`, `مفاتيح العرض`, and `اختصارات` open the Demo Keys panel instead of being sent to the AI.

Recommended judge flow:

1. Type `/judge`.
2. Wait for the persona/environment response.
3. Type `/proof`.
4. Type `/pitch`.

Recommended follower flow:

1. Have one meaningful reflection.
2. Type `/badge` or `/launch`.
3. Share the generated text on LinkedIn/X/WhatsApp.

## Profile And Local Artifacts

The profile page is the user's local progress library:

- Saved Moments
- Journey Snapshots
- FadFada Quests
- Tiny Plans
- Account profile image/logo
- Name, nickname, and social links

Saved artifacts are stored in browser `localStorage`. The UI localizes generated artifact titles and default quest steps to the current interface language while preserving personal user-written text as-is with automatic text direction.

## Admin And Telemetry

Admin tools include:

- Visitor logs
- Geographic visit sources
- Interaction events
- Visitor comments
- Avatar ratings
- Profile/account signals
- Basic product usage metrics

Visitor geography uses Vercel, Cloudflare, and common proxy headers where available. Unknown regions are excluded from the geographic source group in the dashboard.

## Pricing Plan

Current beta:

- Free during public beta until Lemon Squeezy live checkout is fully configured.

Planned paid plan:

- FadFada Plus: USD $4.99/month.
- Optional premium companion/persona unlocks may be added later as small digital add-ons, expected around USD $3.99 each.
- No physical goods are sold.
- No medical, legal, financial, emergency, or regulated services are sold.

Free plan includes:

- Core bilingual reflection chat.
- Guided prompts and daily check-ins.
- Selected companion access.
- Local saved moments.
- Tiny plans, capsules, proof cards, and basic sharing.

Planned Plus includes:

- Longer usage limits.
- Expanded saved moments and capsules.
- More personalization.
- Premium companion/persona access.
- Deeper reflection and progress tools.

## Payments

Payment provider behavior is selected by environment variables.

Current recommended live provider:

- `PAYMENT_PROVIDER=lemonsqueezy`
- `LEMONSQUEEZY_MODE=test` or `LEMONSQUEEZY_MODE=live`
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_PLUS_VARIANT_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`

Lemon Squeezy product positioning:

> FadFada Plus is an instant-access digital subscription. After checkout, the buyer receives immediate access to premium in-app features such as longer reflection limits, expanded saved moments, companion personalization, and premium digital companions. No manual service, coaching, therapy, consulting, or custom fulfillment is included.

To activate Lemon Squeezy checkout in production, configure:

- `PAYMENT_PROVIDER=lemonsqueezy`
- `LEMONSQUEEZY_MODE=test` while testing; change to `live` only when using live Lemon credentials.
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_PLUS_VARIANT_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL=https://fad-fada.vercel.app`

Stripe fallback can be activated with:

- `PAYMENT_PROVIDER=stripe`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_CHECKOUT_MODE=subscription`
- `NEXT_PUBLIC_APP_URL=https://fad-fada.vercel.app`

Provider notes:

- Paddle routes and webhook scaffolding exist but Paddle live approval is currently rejected/paused.
- Lemon Squeezy webhook handling grants Plus instantly for paid order/subscription events.
- Stripe webhook handling remains available for fallback entitlement activation.

Recommended payment-provider wording while checkout is not configured:

> Premium access is temporarily paused while live checkout is configured. All core features are available during early access.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- Neon PostgreSQL
- NextAuth
- Gemini / Google GenAI
- Lemon Squeezy Merchant of Record checkout
- Stripe checkout fallback
- Paddle integration scaffolding
- Vercel deployment

## Getting Started

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Update `.env` with local database and provider credentials. Local development needs a valid `DATABASE_URL` if Prisma-backed routes are exercised.

Run development server:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Start production build locally:

```bash
npm run start
```

## Environment Variables

Key variables are documented in `.env.example`.

Important groups:

- `DATABASE_URL` for Neon/Postgres.
- `GEMINI_API_KEY` or production Google identity configuration for Gemini.
- `PAYMENT_PROVIDER` to select `lemonsqueezy`, `stripe`, or `paddle`.
- `LEMONSQUEEZY_MODE` to label the active Lemon configuration as `test` or `live`; Lemon still determines the real checkout mode from the matching API key, store, variant, and webhook values.
- `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_PLUS_VARIANT_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET` for Lemon Squeezy checkout.
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CHECKOUT_MODE` for Stripe.
- `PADDLE_API_KEY`, `PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` for the paused Paddle path.
- `NEXT_PUBLIC_APP_URL` for checkout redirects and production URL generation.

## Deployment

Production is deployed on Vercel.

Reliable production deploy command used during the hackathon build:

```bash
npx --yes vercel@54.15.1 deploy --prod
```

The live production alias is:

```text
https://fad-fada.vercel.app
```

Build command:

```bash
npm run build
```

Prisma migration command:

```bash
npm run db:deploy
```

## Useful Checks

Build check:

```bash
npm run build
```

Production smoke check on Windows PowerShell:

```powershell
$paths = @('/','/pricing','/privacy','/terms','/refund'); foreach ($path in $paths) { $response = Invoke-WebRequest -Uri "https://fad-fada.vercel.app$path" -UseBasicParsing; "$path $($response.StatusCode) $($response.Headers['Content-Type'])" }
```

Production avatar smoke check:

```powershell
$ids = 'omar','sami','maryam','nema','sanad','rawi','poetry_bot','layl','nora','kareem','malik','sheikh','grandmaster','zein','logoz','screenwriter','dania','adam','ryan','layan','wamda','radar','sarah','tareq'; foreach ($id in $ids) { $r = Invoke-WebRequest -Uri "https://fad-fada.vercel.app/avatars/$id.png" -Method Head -UseBasicParsing; "$id $($r.StatusCode) $($r.Headers['Content-Type'])" }
```

## Repository Notes

- Use `apply_patch` or editor-safe writes for Arabic TypeScript/Markdown. Avoid shell writes that can corrupt UTF-8.
- The visible persona list is controlled by `selectorPersonaIds` in `src/components/PersonaDrawer.tsx`, not by the registry alone.
- Avatar asset paths should stay lowercase and Linux-safe.
- If the PWA cache shows stale production UI, hard refresh or clear site data on the test device.
- Local `.env` may contain placeholder database credentials; production DB inspection requires real Neon credentials.
