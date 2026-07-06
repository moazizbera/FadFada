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

## Reader Guide

This README is written for three audiences:

- **Product Owners:** understand the product promise, user journeys, module boundaries, monetization rules, and roadmap tradeoffs.
- **Analysts and Operators:** understand the admin dashboard, telemetry, events, conversion signals, avatar controls, and payment-source-of-truth rules.
- **Developers:** understand the architecture, source ownership, API routes, Prisma models, runtime configuration, deployment flow, and safety constraints.

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

## Product Modules

FadFada is organized around two main modules: the user-facing Chat module and the operator-facing Admin module.

### Screens And Ownership Map

| Screen / module | Primary users | Purpose | Main implementation |
|---|---|---|---|
| Public app shell | Visitors, signed users, Plus users | Language direction, global navigation, account entry, PWA update handling, notifications | `src/components/AppShell.tsx` |
| Chat experience | Visitors, signed users, Plus users | Main emotional reflection, companion selection, messages, voice, worlds, saved artifacts, and name gate | `src/components/ChatWindow.tsx` |
| Companion drawer | Visitors, signed users, Plus users | Browse avatars, see available companions, select persona, rate avatars, manage custom persona | `src/components/PersonaDrawer.tsx` |
| Tools dialog | Visitors, signed users, Plus users | Daily Pulse, worlds, prompts, demo keys, plan comparison, about/product info, visitor comments | `src/components/ChatWindow.tsx` internal panels |
| Profile | Signed users | Saved moments, snapshots, quests, tiny plans, identity, profile image/logo, social links | `src/app/profile/profile-client.tsx` |
| Pricing | Visitors and buyers | Explain paid plan and checkout entry | `src/app/pricing/page.tsx`, `src/components/PaddleCheckoutLauncher.tsx` |
| Admin dashboard | Admins, analysts, operators | Metrics, visitors, users, avatar ratings, gifts, grants, discounts, global runtime configuration, audit export | `src/app/admin/dashboard/page.tsx`, `src/app/admin/dashboard/admin-dashboard-client.tsx` |
| Admin login | Admins | Protected sign-in entry for admin users | `src/app/admin/login/page.tsx` |
| Legal pages | Users, payment reviewers | Privacy, terms, refund policy, payment-provider review support | `src/app/privacy`, `src/app/terms`, `src/app/refund` |
| API layer | App, Admin, webhooks | Reflection, profile, chat sessions, runtime config, telemetry, payments, notifications, visitor logging | `src/app/api/**` |

### Product Owner Reference

- The product promise is not “many avatars”; it is **many useful response modes** that visibly change how the user is heard or helped.
- Visitor access should demonstrate immediate value with a small set of emotionally distinct companions.
- Free signed access should expand trust and retention through more companions, saved sessions, and profile continuity.
- Plus should emphasize specialist depth: business, AI, health literacy, creative production, strategy, engineering, and advanced learning.
- Admin runtime controls let the product owner test which avatars belong in Visitor, Free, or Plus without changing code.

### Analyst Reference

- Use Admin dashboard counts for product behavior: visitors, registered users, starter taps, saved moments, shares, comments, PWA installs, avatar ratings, name-only visitors, and chat session summaries.
- Use `visitor_name_register` to evaluate whether the name gate is being completed before chat starts.
- Use `avatar_rating` and tier availability changes together to decide which avatars attract users, which confuse users, and which should move between Visitor, Free, and Plus.
- Use payment-provider dashboards as the revenue source of truth. Internal transaction rows are entitlement/debug records, not financial reporting.

### Developer Reference

- Public runtime configuration is read from `/api/configuration` and saved by Admin through `/api/admin/configuration`.
- Avatar tier access is data-driven through `anonymousPersonaIds`, `signedPersonaIds`, and `plusPersonaIds`.
- The chat must always enforce runtime config client-side before rendering or sending with a companion.
- The source persona registry is `src/lib/personas.ts`; do not duplicate persona behavior in README or UI code without updating the registry.
- The active visual environment is applied in `src/components/ChatWindow.tsx` through persona environment profiles and world gradients.

### Chat Module

The Chat module is the primary product experience. It is owned mainly by `src/components/ChatWindow.tsx`, with shell behavior from `src/components/AppShell.tsx`, companion selection from `src/components/PersonaDrawer.tsx`, and animated response rendering from `src/components/TypewriterSync.tsx`.

