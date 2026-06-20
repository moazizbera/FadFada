# FadFada Project Status

## Project Objective

FadFada is a bilingual Arabic/English AI wellbeing companion built as a judge-ready PWA demo. The goal is to give users a private space to express themselves through chat, then make the interface visually understand the moment before the reply appears through world shifts such as calm, story, learning, build, celebration, faith, and stillness.

The current product direction is to preserve a distinctive, non-generic chat experience while proving core hackathon value: emotional support, learning help, safety interruption, in-chat resources, PWA readiness, and exportable evidence for judges.

## Current Feature Status

| Feature | Status | Notes |
|---|---|---|
| Next.js App Router project | Done | App scaffolded with TypeScript, Tailwind CSS, and production build support. |
| Design system implementation | Done | Uses the specified dark visual language, typography, world colors, orb, and no-chat-bubble layout. |
| Bilingual Arabic/English chat | In progress | Local engine responds in Arabic or English based on user input. More natural language coverage still needed. |
| World shifting UI | Done | Calm, story, poetry, faith, learning, build, celebration, and grief/stillness worlds are implemented. |
| Presence Orb | Done | Orb changes shape/color per world and animates according to the active state. |
| Ambient particles | Done | Canvas particles change by world, including dust, embers, petals, stars, rain, and confetti. |
| Typewriter replies | Done | Assistant replies reveal at each world’s configured speed. |
| World Shift controls | Done | User can reframe the last message into story, poetry, faith, build, or calm. |
| Local fallback engine | In progress | Handles story, learning, plans, translation-style follow-ups, safety, and repeated requests without Gemini. |
| Story mode | In progress | Supports generic stories and a specific Mohamed Ali Basha historical story path. Needs broader topic coverage. |
| Learning Room | In progress | Returns topic-aware video/article/document resource cards inside the chat. |
| In-chat resource cards | In progress | Video uses a stable preview/search card; article and document resources stay topic-aware inside chat. |
| PDF/document support | Partial | Uses in-chat topic note sheets. Real curated PDFs can be added later. |
| Video support | Partial | Avoids unreliable embedded YouTube playback; opens externally when playback is needed. |
| Safety interruption | Prototype | Crisis keywords route to stillness/grief with calm emergency and helpline guidance. |
| Evidence Room | Done | Tracks sessions, messages, safety events, resource events, worlds visited, and exports JSON evidence. |
| PWA manifest and icon | Done | Manifest, icon, and service worker shell exist. |
| Service worker | In progress | Production registration exists; dev unregisters old workers to avoid stale hydration/cache issues. |
| Dev/build stability | Done | Dev and production outputs are separated using `.next-dev` and `.next`. |
| Gemini integration | Not started in code | Devpost describes it, but current implementation is local fallback only. |
| Voice input | Not started | Mentioned in product concept; not implemented yet. |
| Video reflection input | Not started | Mentioned in product concept; not implemented yet. |
| Personas | Not started | Design spec defines persona data, but UI/persona selection is not implemented yet. |
| Authentication/database | Not started | Future production step. |
| Deployment | Not started | Ready to deploy after final demo hardening. |

## Demo-Ready Flows

- Ask for a story: `i need amazing story`
- Continue the same story mode: `another one` or `continue`
- Ask for a historical story: `tell me old story about Mohamed Ali Basha`
- Translate/retell previous answer: `convert arabic`
- Ask for study help: `can you help me to study english`
- Ask for a subject plan: `i mean plan for english`
- Ask for material: `is there any video for Mohamed Ali Basha`
- Trigger safety prototype with crisis language
- Open Evidence Room and export JSON

## Immediate Next Priorities

1. Add Gemini `/api/reflect` route with local fallback preserved.
2. Add persona selection using the design spec’s fictional companion identities.
3. Add voice input controls as a demo-visible prototype.
4. Improve topic coverage for historical stories and learning resources.
5. Deploy to Vercel or Google Cloud and record the 3-minute demo video.
