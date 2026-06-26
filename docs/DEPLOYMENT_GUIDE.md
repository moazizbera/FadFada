# Deployment Guide

Goal: keep FadFada available as a shareable HTTPS mobile PWA for judges, testers, and founding beta users.

Current production URL:

```text
https://fad-fada.vercel.app
```

## Fastest Path: Vercel

This is the active production path for the hackathon demo.

1. Push the latest code to GitHub.
2. Open Vercel and import the repository.
3. Select the Next.js preset.
4. Add environment variables. Current production uses Google Cloud Vertex AI through keyless Workload Identity Federation:

```env
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=fadfada-499619
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
GCP_PROJECT_NUMBER=289939931604
GCP_SERVICE_ACCOUNT_EMAIL=fadfada-vertex-ai@fadfada-499619.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel-pool
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
```

Keep `GEMINI_API_KEY` only as a fallback while Vertex is being verified. Production should prefer Vertex AI so usage flows through Google Cloud billing and credits.

5. Deploy.
6. Open the deployed HTTPS URL on mobile.
7. Test text reflection, Learning Room, safety scenario, Evidence Room export, and PWA install prompt.

## Google Cloud Path

Use this later if the product moves from Vercel Functions to Cloud Run. The current app already has Google Cloud alignment through Vertex AI, Vercel OIDC, and Workload Identity Federation.

Recommended option: Cloud Run.

1. Build the app:

```bash
npm run build
```

2. Create a container image for the Next.js app.
3. Deploy the container to Cloud Run.
4. Configure secrets in Google Secret Manager or Cloud Run environment variables:

```env
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=fadfada-499619
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
```

5. Enable HTTPS through the Cloud Run URL or a custom domain.
6. Use Google Cloud logs as evidence for Gemini route traffic and production access.

## Required Mobile QA

Before recording the final demo, test on at least one real phone or Chrome device emulation.

- Open the app over HTTPS.
- Confirm the mobile bottom dock is visible.
- Tap Text, Voice, Video, and language switch.
- Start a text reflection and confirm full-screen chat opens.
- Switch to Arabic and confirm RTL layout.
- Run the Learning Room demo scenario.
- Run the safety demo scenario.
- Open Evidence Room and export JSON.
- Check install behavior:
  - Android Chrome: browser menu or install prompt.
  - iOS Safari: Share -> Add to Home Screen.
  - Desktop Chrome/Edge: install icon in address bar when available.

## Judge Demo URL Checklist

The final submission should include:

- public HTTPS app URL
- GitHub repository URL
- Devpost write-up
- 3-minute demo video
- Evidence Room JSON export
- screenshots of mobile UI, Learning Room, safety flow, and Evidence Room
- note that Gemini is called server-side through `/api/reflect` on Vertex AI

## Smoke Test Script

Use this manual sequence after deployment:

1. Open the deployed URL on mobile.
2. Tap Text in the mobile dock.
3. Send: `I want to study creating AI agents. How can you help me?`
4. Expected: FadFada replies with concrete agent-building help, not generic pressure language.
5. Tap Arabic.
6. Send: `محتاج أتعلم أعمل وكلاء ذكاء اصطناعي`.
7. Expected: Arabic response with practical learning/project steps.
8. Run the safety demo scenario.
9. Expected: normal chat is interrupted with safety-first guidance and crisis resource link.
10. Export Evidence Room JSON.

## Fallback Behavior

If Vertex AI is unavailable or Gemini fails, the app still responds using the local reflection engine. This keeps the demo resilient, but the final judge demo should show `source: gemini` from `/api/reflect` and the Evidence Room Vertex readiness line.