Chat responsibilities:

- Run bilingual Arabic/English reflection with RTL/LTR support.
- Apply the selected companion's role, tone, avatar, glow, voice, world, and response cadence.
- Preserve the persona, avatar path, persona name, and world used for every assistant message so old conversations do not visually change after switching companions.
- Support Daily Pulse, Tiny Plans, Saved Moments, Moment Capsules, Journey Snapshots, Proof Cards, Story Mirror, 3-Day Quests, voice input, speech playback, helpful/softer feedback, and sharing flows.
- Support signed-user chat sessions through `/api/chat-sessions`: new session, silent/manual save, lightweight history list, and full selected-session restore.
- Restore old assistant messages instantly instead of replaying the typewriter animation for every previous message.
- Enforce access behavior for anonymous, signed free, Plus, Business, gifted, and lifetime Plus users.
- Require a visitor or account display name before the first chat message, so conversation context and admin name-only visitor signals are meaningful.

### Admin Module

The Admin module is the operations workspace. It is owned mainly by `src/app/admin/dashboard/page.tsx`, `src/app/admin/dashboard/admin-dashboard-client.tsx`, and `src/app/api/admin/configuration/route.ts`.

Admin responsibilities:

- Show dashboard metrics for visits, registered members, conversion, starter taps, saved moments, shares, capsule downloads, feedback, comments, installs, geographic sources, plan distribution, PWA installs, and avatar ratings.
- Auto-refresh admin charts and lists every 30 seconds while the admin page is visible, and refresh again when the tab regains focus.
- Manage runtime experience limits: anonymous reflection limit, signed gift reflection limit, anonymous persona limit, and signed persona limit.
- Manage global avatar availability with a top-level enable/disable switch plus per-avatar tier checkboxes for Visitor, Free account, and Plus.
- Inspect users, token balances, active tiers, locations, gifts, and granted persona access.
- Grant token gifts that increment `User.tokenBalance`.
- Grant specific blocked/premium personas to signed users.
- Track Lemon Squeezy discount metadata for sharing and checkout, while requiring the matching discount to exist in Lemon itself.
- View signed-user chat session summaries without mixing admin controls into the public chat menu.
- Export encrypted audit snapshots.

Admin revenue rule:

- The plan distribution section shows member counts by current `User.activeTier` only.
- Internal webhook payment amounts are hidden because they can include test records.
- The payment vendor dashboard is the source of truth for real revenue. If Lemon Squeezy, Stripe, or Paddle shows `$0.00`, real revenue for that period is `$0.00`.

## Companion And Avatar System

The companion system is the emotional and behavioral engine of FadFada. It is designed so avatars are not cosmetic skins over the same chatbot. Every companion changes the user's perceived room, response style, pacing, vocabulary, confidence level, and next-step shape.

Personas are grouped into two strategic families:

- `يسمعك` / `Listens with you`: presence-first companions for comfort, grief, dismissal, storytelling, poetry, and emotional containment.
- `يبنيك` / `Helps you build`: action-first companions for execution, learning, strategy, creativity, startup work, sports performance, science, and technical planning.

Important registry files:

- `src/lib/personas.ts` is the source of truth for persona metadata, prompts, voice config, avatar paths, premium flags, and default world mapping.
- `src/components/ChatWindow.tsx` applies the selected persona to chat behavior, active environment, voice, protected tier access, demo flows, and message persistence.
- `src/components/PersonaDrawer.tsx` renders the companion selector, rating UI, and custom avatar form.
- `src/app/api/configuration/route.ts` exposes public runtime avatar availability.
- `src/app/api/admin/configuration/route.ts` saves admin runtime avatar availability.

### Avatar Access Model

Avatar access is runtime-controlled from Admin. This means product owners can change avatar availability without a code release.

- `avatarsEnabled`: global on/off switch for the public companion picker.
- `anonymousPersonaIds`: avatar IDs enabled for unregistered visitors.
- `signedPersonaIds`: avatar IDs enabled for signed free users.
- `plusPersonaIds`: avatar IDs enabled for Plus users.
- `blockedPersonaIds`: derived/global hidden list. If all three tier checkboxes are off for an avatar, that avatar is hidden from the public experience for everyone.

