# FadFada Project Status

## Project Objective

FadFada is a bilingual Arabic/English AI wellbeing companion built as a judge-ready PWA demo. The goal is to give users a private space to express themselves through chat, then make the interface visually understand the moment before the reply appears through world shifts such as calm, story, learning, build, celebration, faith, and stillness.

The current product direction is to preserve a distinctive, non-generic chat experience while proving core hackathon value: emotional support, learning help, safety interruption, in-chat resources, PWA readiness, and exportable evidence for judges.

## Current Feature Status

| Feature | Status | Notes |
|---|---|---|
| Next.js App Router project | Done | App scaffolded with TypeScript, Tailwind CSS, and production build support. |
| Design system implementation | Done | Uses the specified dark visual language, typography, world colors, orb, and no-chat-bubble layout. |
| Bilingual Arabic/English chat | Done | Active language controls the UI direction and visible surfaces; responses preserve the requested language. |
| World shifting UI | Done | Calm, story, poetry, faith, learning, build, celebration, and grief/stillness worlds are implemented. |
| Presence Orb | Done | Orb changes shape/color per world and animates according to the active state. |
| Ambient particles | Done | Canvas particles change by world, including dust, embers, petals, stars, rain, and confetti. |
| Typewriter replies | Done | Assistant replies reveal at each world’s configured speed. |
| Daily Pulse check-in | Done | End users can record mood, energy, and need, then receive a personalized reflection and local streak. |
| Tiny Plans | Done | Users can turn assistant replies into saved action steps and review them from the profile page. |
| World Shift controls | Done | User can reframe the last message into story, poetry, faith, build, or calm. |
| Demo runbook | Done | One-tap support, learning, safety, and bilingual proof scenarios are visible inside the app for reliable demos. |
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
| Gemini integration | Done | Production uses Vertex AI with `gemini-2.5-flash`, Vercel OIDC, and Google Workload Identity Federation. |
| Voice input | Done | Browser recording flow and playback are implemented with dialect-aware speech tuning. |
| Video reflection input | Done | Video/audio reflection route exists with Gemini analysis and fallback behavior. |
| Personas | Done | Built-in fictional companions, custom persona creation, and avatar ratings are implemented. |
| Authentication/database | Done | NextAuth, Prisma, Neon, profiles, admin dashboard, visitor telemetry, events, and notifications are implemented. |
| Deployment | Done | Production is live at `https://fad-fada.vercel.app`. |

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

1. Record the final 3-minute demo from the live production URL.
2. Capture screenshots of chat, Arabic mode, profile, admin analytics, notifications, and Evidence Room export.
3. Add localized crisis resource depth beyond keyword detection.
4. Add official cloud speech-to-text and cloud text-to-speech for stronger Arabic dialect quality.
5. Connect a Kuwait/GCC-friendly payment provider for real founding-beta revenue.
