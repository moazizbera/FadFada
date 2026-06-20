# Deployment Guide

Goal: make FadFada available as a shareable HTTPS mobile PWA for judges, testers, and founding beta users.

## Fastest Path: Vercel

This is the fastest reliable path for a hackathon demo.

1. Push the latest code to GitHub.
2. Open Vercel and import the repository.
3. Select the Next.js preset.
4. Add environment variables:

```env
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-1.5-flash
```

5. Deploy.
6. Open the deployed HTTPS URL on mobile.
7. Test text reflection, Learning Room, safety scenario, Evidence Room export, and PWA install prompt.

## Google Cloud Path

Use this if the submission needs stronger Google Cloud alignment.

Recommended option: Cloud Run.

1. Build the app:

```bash
npm run build
```

2. Create a container image for the Next.js app.
3. Deploy the container to Cloud Run.
4. Configure secrets in Google Secret Manager or Cloud Run environment variables:

```env
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-1.5-flash
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
- note that Gemini is called server-side through `/api/reflect`

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

If `GEMINI_API_KEY` is missing or Gemini fails, the app still responds using the local reflection engine. This is useful for demos, but the final judge demo should use a real Gemini key so the AI integration is visible and defensible.