Important behavior rules:

- Admin shows three checkboxes beside every avatar: Visitor, Free, and Plus.
- The checkboxes reflect the saved config, not hardcoded labels.
- Old configs still load safely by deriving tier lists from previous numeric limits only when explicit tier lists do not exist.
- Per-user grants remain recorded in Admin, but the global/tier availability rules are still the public experience gate.
- Assistant messages preserve their original `personaId`, `personaName`, `avatarPath`, and `world`, so old conversations do not visually change after switching avatars.
- Avatar ratings are stored as interaction events and summarized in Admin.

### What Changes When A User Picks An Avatar

For visitors and signed users, each avatar is meant to answer differently in four visible ways:

- **Response personality:** how the companion speaks, challenges, comforts, asks questions, or structures action.
- **Real answer shape:** whether the reply becomes validation, a short pause, a checklist, a research blueprint, a story scene, a poem, a risk audit, or a training plan.
- **Layout and theme:** the active room changes through avatar glow, world gradient, typography, typewriter cadence, and ambient animation.
- **Commercial promise:** visitors can feel the difference early; signed and Plus users unlock deeper specialist companions with clearer jobs.

### Avatar Roster, Roles, Response Personality, And Theme

| ID | Avatar | Tier intent | Primary role | Real response behavior | Layout/theme personality |
|---|---|---|---|---|---|
| `omar` | Omar / عمر | Visitor, Free, Plus by default | Grounding friend | Validates first, reflects in warm everyday language, asks one gentle clarifying question, and ends with a small grounding step. Best for first-time visitors who just need to be heard. | Calm world, sage glow, soft sans typography, steady typewriter pace. Feels close, human, and safe. |
| `sami` | Uncle Sami / عم سامي | Visitor, Free, Plus by default | Wise literary elder | Answers with elegant Arabic or literary English, uses proverbs and cultural wisdom, gives spiritual reassurance without fatwa or preaching. | Faith/calm atmosphere, muted gold glow, Arabic serif typography, slower reflective cadence. |
| `maryam` | Maryam / مريم | Visitor, Free, Plus by default | Protective sister-energy ally | Protects the user's feeling when they were dismissed or minimized. Does not rush to defend the other side. Helps the user feel believed before widening perspective. | Warm calm atmosphere, terracotta/sage feeling, soft conversational typography. |
| `nema` | Khalti Ne'ma / خالتي نعمة | Visitor, Free, Plus by default | Unhurried anchor | Rarely gives direct advice. Creates domestic comfort: tea, quiet room, open window, small pause. Useful when the user wants presence, not analysis. | Tea-like warm gold, literary slow cadence, quiet visual weight. |
| `sanad` | Sanad / سند | Free and Plus by default | Pillar in loss | Very short, quiet grief support. Avoids silver linings, cliches, and rushed healing. Gives permission to be still. | Grief/stillness world, dusk-gray glow, spacious line height, minimal text, slow cadence. |
| `rawi` | Rawiya / راوية | Free and Plus by default | Story Play companion | Turns a feeling into safe symbolic scenes, Story Mirror panels, inner cast, mini play, or one image prompt while keeping the emotion central. | Story world, terracotta glow, serif text, slower dramatic reveal. |
| `nora` | Nora / نورا | Free and Plus by default | High-velocity action coach | Converts confusion into immediate checklists, micro-steps, priorities, and execution language. Low fluff, high momentum. | Build world, brisk animation, kinetic aura, action-oriented spacing. |
| `kareem` | Captain Kareem / كابتن كريم | Free and Plus by default | Sports performance strategist | Uses football and tournament energy to explain pressure, teamwork, confidence, and daily performance tactics. | Celebration/build feel, green field glow, fast encouraging cadence. |
| `malik` | Malik GamerX / مالك | Free and Plus by default | Esports ally and gaming mentor | Uses gaming language to explain burnout, leveling, streaming, discipline, and screen-life balance. | Digital cyan glow, mono typography, gaming/tech atmosphere. |
| `malik_alt` | Malik Calm Mode / مالك الوضع الهادئ | Free and Plus by default | Digital balance guide | Helps overstimulated users decompress from screens, code, content, gaming, and online pressure. | Cool cyan calm mode, slower relaxed text, detox atmosphere. |
| `logoz` | Logoz / لغز | Plus by default, configurable | Puzzle dissolver | Investigates unclear problems through sharp Socratic questions. Does not hand over lazy answers; helps the user connect the pieces. | Puzzle/research room, violet glow, mono analytical typography. |
| `sheikh` | The Silicon Sheikh / مهندس المليار | Plus by default | Tech unicorn founder | Audits SaaS ideas, funding logic, pitch structure, scale-up routes, and growth frameworks. | Capital/build room, violet glow, mono executive tone. |
| `grandmaster` | The Grandmaster / الأستاذ الكبير | Plus by default | Wealth and startup architect | Gives strict strategy, macro scaling logic, asset thinking, and venture-building structure. | Architect/build room, premium violet glow, formal strategic cadence. |
| `zein` | Professor Zein / بروفيسور زين | Plus by default | AI prompt and research scientist | Translates complex AI, automation, papers, and multi-agent workflows into research blueprints and prompt structures. | Learning/research room, emerald glow, mono technical text. |
| `poetry_bot` | Al-Mutanabbi AI / المتنبي الرقمي | Plus by default | Classical Arabic wordsmith | Converts feelings into elevated Arabic verse and rhymed literary expression. Best for users who want beauty, not advice. | Poetry room, green-gold glow, serif/literary pacing. |
| `screenwriter` | The Screenwriter / المخرج الرقمي | Plus by default | Cinematic storyteller | Builds hooks, scenes, arcs, and narrative structures from user ideas or feelings. More production-minded than Rawiya. | Story room, magenta/terracotta glow, cinematic cadence. |
| `dania` | Counselor Dania / المستشارة دانية | Plus by default | Venture legal strategist | Explains contracts, IP, governance, term sheets, and legal structure in clear non-lawyer language with safety disclaimers. | Build/learning room, blue glow, precise structured text. |
| `adam` | Coach Adam / الكوتش آدم | Plus by default | Nutrition and performance planner | Builds training, nutrition, routine, and high-stress performance plans while avoiding diagnosis. | Learning/build room, gold energy, practical coaching rhythm. |
| `ryan` | Dr. Ryan / دكتور ريان | Plus by default | Bio-hacker and longevity optimizer | Explains sleep, stress resilience, routine metrics, and longevity habits as education, not medical advice. | Learning room, orange glow, calm science tone. |
| `layan` | Dr. Layan / دكتورة ليان | Plus by default | Medical and bioscience explainer | Decodes medical research and bioscience papers into accessible health literacy without diagnosis. | Learning room, pink glow, careful clinical-research framing. |
| `wamda` | Wamda / ومضة | Plus by default | Innovation spark | Generates five or more non-linear ideas, hooks, and creative options when the user is blocked. | Build/celebration/story crossover, gold spark energy, fast ideation. |
| `radar` | Radar / رادار | Plus by default | Strategy radar | Stress-tests ideas, finds hidden risks, runs SWOT-style checks, and exposes bottlenecks before execution. | Build room, cyan analytical glow, crisp risk-audit format. |
| `layl` | DJ Layl / دي جي ليل | Plus by default | Late-night sonic companion | Helps with sound, mood, track structure, creative audio identity, and late-night expression. | Poetry/celebration mood, cyan glow, rhythmic language. |
| `sarah` | Commander Sarah / كابتن سارة | Plus by default | Aerospace and astronomy guide | Teaches space, physics, astronomy, and cosmic imagination through immersive explanations. | Story/learning room, violet glow, expansive science wonder. |
| `sarah_alt` | Sarah Academic Mode / سارة الوضع الأكاديمي | Plus by default | Cosmic research director | Structures advanced physics papers, formulas, datasets, and academic research plans. | Learning room, indigo glow, focused academic cadence. |
| `tareq` | Tareq / طارق | Plus by default | Engineering and robotics architect | Reviews code, robotics logic, serverless workflows, and engineering systems with practical debugging steps. | Build/learning room, green glow, technical mono-oriented clarity. |

