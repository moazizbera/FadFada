# Vercel Support Packet: Production Deployments Stuck at UNKNOWN

Date: 2026-07-03
Project: moazizberas-projects/fad-fada
Project ID: prj_MtafHIGrmKtWViUIXuymbUDC1Keb
Team: moazizberas-projects

## Summary
Production deployments are consistently created but never enter a real build phase.
They remain in status `UNKNOWN` with build duration `0ms` and no usable build logs.
This started after previously healthy deploys and now reproduces on every deployment, including a verified minimal clean branch.

## Impact
- New production code cannot be released.
- Canonical production domain remains on old release (`0.1.61`).
- Critical release (`0.1.62`) blocked.

## Current Known-Good / Known-Bad
- Last known good deploys: about 2 days ago, status `Ready`, duration ~47s–57s.
- Current deploys: all `UNKNOWN`, duration `?`, build shown as `.[0ms]` in inspect.

## Evidence (CLI)

### 1) Project runtime configuration is set to Node 22.x
Command:
`npx vercel project inspect fad-fada | findstr /I "Node.js Version"`

Observed:
- `Node.js Version             22.x`

### 2) Latest production deployment is UNKNOWN with 0ms build
Command:
`npx vercel inspect https://fad-fada-2kjkrnlhu-moazizberas-projects.vercel.app`

Observed:
- id: `dpl_EwAEMEATeAPHBi7jB2wwzyWa4FmY`
- status: `UNKNOWN`
- Builds:
  - `. [0ms]`

### 3) Repeated UNKNOWN statuses in production list
Command:
`npx vercel ls --prod`

Observed (top entries):
- `https://fad-fada-2kjkrnlhu-moazizberas-projects.vercel.app` -> `UNKNOWN`
- `https://fad-fada-44pqfsfsf-moazizberas-projects.vercel.app` -> `UNKNOWN`
- `https://fad-fada-6a02ckult-moazizberas-projects.vercel.app` -> `UNKNOWN`
- `https://fad-fada-i22mqqmv1-moazizberas-projects.vercel.app` -> `UNKNOWN`
- `https://fad-fada-ra6mytwqq-moazizberas-projects.vercel.app` -> `UNKNOWN`
(and more)

### 4) Canonical production still serves old version
Command:
`Invoke-RestMethod -Uri https://fad-fada.vercel.app/api/version | ConvertTo-Json -Depth 5`

Observed:
- `packageVersion: 0.1.61`
- `commitSha: 92d9b51f3ed15cead65c3f56aed39fc7d9a5e3a8`

### 5) Build command simplification did not change UNKNOWN behavior
The Vercel build command was simplified to `npm run build` and another production deploy was attempted.

Command:
`npx vercel deploy --prod --yes --logs`

Observed:
- URL: `https://fad-fada-iqt9t7n4q-moazizberas-projects.vercel.app`
- id: `dpl_2aHufcTNKdi39PLD7hnLrtJJ63WZ`
- status: `UNKNOWN`
- Builds:
   - `. [0ms]`

This indicates the deployment still does not reach the project build command.

### 6) Local prebuilt workaround is blocked by Vercel CLI shell spawning
Attempted to bypass remote builds with:
`npx vercel build --prod`

Observed on Windows:
- Vercel CLI detects Next.js and starts dependency installation.
- When running the configured build command, it fails with `Error: spawn cmd.exe ENOENT`.
- `cmd.exe` is present at `C:\WINDOWS\system32\cmd.exe`, and direct `cmd.exe /c "npm run build -- --help"` succeeds.

This blocks `vercel deploy --prebuilt --prod` from this Windows environment, but is separate from the remote `UNKNOWN` deployments.

## Clean-Branch Isolation Test (Critical)
To eliminate repository/worktree noise, we created a fresh release branch from remote main and deployed only minimal intended release changes.

Branch:
- `release/0.1.62-clean`

Commit:
- `c6a2273` (`Release 0.1.62: avatarsEnabled toggle and gated persona UI`)

Files changed in clean commit (9 files only):
- `.vercelignore`
- `package-lock.json`
- `package.json`
- `public/sw.js`
- `src/app/admin/dashboard/admin-dashboard-client.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/api/admin/configuration/route.ts`
- `src/app/api/configuration/route.ts`
- `src/components/ChatWindow.tsx`

Local validation on this exact branch:
- `npm run build` passed successfully.

Result:
- Deployment still became `UNKNOWN` with `0ms` build.

Conclusion from isolation:
- This does not appear to be caused by repository diff quality or accidental local file noise.
- Likely project/account/infrastructure-side issue in Vercel deployment scheduling/acceptance.

## Reproduction Steps
1. Run:
   - `npx vercel deploy --prod --yes --logs`
2. Observe CLI prints Inspect + Production URL + spinner `Building…`.
3. Run:
   - `npx vercel inspect <deployment-url>`
4. Observe deployment remains:
   - `status UNKNOWN`
   - `Builds: . [0ms]`
5. Run:
   - `npx vercel ls --prod`
6. Observe repeated UNKNOWN for newest deploys.

## Requested Help
Please investigate the backend reason these deployments are accepted as records but never scheduled/executed as real builds.
Specifically requesting:
- Internal scheduler/error logs for deployment IDs showing `UNKNOWN` + `0ms` build.
- Any project/account flags, policy gates, queue issues, or abuse/risk controls causing silent pre-build rejection.
- Confirmation if project should be migrated/reset internally.
- Recommended corrective action to restore normal build scheduling.

## Primary Deployment IDs To Inspect
- `dpl_2aHufcTNKdi39PLD7hnLrtJJ63WZ` (latest deploy after build-command simplification)
- `dpl_EwAEMEATeAPHBi7jB2wwzyWa4FmY` (latest clean-branch test)
- `dpl_ATLQTvhFKXXNYSEc8ND5Da2hchQF` (earlier affected deploy)

## Contact Notes
User has already aligned Node runtime to 22.x and verified local production build success.
Issue persists across multiple deploy attempts and configuration simplifications.
