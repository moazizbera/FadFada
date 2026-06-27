# FadFada Next Session Handoff

## Current Priority

Stabilize the admin/chat UX after recent rapid changes.

Main focus:
- Admin navigation must be clean and header-based.
- Admin users need a clear Chat/Admin switch.
- Gifts must visibly add usable credits to signed users.
- Signed users need session history: new session, save, load.
- Chat history must preserve the avatar/persona used for each message.
- No duplicate Menu/Tools controls.

## Verified Repo Snapshot

Checked on 2026-06-26.

- Branch: `main`
- Latest local commit: `d3ff606 Fix chat sessions and persona history`
- Build command: `npm run build`
- Build status: passes locally
- Current working tree had modified files before this handoff was created:
  - `src/app/admin/dashboard/admin-dashboard-client.tsx`
  - `src/app/api/profile/route.ts`
  - `src/components/AppShell.tsx`
  - `src/components/ChatWindow.tsx`

Trust the filesystem and a fresh build over any previous chat summary.

## First Commands

Run these before making assumptions:

```powershell
git status --short --branch
git log -1 --oneline
npm run build
```

## Key Files

- `src/components/AppShell.tsx`
- `src/components/ChatWindow.tsx`
- `src/app/admin/dashboard/admin-dashboard-client.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/api/admin/configuration/route.ts`
- `src/app/api/chat-sessions/route.ts`
- `src/app/api/profile/route.ts`
- `src/lib/auth.ts`
- `prisma/schema.prisma`

## Avatar / Persona Role Roster

Source of truth: `src/lib/personas.ts`. Current roster has 26 personas. `docs/DESIGN_SPEC.md` still contains an older 9-persona placeholder table, so use the code roster below for implementation decisions.

| ID | English name | Arabic name | Family | Access | Primary world | English role | Arabic role | Avatar path |
|---|---|---|---|---|---|---|---|---|
| `omar` | Omar | عمر | listen | Free | calm | Grounding Friend | الصديق المُنصت والداعم الوجداني | `/avatars/omar.png` |
| `sami` | Uncle Sami | عم سامي | listen | Free | faith | Wise Literary Elder | المستشار الروحي واللغوي الخبير | `/avatars/sami.png` |
| `maryam` | Maryam | مريم | listen | Free | calm | The Sister-Energy Ally | الأخت اللي تسمعك من غير ما تقول 'العادة كذا' | `/avatars/maryam.png` |
| `nema` | Khalti Ne'ma | خالتي نعمة | listen | Free | calm | The Unhurried Anchor | اللي تسمعك وتسكتك بفنجان شاي، مش بنصيحة | `/avatars/nema.png` |
| `sanad` | Sanad | سند | listen | Free | grief | The Pillar in Loss | يقف جنبك في الفقد، من غير عجلة ومن غير كلام جاهز | `/avatars/sanad.png` |
| `rawi` | Rawiya | راوية | listen | Free | story | Story Play Companion | رفيقة الحكاية واللعب التخيلي | `/avatars/rawi.png` |
| `nora` | Nora | نورا | build | Free | build | High-Velocity Action Coach | مُدربة الأداء وهندسة التنفيذ العملي | `/avatars/nora.png` |
| `kareem` | Captain Kareem | كابتن كريم | build | Free | celebration | World Cup Tactical Strategist | مُخطط الأداء النفسي والرياضي للمونديال | `/avatars/kareem.png` |
| `malik` | Malik GamerX | مالك | build | Free | learning | Esports Ally & Gaming Mentor | مُوجّه الألعاب والرياضات الإلكترونية والاحتراق | `/avatars/malik.png` |
| `malik_alt` | Malik (Calm Mode) | مالك (الوضع الهادئ) | listen | Free | calm | Digital Balance Guide | مُوجّه الاسترخاء الرقمي وموازنة الحياة | `/avatars/malik_.png` |
| `logoz` | Logoz | لغز | build | Free | learning | The Puzzle Dissolver | مفكك العقد ومحلل الألغاز والمشاكل الغامضة | `/avatars/logoz.png` |
| `sheikh` | The Silicon Sheikh | مهندس المليار | build | Plus | build | Tech Unicorn Founder | مُخطط تمويل الشركات المليارية والاستراتيجية | `/avatars/sheikh.png` |
| `grandmaster` | The Grandmaster | الأستاذ الكبير | build | Plus | build | Wealth & Startup Architect | مستشار الثروة وبناء الإمبراطوريات التجارية | `/avatars/grandmaster.png` |
| `zein` | Professor Zein | بروفيسور زين | build | Plus | learning | AI Prompt & Research Scientist | عالم أبحاث وهندسة الأوامر الذكية | `/avatars/zein.png` |
| `poetry_bot` | Al-Mutanabbi AI | المتنبي الرقمي | listen | Plus | poetry | Cosmic Wordsmith | مُحاكي الشعر العربي وصياغة القوافي | `/avatars/poetry_bot.png` |
| `screenwriter` | The Screenwriter | المخرج الرقمي | build | Plus | story | Cinematic Storyteller | مُخطط السيناريو والحبكة والإنتاج الإبداعي | `/avatars/screenwriter.png` |
| `dania` | Counselor Dania | المستشارة دانية | build | Plus | build | Venture Legal Strategist | مُستشارة حماية الشركات وعقود الملكية | `/avatars/dania.png` |
| `adam` | Coach Adam | الكوتش آدم | build | Plus | learning | Nutritional Alchemist | مُخطط التغذية الكيميائية والأداء العصبي | `/avatars/adam.png` |
| `ryan` | Dr. Ryan | دكتور ريان | build | Plus | learning | Bio-Hacker & Longevity Optimizer | المهندس الحيوي ومُخطط طول العمر والجهد | `/avatars/ryan.png` |
| `layan` | Dr. Layan | دكتورة ليان | build | Plus | learning | Medical & Bio-Science Innovator | مُخطط أبحاث الصحة والعلوم الحيوية | `/avatars/layan.png` |
| `wamda` | Wamda | ومضة | build | Plus | build | The Innovation Spark | مُولد الأفكار الإبداعية ومحفز العصف الذهني | `/avatars/wamda.png` |
| `radar` | Radar | رادار | build | Plus | build | The Strategy Radar | المحلل الاستراتيجي ومتوقع المخاطر والفرص | `/avatars/radar.png` |
| `layl` | DJ Layl | دي جي ليل | listen | Plus | poetry | Late-Night Sonic Companion | رفيق الليل والبوح الهادئ بالصوت | `/avatars/layl.png` |
| `sarah` | Commander Sarah | كابتن سارة | build | Plus | story | Aerospace & Astronomy Guide | مُخطط علوم الفضاء والفلك والفيزياء | `/avatars/sarah.png` |
| `sarah_alt` | Sarah (Academic Mode) | سارة (الوضع الأكاديمي) | build | Plus | learning | Cosmic Research Director | مُوجّهة الأبحاث الكونية المتقدمة | `/avatars/sarah_.png` |
| `tareq` | Tareq | طارق | build | Plus | build | Structural Engineering Architect | مُخطط البرمجة وهندسة الروبوتات الذكية | `/avatars/tareq.png` |