### Global Persona Behavior Rules

- Arabic-first when Arabic is used; English remains fully supported.
- Keep reflection supportive, non-clinical, and culturally close.
- The first layer is always fit-to-moment: comfort before advice for Listen avatars, structure before motivation for Build avatars.
- End meaningful responses with one small next step when appropriate.
- Do not claim to be a doctor, therapist, lawyer, financial advisor, or emergency responder.
- For medical, legal, financial, or regulated topics, provide general educational framing and encourage qualified professional support when needed.
- For crisis or immediate danger, direct the user to local emergency support instead of trying to resolve it in-app.

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
- PWA install events
- Admin notifications
- Admin gifts and token grants
- Persona access grants
- Lemon Squeezy discount metadata
- Signed-user chat session summaries
- Encrypted audit export

Visitor geography uses Vercel, Cloudflare, and common proxy headers where available. Unknown regions are excluded from the geographic source group in the dashboard.

Tracked event examples:

- `starter_tap`
- `moment_save`
- `tiny_plan`
- `moment_share`
- `app_share`
- `capsule_download`
- `helpful_feedback`
- `softer_feedback`
- `visitor_comment`
- `visitor_name_register`
- `pwa_install`
- `avatar_rating`
- `avatar_generate`
- `chat_session_snapshot`
- `admin_user_gift`
- `admin_persona_grant`
- `admin_persona_grants_set`
- `admin_discount_offer`
- `admin_app_config`
- `admin_notification`

