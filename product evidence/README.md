# Product Evidence

This folder is the submission evidence index for FadFada. It points judges to production proof that the product is deployed, AI workflows are running, dashboards exist, and parent/child playbooks are implemented beyond a mockup.

## Live Production App

- Production URL: https://fad-fada.vercel.app
- Repository: https://github.com/moazizbera/FadFada

## Production And Deployment Evidence

- Deployment log: [`../deploy-output.txt`](../deploy-output.txt)
- Deployment test log: [`../deploy-test.txt`](../deploy-test.txt)
- Vercel configuration: [`../vercel.json`](../vercel.json)
- Next.js production config: [`../next.config.mjs`](../next.config.mjs)

## AI / Gemini API Evidence

- Gemini integration route: [`../src/app/api/reflect/route.ts`](../src/app/api/reflect/route.ts)
- Gemini helper library: [`../src/lib/gemini.ts`](../src/lib/gemini.ts)
- Parent/child identity resolver: [`../src/lib/workspaceIdentity.ts`](../src/lib/workspaceIdentity.ts)
- Parent/child isolation tests: [`../src/lib/workspaceIdentity.test.ts`](../src/lib/workspaceIdentity.test.ts)
- Package scripts and test setup: [`../package.json`](../package.json)

AI is live in production through Google Cloud Vertex AI / Gemini 2.5 Flash. The main reflection route sends active language, companion, workspace mode, emotional context, and recent conversation context to Gemini. Parent homework transformation also uses Gemini multimodal understanding and structured JSON outputs.

## Parent / Child Production Workflow Evidence

- Core chat and role-aware UI: [`../src/components/ChatWindow.tsx`](../src/components/ChatWindow.tsx)
- Parent homework APIs: [`../src/app/api/parent/homework`](../src/app/api/parent/homework)
- Child homework APIs: [`../src/app/api/child/homework`](../src/app/api/child/homework)
- Child mission APIs: [`../src/app/api/child/missions`](../src/app/api/child/missions)
- Parent pulse APIs: [`../src/app/api/parent/pulse`](../src/app/api/parent/pulse)
- Parent playbook APIs: [`../src/app/api/parent/playbook`](../src/app/api/parent/playbook)
- Parent return-code APIs: [`../src/app/api/parent/return-code`](../src/app/api/parent/return-code)

These files show that parent tools, child workspace mode, homework transformation, parent playbooks, return-code control, and child-safe context are implemented as real product flows.

## Dashboard And Screenshot Evidence

- Admin dashboard screenshot: [`../docs/screenshots/2026-07-23-fresh/admin-dashboard-fresh.png`](../docs/screenshots/2026-07-23-fresh/admin-dashboard-fresh.png)
- Evidence Room screenshot: [`../docs/screenshots/2026-07-23-fresh/evidence-room-fresh.png`](../docs/screenshots/2026-07-23-fresh/evidence-room-fresh.png)
- Lemon Squeezy dashboard screenshot: [`../docs/Temp/lemonsqueez__dashboard.png`](../docs/Temp/lemonsqueez__dashboard.png)
- Parent dashboard screenshot: [`../scripts/demo-output/shots-full/19-parent-dashboard.png`](../scripts/demo-output/shots-full/19-parent-dashboard.png)
- Full demo screenshot folder: [`../scripts/demo-output/Screens`](../scripts/demo-output/Screens)

## Demo Script And Video Evidence

- 20-screenshot narration guide: [`../scripts/demo-output/screens-transcript.md`](../scripts/demo-output/screens-transcript.md)
- Parent/child dialogue transcript: [`../scripts/demo-output/parent-child-dialogue-transcript.md`](../scripts/demo-output/parent-child-dialogue-transcript.md)
- Parent voice sample transcript: [`../scripts/demo-output/test-parent.txt`](../scripts/demo-output/test-parent.txt)
- Child voice sample transcript: [`../scripts/demo-output/test-child.txt`](../scripts/demo-output/test-child.txt)

## Submission Folder URL

Use this URL after pushing the folder to GitHub:

https://github.com/moazizbera/FadFada/tree/main/product%20evidence

If the branch is not `main`, replace `main` with the submitted branch name.