## Product Rules

Anonymous:
- 5 free replies.
- 4 companions.
- Prompt to sign in.

Signed-in free:
- Uses server `tokenBalance` as gift/credit allowance.
- Admin gifts should increase usable credits immediately.
- More companions than anonymous.

Plus:
- Full companion access.
- Deeper continuity.
- Saved journey positioning.

Admin:
- Admin dashboard remains first tab.
- Admin tabs must be inside/admin header area, not mixed with public chat menu.
- Admin user should easily switch Chat/Admin.

## Verify Existing Work

Check whether these are truly implemented and acceptable in UI:

- `/api/chat-sessions` exists and builds.
- Chat has New session / Save / Load session history.
- User messages show user avatar/logo.
- Assistant messages store and render:
  - `personaId`
  - `personaName`
  - `avatarPath`
  - `world`
- Old assistant messages do not repaint when switching avatar.
- Admin gift form increments `User.tokenBalance`.
- Chat actually reads signed user token balance.
- Public top menu has no duplicate Tools/Menu.

## Verified Source Notes From This Session

- `src/components/AppShell.tsx` has admin-area header tabs and a Chat/Admin switch for `ADMIN` users.
- `src/components/ChatWindow.tsx` defines per-message `personaId`, `personaName`, `avatarPath`, and `world` fields.
- `src/components/ChatWindow.tsx` reads `/api/profile` for signed-user `tokenBalance` and uses it in signed reflection allowance.
- `src/components/ChatWindow.tsx` has signed-user chat session state, `loadChatSessions`, `saveCurrentChatSession`, `startNewChatSession`, and `openChatSession`.
- `src/app/api/chat-sessions/route.ts` saves session snapshots in `InteractionEvent` records with `eventType: "chat_session_snapshot"`.
- `src/app/api/profile/route.ts` exposes `tokenBalance` in GET and POST responses.
- `src/app/api/admin/configuration/route.ts` increments `User.tokenBalance` for `add_gift` and records `admin_user_gift` events.
- `prisma/schema.prisma` has `User.tokenBalance Int @default(3)` and `InteractionEvent` available for admin/session snapshots.
- `src/app/admin/dashboard/admin-dashboard-client.tsx` includes explicit gift explanation text: gifts increase database token balance and users may need refresh if the app is already open.

## Current Known Risk

Previous session summaries may be inaccurate. Trust the filesystem and build output first.

Even though the build passes, visually verify the production UX because the user reported mismatches in production:
- Admin tabs may still feel cramped on small screens.
- The public header may still need visual polish if Start/Avatars plus account/admin controls feel like duplicate navigation.
- Gift credits are read from profile on load; if the user is actively chatting, they may need refresh before seeing new balance.
- Chat session snapshots are stored in `InteractionEvent.metadataJson` and sliced to 12,000 characters; long histories may be truncated.

## Validation

Before deploy:

```powershell
npm run build
```

## Deploy

```powershell
npx --yes vercel@54.15.1 deploy --prod
```

## Push If Requested

```powershell
git add -A
git commit -m "Polish admin navigation and session history"
git push origin main
```