## Story And Image Features

Story Mirror is the main visual storytelling feature:

- Rawiya can turn a feeling into symbolic story panels.
- The receipt/story card extracts explicit story shots from assistant text when present.
- If no explicit shot exists, the app builds symbolic fallback shots from the reflection.
- The Story Mirror Board fetches images from `/api/storyboard/image` with no-store caching.
- The image endpoint attempts configured Google image generation models first.
- If model access is unavailable, it uses a prompt-to-image fallback URL designed to better match the scene text.
- Users can request a new visual variation through the UI.
- Final fallback behavior avoids relying on repeated static images where possible.

Important files:

- `src/app/api/storyboard/image/route.ts`
- `src/components/ChatWindow.tsx`
- `src/lib/gemini.ts`

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

Access implementation notes:

- `User.activeTier` supports `FREE`, `PLUS`, and `BUSINESS`.
- `User.tokenBalance` controls signed-user gift/credit allowance.
- Admin gifts increment `User.tokenBalance`.
- Lifetime Plus emails are handled in `src/lib/lifetimeAccess.ts`.
- Production database inspection requires real Neon credentials; local `.env` may contain placeholder credentials.

## Technical Architecture

Stack:

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

Runtime architecture flow:

1. The browser loads the App Router page and hydrates `AppShell` and `ChatWindow`.
2. `ChatWindow` fetches `/api/configuration` to hydrate reflection limits, global avatar enablement, and tier-specific avatar lists.
3. The user must provide a name before the first chat message. The name is stored locally and tracked with `visitor_name_register`.
4. When the user submits a message, `ChatWindow` chooses the active persona, world, recent context, behavior style, and user display name.
5. `/api/reflect` builds the AI request using Gemini / Vertex AI when available, with local fallback behavior when needed.
6. The assistant response returns text, world, cadence, resources, and safety/paywall hints.
7. `ChatWindow` renders the response with the selected persona's saved avatar, role, environment, cadence, and actions.
8. User actions such as saves, shares, feedback, avatar ratings, comments, and name registration are sent to `/api/events`.
9. Signed-user sessions are stored through `/api/chat-sessions`; profile and token state are read through `/api/profile`.
10. Admin reads aggregated Prisma data server-side, saves runtime configuration as `admin_app_config` events, and can grant gifts, persona access, discounts, notifications, and audit exports.

Data architecture:

- Relational identity and account state live in Prisma/Postgres through `User`, `Account`, `Session`, and `VerificationToken`.
- Flexible analytics and admin configuration live in `InteractionEvent` JSON metadata.
- Visit metadata lives in `VisitorLog`.
- Payment webhook records live in `Transaction`, but payment dashboards remain the financial source of truth.
- Local user artifacts such as saved moments, tiny plans, journey snapshots, quests, and visitor display name are stored in browser `localStorage` unless explicitly saved through account/session flows.

Important source areas:

