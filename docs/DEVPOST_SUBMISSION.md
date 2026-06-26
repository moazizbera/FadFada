# Devpost Submission Draft

## Project Name

FadFada | فضفضة

## Tagline

Talk freely. Feel understood. Move forward.

## Short Description

FadFada is a bilingual AI wellbeing companion that gives people a private space to talk through text, voice, or video in English or Arabic. As the user shares, the interface shifts into calm, learning, story, faith, build, celebration, or stillness worlds before the reply appears, helping the person feel understood and turning emotional noise into a clear next step. It is designed as a PWA so users can access it instantly across phones, laptops, tablets, and shared lab machines.

## Inspiration

Many people are not ready for therapy, cannot afford support, feel uncomfortable being judged, or simply need a private first place to speak honestly. FadFada starts from a simple belief: people often need to feel heard before they need advice.

The product is especially focused on Arabic and English users who move between cultures, languages, work pressure, study pressure, family expectations, loneliness, and daily uncertainty. It is not therapy, diagnosis, or emergency care. It is a safe first space for reflection, learning support, and practical life organization.

## What It Does

FadFada lets users choose a conversation style, write or record what is on their mind, and receive a warm same-language response with a small practical plan. The experience includes:

- bilingual English and Arabic interface with RTL/LTR switching
- no mixed Arabic/English screens: each visible surface follows the active language
- professional full-screen chat with sender and companion bubbles
- Daily Pulse check-in that turns mood, energy, and need into one useful next step
- Tiny Plan action that turns any response into saved steps the user can revisit from profile
- fictional personas with non-real stylized portraits
- text, voice, and video reflection modes
- Gemini-powered reflection route on Google Cloud Vertex AI with local fallback
- adaptive expert routing for wellbeing, learning, career, relationships, health, life organization, celebration, and safety
- custom companion creation, avatar ratings, public notices, and saved profile moments
- Learning Room with curated video, article, course, and document-style resources inside the chat
- crisis keyword prototype with safety-first interruption and Find a Helpline routing
- PWA manifest, service worker, app icon, and install prompt UI
- admin analytics, visitor telemetry, notification composer, and avatar rating summaries
- Evidence Room showing PWA readiness, Vertex AI readiness, deployment version, business positioning, and proof signals
- downloadable Evidence Room JSON export for judges and Devpost evidence

## How We Built It

The app is built with Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, NextAuth, Neon Postgres, a web app manifest, and a service worker. The Gemini integration lives behind a server-side `/api/reflect` route and now runs through Google Cloud Vertex AI using Vercel OIDC and Google Workload Identity Federation, so production can use Google Cloud credits without storing service-account JSON keys. If Gemini is not configured or fails during a demo, the app falls back to a local reflection engine so the core experience remains demonstrable.

The product shell was designed around hackathon evidence from day one. Instead of only building a beautiful chat surface, FadFada includes a judge-ready demo path, admin analytics, public notices, avatar ratings, PWA readiness checks, and an internal Evidence Room that can export proof as JSON.

## Gemini Usage

Gemini is used as the reflection and routing layer. The production app is deployed at `https://fad-fada.vercel.app` and currently uses Vertex AI with `gemini-2.5-flash` in `us-central1`. The server prompt asks Gemini to:

- respond in the user's language
- avoid therapy, diagnosis, or emergency-care claims
- reflect the user's emotion naturally
- identify the right expert mode
- produce a concise response and a small next-step plan
- behave as a learning coach when the user asks for study help

Authentication to Google Cloud is keyless: Vercel sends an OIDC token to the serverless function, Google Workload Identity Federation exchanges that token, and the app impersonates a least-purpose service account for Vertex AI access.

The UI also records Gemini readiness as part of the Evidence Room so judges can see where the AI route fits into the product.

## Business Model

FadFada is designed as a real business, not only a demo. The initial validation path is:

- free beta for feedback
- founding beta: $9 one-time early access for 3 months
- later subscription for text, voice, video, memory, and plans
- team wellbeing pilots for universities, communities, and remote teams

The Evidence Room is built to support the business story by collecting local signals such as sessions, feedback, safety events, beta interest, and exportable proof.

## Safety

FadFada is not therapy, not diagnosis, and not emergency care. The product uses safety-first language and includes a crisis keyword prototype. When high-risk language appears, the app interrupts the normal reflection flow and points users toward emergency services, a trusted person, or Find a Helpline.

Production safety work would include a stronger classifier, localized crisis resources, human review workflows, and abuse/immediate-danger routing beyond keyword matching.

## What Makes It Different

- Arabic and English from day one
- text, voice, and video expression in one PWA
- human-feeling personas instead of a generic chatbot
- Learning Room embedded inside emotional support conversations
- safety and non-therapy positioning built into the product
- Evidence Room and export designed for real business validation
- judge-ready demo scenarios that show support, learning, safety, and celebration flows quickly

## Challenges

The hardest product challenge was making the app feel human without pretending to be a therapist. The conversation had to be warm, natural, and useful while staying clear about limitations. Another challenge was keeping video and learning content inside the app without relying on unstable embedded playback; the current version uses stable thumbnails and external playback links when needed.

The technical challenge was balancing a strong demo with a real product direction: PWA install behavior, Gemini fallback, safety flows, responsive chat, Arabic RTL, Learning Room, personas, and evidence collection all had to work together without becoming noisy.

## Accomplishments

- deployed a polished bilingual PWA at `https://fad-fada.vercel.app`
- implemented professional full-screen chat
- added persona selection with stylized non-real portraits
- added text, voice, and video reflection flows
- implemented Gemini server route on Vertex AI with safe fallback
- configured keyless Google Cloud auth through Vercel OIDC and Workload Identity Federation
- added admin analytics, public notifications, profile moments, and avatar ratings
- added crisis interruption prototype
- built an in-chat Learning Room and maximized viewer
- added judge demo scenarios
- built Evidence Room with proof signals and JSON export
- passed lint and production build validation

## What We Learned

A wellbeing product wins trust through restraint. The best response is not always the most advanced analysis; often it is the response that sounds calm, specific, and human. We also learned that business evidence should be visible inside the product early, because judges need to see how the idea becomes a real company.

## What's Next

- expand localized crisis resources and human escalation workflows
- add official cloud speech-to-text and cloud text-to-speech for stronger dialect quality
- connect a Kuwait/GCC-friendly payment provider such as MyFatoorah, Tap, or Paddle
- add secure media storage and longer-term memory controls
- add production-grade safety classifier and localized crisis resources
- record a 3-minute demo video using the live site, admin dashboard, and Evidence Room export

## Suggested Demo Flow

1. Open FadFada and show the calm bilingual landing page.
2. Switch from English to Arabic to show RTL support.
3. Pick a persona and run the pressure support demo scenario.
4. Run the Learning Room scenario and maximize a resource viewer.
5. Run the safety scenario and show crisis interruption behavior.
6. Show voice and video reflection controls.
7. Open Evidence Room and export the JSON evidence file.
8. Close with the founding beta plan and next deployment step.