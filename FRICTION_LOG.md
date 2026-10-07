# FadFada Friction Log — Amazon Alexa+ Family Flow

Purpose: honest notes about what did and did not work while building the Alexa+ submission, plus how each friction point was resolved. Submitted as part of the Amazon Developer Hackathon entry.

## 1. Local development database was a placeholder

- **Friction:** `.env` pointed Prisma at a placeholder `HOST.neon.tech` connection string. Auth-protected routes returned redirects/401 locally, so the Family Flow UI and parent API could not be exercised against local data.
- **Resolution:** Used the production database for verification instead. Pushed the work, configured the two MCP environment variables in Vercel, deployed, and ran all smoke checks against production. Local-harness screenshots are a future improvement rather than a blocker.

## 2. MCP endpoint returned 406 with the first client request

- **Friction:** A raw HTTP request without an `Accept: application/json, text/event-stream` header was rejected with 406 by the Streamable HTTP transport. This is correct spec behavior, but the error alone did not say why.
- **Resolution:** Read the SDK transport source and the `2025-11-25` spec notes; included the required `Accept` header on the client. Smoke client now sends the header.

## 3. Reusing authenticated sessions headlessly

- **Friction:** The MCP server is bearer-auth so it was easy to smoke-test. The parent UI API uses a NextAuth session cookie; JWT sessions are encrypted, so a child-mode session cannot be forged with curl.
- **Resolution:** Exercised the parent API through the real credentials sign-in flow (the email-signup provider is passwordless) and verified cross-surface persistence. Child-mode isolation is covered by unit tests; the visual child-mode check will be shown in the recorded demo.

## 4. Streamable HTTP + serverless function lifetime

- **Friction:** An MCP session can span long-lived streaming, while Vercel serverless functions prefer short-lived requests. Long-lived SSE is not a fit for every serverless deployment.
- **Resolution:** Kept the MCP server stateless per request: each request performs its own connection, operation, and close (the route connects the server, handles the request, closes the transport). Routine state lives in the event store, not in the server session. This is reliable on serverless and matches how an Alexa+ caller opens one JSON-RPC request at a time.

## 5. Approval reset semantics (the good kind of friction)

- **Friction:** Early in design, rescheduling a routine kept its approved state, which would let a changed child-facing plan reach a child without a fresh parent decision.
- **Resolution:** Made any material change (total time, task, subject) return the routine to `awaiting_parent_approval` while preserving completed steps. Unit-tested; demonstrated live in production.

## 6. Judge-accessible evidence vs. ignored files

- **Friction:** Internal docs live in `docs/`, which is gitignored, so they would not reach judges through the repository.
- **Resolution:** Created `CHANGELOG.md` and `FRICTION_LOG.md` at the repository root so the dated change log and this log are accessible to judges. Architecture diagram is documented in the README.

## What worked well

- Deterministic routine engine made behavior easy to test and easy to explain (time budget + steps + approval state).
- Append-only event persistence meant MCP and the parent UI stayed consistent with no schema migration.
- Sharing one parent-scoped event store between a voice-agent MCP server and the human parent UI demonstrated a real multi-surface agentic loop.