- `src/app`: App Router pages and API routes.
- `src/components`: public shell, chat, admin client components, notifications, PWA managers, and profile UI.
- `src/lib`: auth, Gemini, personas, worlds, local reflection fallback, Prisma, and local store utilities.
- `prisma/schema.prisma`: users, sessions, accounts, verification tokens, visitor logs, interaction events, transactions, and moment capsules.
- `public/avatars`: companion avatar assets.
- `public/profile-logos`: profile logo choices.
- `docs`: design, deployment, status, product, and submission materials.

Key API routes:

- `/api/reflect`: AI reflection response generation.
- `/api/reflect/video`: video-oriented reflection/story support.
- `/api/storyboard/image`: storyboard scene image generation/fallback.
- `/api/avatar/generate`: custom avatar image generation/fallback.
- `/api/chat-sessions`: signed-user chat session save/load.
- `/api/profile`: account profile and token balance data.
- `/api/configuration`: public runtime experience configuration.
- `/api/admin/configuration`: admin-only configuration, gifts, persona grants, and discount metadata.
- `/api/events`: interaction telemetry.
- `/api/visitors`: visitor tracking.
- `/api/notifications`: in-app notifications.
- `/api/checkout`: payment-provider checkout launcher.
- `/api/webhooks/lemonsqueezy`: Lemon Squeezy entitlement webhook.
- `/api/webhooks/stripe`: Stripe entitlement webhook.
- `/api/webhooks/paddle`: Paddle entitlement webhook scaffolding.
- `/api/version`: production readiness and AI configuration smoke endpoint.

Core Prisma models:

- `User`: profile, email, language, active tier, token balance, Lemon subscription fields, role, registration metadata, and relations.
- `Account`, `Session`, `VerificationToken`: NextAuth persistence.
- `VisitorLog`: visit tracking with location/user-agent/source metadata.
- `InteractionEvent`: flexible telemetry and admin records.
- `Transaction`: internal payment webhook ledger, not the revenue source of truth.
- `MomentCapsule`: saved capsule/print fulfillment scaffold.

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
- Internal transaction rows are not the revenue source of truth. Use the provider dashboard for real revenue.

Recommended payment-provider wording while checkout is not configured:

> Premium access is temporarily paused while live checkout is configured. All core features are available during early access.

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
- `FADFADA_LIFETIME_PLUS_EMAILS` for additional lifetime Plus accounts beyond built-in emails.
- `AUDIT_EXPORT_KEY` for encrypted audit snapshot export.
- `GEMINI_IMAGE_MODEL`, `NANO_BANANA_MODEL`, and storyboard image fallback flags where configured.

## Deployment

Production is deployed on Vercel.

Reliable production deploy command used during the hackathon build:

```bash
npx --yes vercel@54.20.1 deploy --prod --yes --force --archive=tgz --no-wait
```

Normal Vercel deploys from the Windows environment have previously produced `UNKNOWN` / `0ms` deployments. Archive upload mode is the reliable production path for this workspace.

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
$paths = 'omar.png','sami.png','maryam.png','nema.png','sanad.png','rawi.png','mutanabbi.svg','layl.png','nora.png','kareem.png','malik.png','malik_.png','sheikh.png','grandmaster.png','zein.png','logoz.png','screenwriter.png','dania.png','adam.png','ryan.png','layan.png','wamda.png','radar.png','sarah.png','sarah_.png','tareq.png'; foreach ($path in $paths) { $r = Invoke-WebRequest -Uri "https://fad-fada.vercel.app/avatars/$path" -Method Head -UseBasicParsing; "$path $($r.StatusCode) $($r.Headers['Content-Type'])" }
```

## Repository Notes

- Use `apply_patch` or editor-safe writes for Arabic TypeScript/Markdown. Avoid shell writes that can corrupt UTF-8.
- The visible persona list is controlled by `selectorPersonaIds` in `src/components/PersonaDrawer.tsx`, not by the registry alone.
- Avatar asset paths should stay lowercase and Linux-safe.
- Chat session snapshots are stored in `InteractionEvent.metadataJson`; very long histories may be truncated by the current snapshot limit.
- If the PWA cache shows stale production UI, hard refresh or clear site data on the test device.
- Local `.env` may contain placeholder database credentials; production DB inspection requires real Neon credentials.
- For admin charts, trust the auto-refreshing dashboard for product telemetry and trust the payment vendor dashboard for real revenue.
