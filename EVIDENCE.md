# FadFada — Alexa+ Submission Evidence

Real, reproducible evidence for the Amazon Developer Hackathon 2026 (Alexa+ track).
All MCP traffic below is against the live production endpoint
`https://fad-fada.vercel.app/api/mcp/family-flow` (Streamable HTTP, protocol `2025-11-25`).
The bearer token is **redacted**; it is stored as the sensitive Vercel environment variable
`FAMILY_FLOW_MCP_TOKEN` and in a gitignored local file. No secrets or personal data appear here.

**Verification runs.** Sections 1–6, 9 and 10 were re-executed for the AWS/Alexa+ connectivity
audit on **2026-10-20T18:37–18:42Z** (results below reflect that run); the original run was
2026-10-19T18:43–18:48Z. Sections 11–13 record the AWS-infrastructure findings of the same audit.

> **Label discipline.** Everything in sections 1–6 is a **direct HTTP/MCP probe of a
> self-hosted server**. It is *not* an end-to-end test through an Alexa+ device or the Alexa+
> developer console — that is impossible for any hackathon entrant (see section 13).

How to reproduce (read-only steps are safe; the lifecycle step writes to the demo parent's own record):

```bash
# Authorization
TOKEN="$(cat .env.mcp-token)"

# 1. Handshake
curl -sS -X POST https://fad-fada.vercel.app/api/mcp/family-flow \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"verify","version":"1.0"}}}'
```

---

## 1. MCP `initialize` — protocol handshake

Request (Streamable HTTP POST, `Accept: application/json, text/event-stream`):

```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize",
  "params": { "protocolVersion": "2025-11-25", "capabilities": {},
              "clientInfo": { "name": "opencode-verify", "version": "1.0" } } }
```

Response — HTTP **200**, `protocolVersion` `2025-11-25`:

```json
{ "result": { "protocolVersion": "2025-11-25",
              "capabilities": { "tools": { "listChanged": true } },
              "serverInfo": { "name": "fadfada-family-flow", "version": "0.1.112" } },
  "jsonrpc": "2.0", "id": 1 }
```

## 2. MCP `tools/list` — tool discovery

Request: `{ "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {} }`

Response — HTTP **200**, four tools with JSON Schemas:

| Tool | Input schema (key fields) | Runtime hook |
| --- | --- | --- |
| `get_family_routine` | `childProfileId` (uuid) | ownership-checked read |
| `create_family_routine` | `childProfileId`, `subject` (enum math/english/arabic/mixed), `detectedTask` (1–160), `totalMinutes` (int 5–45) | always `awaiting_parent_approval` |
| `reschedule_family_routine` | `childProfileId`, `totalMinutes` (int 5–45) | rebuilds steps, **resets approval** |
| `approve_family_routine` | `childProfileId` | records explicit parent approval |

The server imports and calls the official `@modelcontextprotocol/sdk` (`McpServer` +
`WebStandardStreamableHTTPServerTransport`) in `src/lib/familyFlowMcp.ts` and
`src/app/api/mcp/family-flow/route.ts` — satisfying the rules' "imported and actually called"
runtime-technology requirement.

## 3. MCP `tools/call` — `get_family_routine` (read-only)

Response — HTTP **200** (persisted routine read back from the append-only event store):

```json
{ "result": { "content": [ { "type": "text", "text":
  "{\"routineId\":\"9c4de5b0-0f17-4aee-9d3c-399baa2c5314\",\"updatedAt\":\"2026-10-11T19:10:20.885Z\",\"routine\":{\"childProfileId\":\"c4b62424-4246-4acd-9ad4-acfc5f4b6d8f\",\"subject\":\"math\",\"detectedTask\":\"Finish worksheet fractions 1-10\",\"totalMinutes\":10,\"status\":\"approved\",\"revision\":2,\"steps\":[{\"id\":\"settle\",\"kind\":\"settle\",\"title\":\"Settle in\",\"durationMinutes\":2,\"completed\":true},{\"id\":\"practice\",\"kind\":\"practice\",\"title\":\"Guided practice\",\"durationMinutes\":6,\"completed\":true},{\"id\":\"review\",\"kind\":\"review\",\"title\":\"Parent review\",\"durationMinutes\":2,\"completed\":false}]}}"
  } ] }, "jsonrpc": "2.0", "id": 4 }
```

Confirms cross-surface persistence: a routine created/rescheduled/approved earlier is still
present with the correct status and revision.

## 4. Authentication enforced — missing bearer token

Request with no `Authorization` header → HTTP **401**:

```json
{ "error": "UNAUTHORIZED" }
```

## 5. Authorization enforced — non-owned child

`tools/call` `create_family_routine` with a `childProfileId` the bound parent does not own:

```json
{ "result": { "content": [ { "type": "text", "text": "CHILD_PROFILE_NOT_FOUND" } ],
              "isError": true }, "jsonrpc": "2.0", "id": 5 }
```

Returned as a tool-level error (no stack trace, no internal detail). Ownership is enforced
server-side inside every tool handler.

## 6. Workspace isolation — child-mode sessions rejected

`scripts/verify-parent-guards.ts` signs in, switches the session to **child mode**, then
probes each parent-only route and asserts `403 PARENT_WORKSPACE_REQUIRED` (with
`/api/parent/return-code` intentionally `200` as the documented child-exit path).

Last run against production: **2026-10-20T18:39:08Z** (previous 2026-10-19T18:48:13Z) —
identical result, **ALL GUARDS OK**:

```
parent login: ok workspace=parent
child switch: workspace=child
PASS GET  /api/parent/child            -> 403
PASS GET  /api/parent/family-flow      -> 403
PASS POST /api/parent/family-flow      -> 403
PASS POST /api/parent/homework         -> 403
PASS GET  /api/parent/homework/status  -> 403
PASS POST /api/parent/playbook         -> 403
PASS GET  /api/parent/pulse            -> 403
PASS GET  /api/parent/weekly-report    -> 403
PASS GET  /api/profile                 -> 403
PASS POST /api/profile                 -> 403
PASS GET  /api/parent/return-code      -> 200

ALL GUARDS OK
```

## 7. State-machine correctness

Unit tests (`src/lib/familyFlow.test.ts`, `vitest run`): **15 passed**. Key invariants covered:
- step completion is a no-op while `awaiting_parent_approval`;
- `completed` is reached only after every **approved** step is done;
- `approve` is a no-op on a routine that is not awaiting approval;
- rescheduling an `approved` routine returns it to `awaiting_parent_approval` and re-approval is required;
- unknown step ids are ignored; unreasonable durations are clamped (5–45, default 15);
- a routine never contains child answer content.

The API additionally rejects `complete_step` on a non-approved routine with `409 ROUTINE_NOT_APPROVED`.

**Enforcement is in production code** (not only tests) — read at the 2026-10-20 audit:

| Invariant | Location |
| --- | --- |
| approve is a no-op unless awaiting | `src/lib/familyFlow.ts:51` (`if (routine.status !== "awaiting_parent_approval") return routine;`) |
| step completion requires an approved routine | `src/lib/familyFlow.ts:76` (`if (routine.status !== "approved") return routine;`) |
| unknown step ids ignored | `src/lib/familyFlow.ts:77` |
| `completed` only when every step is done | `src/lib/familyFlow.ts:82` |
| reschedule preserves progress and resets approval | `src/lib/familyFlow.ts:63-71` (revision + 1 → `awaiting_parent_approval`) |
| API 409 for completing a non-approved routine | `src/app/api/parent/family-flow/route.ts:84-88` |
| ownership scoping (MCP tools) | `src/lib/familyFlowMcp.ts:71-76`, `:80-83`, `:97-101` |
| ownership scoping (parent API) | `src/app/api/parent/family-flow/route.ts:112-114`, `:119-121` |

Not re-executed in production this session: creating a routine and calling `complete_step`
against it would **mutate** the demo parent's record, so the write paths were verified by
engine unit tests + code inspection rather than by a live mutating probe.

## 8. Build verification (local)

```
npm run typecheck   # tsc --noEmit  -> pass
npm test            # vitest run    -> 15/15 pass
npm run build       # next build    -> pass; /api/alexa/family-flow and /api/mcp/family-flow routes compiled
npm run lint        # unavailable: no ESLint config (next lint prompts interactively)
```

## 9. Deployment status

**Re-verified 2026-10-20T18:42:51Z** — identity **unchanged** since 2026-10-19
(originally 2026-10-19T18:46:49Z): no new deployment has occurred.

Checked from a clean working tree; local branch `release/0.1.62-clean`, fully pushed
(0 ahead / 0 behind `origin`) and set as the **GitHub default branch**.

**Which revision is live.** `GET https://fad-fada.vercel.app/api/version` →
HTTP **200**:

```json
{ "app": "FadFada | فضفضة", "version": "0.1.112-GehxmDh", "packageVersion": "0.1.112",
  "commitSha": "b9b0351e919bdbc02cbb8b97bbdfc840dc8bb242",
  "deploymentId": "dpl_GehxmDhec6djkcCnzS6ZkWMLvzj8",
  "ai": { "provider": "api_key", "model": "gemini-2.5-flash", "location": null, "keylessAuth": false },
  "trust": { "workspaceIsolation": true, "parentReturnServerVerification": true,
             "safeSessionSnapshotStorage": true, "notificationsFailSoft": true },
  "checkedAt": "2026-10-20T18:42:51.451Z" }
```

The deployed commit `b9b0351` ("Add Family Flow routine engine, parent API, and MCP server",
2026-10-07) **is an ancestor of HEAD**. HEAD is **6 commits ahead** of it — so the latest
commits are **not deployed**. The `ai.location: null` field is the serverless Gemini key
config and is **not** an AWS region reference.

**Verified live in production** (2026-10-20T18:37–18:42Z):

- `POST /api/mcp/family-flow` `initialize` with bearer token → HTTP **200**,
  `protocolVersion 2025-11-25`, `serverInfo { "fadfada-family-flow", "0.1.112" }`.
- Same request with **no** `Authorization` → HTTP **401** `{"error":"UNAUTHORIZED"}`.
- `tools/list` → HTTP **200**, four tools with JSON Schemas.
- `tools/call get_family_routine` → HTTP **200**, persisted routine read back.
- `tools/call create_family_routine` with a non-owned child → `isError: true`,
  `CHILD_PROFILE_NOT_FOUND` (rejected; nothing written).
- Response headers carry only the MCP CORS allowances (`Access-Control-Allow-Origin: *`,
  allow/expose `mcp-protocol-version`, `mcp-session-id`). The server **does not emit a
  `mcp-protocol-version` response header** — permitted in stateless mode, noted as a minor
  spec-hygiene gap.
- `GET /api/alexa/family-flow` → HTTP **404** (route not in the running deployment).
- `scripts/verify-parent-guards.ts` (2026-10-20T18:39:08Z) → **ALL GUARDS OK** (section 6).

**Verified locally on the HEAD build** (`next build` + `next start`, port 3100):

- `GET /` → HTTP **200**.
- `GET /api/alexa/family-flow` → HTTP **405** (route **exists**, POST-only) — vs the 404 in
  the stale production deployment. This is the proof the deployed build predates the route.
- `GET /api/mcp/family-flow` (no `FAMILY_FLOW_MCP_TOKEN` in local env) → HTTP **503**
  `{"error":"MCP_NOT_CONFIGURED"}` — fails closed when unconfigured.

**Not yet in production** (ships with the next Vercel deploy of the default branch):

- `GET /api/alexa/family-flow` — the in-app web MCP console proxy (compiled; 405 locally).
- The approval-guard fix (`complete_step` → `409 ROUTINE_NOT_APPROVED`) in
  `src/lib/familyFlow.ts` + `/api/parent/family-flow`.
- These are feature-deployment items, **not** eligibility blockers: the repository
  requirements (public, detectable MIT license at `license.key: mit`, runtime-hooked MCP
  code) are already satisfied on the default branch.

## 10. Local build/test results

Run **2026-10-20T18:39Z** (identical to the 2026-10-19 run):

```
npm run typecheck   # tsc --noEmit  -> pass (exit 0)
npm test            # vitest run    -> 15/15 pass (familyFlow 10 + workspaceIdentity 5)
                    #                    Test Files 2 passed (2); Duration 23.28s
npm run build       # next build    -> pass (42 routes); /api/alexa/family-flow,
                    #                            /api/mcp/family-flow, /api/parent/family-flow compiled
npm run lint        # unavailable: no ESLint config (next lint would prompt interactively)
```

Local server spot-check (`next build` + `next start`, port 3100, 2026-10-19):
`GET /` → 200; `GET /api/alexa/family-flow` → **405** (route exists, POST-only) vs the
**404** in production; `GET /api/mcp/family-flow` without a configured token → **503
`{"error":"MCP_NOT_CONFIGURED"}`** (fails closed).

---

## 11. AWS infrastructure — evidence of *absence*

Audit run **2026-10-20**. Expected if an AWS integration existed: an AWS SDK dependency, an
`aws`/`@aws-sdk` import in `src/`, an `amazonaws.com` endpoint or `arn:aws` resource
identifier, an AWS credential environment variable, or IaC referencing AWS. **Actual: none.**

| Probe | Command / location | Expected | Actual |
| --- | --- | --- | --- |
| AWS SDK dependency | `package.json` dependencies | `@aws-sdk/*` | **absent** (only `@neondatabase/serverless`) |
| AWS SDK in the resolved tree | `npm ls @aws-sdk/client-lambda @aws-sdk/client-s3 @aws-sdk/client-bedrock-runtime` | present | **`-- (empty)`** |
| AWS terms in source | `git grep -iE 'aws sdk\|@aws-sdk\|amazon bedrock\|aws lambda\|dynamodb\|api gateway\|secrets manager\|s3 bucket\|arn:aws\|amazonaws.com\|boto3'` | matches | **zero matches** across all tracked files |
| Literal `aws` in `src/` | `Select-String -Path src/**` for `aws` | integration | **1 hit**: `src/lib/localReflect.ts:505` — a *keyword regex* matching user text (devops topics), **not** a call |
| AWS SDK hosts called | `src/**` `https?://` extraction | `*.amazonaws.com` | **none** (Google, Groq, Paddle, LemonSqueezy, RevenueCat, pollinations, unsplash, own domain, localhost) |
| AWS credential names | `.env*` key names | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | **none** |
| AWS in `.env.vercel` | grep `aws` on keys/values | app integration | **11 lines, all `aws.neon.tech`** — Neon's own hosting hostname inside `DATABASE_URL`/`PGHOST`/`POSTGRES_*`. Vendor infra, **not** an application AWS integration. Values are `aws.neon.tech`. |
| IaC / serverless config | tracked files for `terraform\|serverless\|cdk\|dockerfile\|wrangler` | AWS template | **none for AWS.** Only `.github/workflows/{ci,android-build}.yml` and `wrangler.toml` |
| Cloudflare (other hosting) | `curl https://fadfada-pwa.pages.dev` | liveness | **`curl: (6) Could not resolve host`** → never deployed; `wrangler.toml` is vestigial (initial commit `eb85c75`, referenced by no workflow, excluded via `.vercelignore`) |
| AI runtime provider | `GET /api/version` → `ai` | AWS Bedrock | `{ "provider": "api_key", "model": "gemini-2.5-flash", "location": null }` → **Google Gemini** |
| Docs mentioning AWS | `git grep -i aws -- '*.md'` | — | only `docs/DEVPOST_SUBMISSION.md` (4) and `docs/NEXT_SESSION_HANDOFF.md` (3), recording the deliberate **AWS Builder = NO-GO** decision |

**Verdict: no AWS connectivity exists, none is configured, and none is claimed.** This was a
deliberate 2026-10-08 decision (recorded in `docs/DEVPOST_SUBMISSION.md` and
`docs/AMAZON_ALEXA_FAMILY_FLOW_PLAN.md` lines 8, 117–125) driven by absent AWS
CLI/credentials/Bedrock access — and it is **not a submission defect**: AWS is only required
for the optional *AWS Builder* mini challenge, never for the Alexa+ track (section 13).

## 12. What actually runs where

| Layer | Provider | Evidence |
| --- | --- | --- |
| Web app + all API routes + MCP server | **Vercel** (single deployment) | prod `https://fad-fada.vercel.app`, `/api/version` → `dpl_GehxmDhec6djkcCnzS6ZkWMLvzj8` |
| Database | **Neon** Postgres (serverless) | `.env.vercel` `DATABASE_URL` host `aws.neon.tech` (Neon's region hostname) |
| Auth | NextAuth (first-party) | `src/lib/auth.ts` |
| AI | Google Gemini (`gemini-2.5-flash`) | `/api/version` `ai` block |
| Payments | Paddle / LemonSqueezy / RevenueCat | `src/**` host extraction |
| CI | GitHub Actions (lint/test/build **only**) | `.github/workflows/ci.yml` — **does not deploy** |
| Deploy | Vercel Git integration on push | `.vercel/repo.json` project `fad-fada` / `prj_MtafHIGrmKtWViUIXuymbUDC1Keb` |
| Cloudflare Pages | **not live** | domain does not resolve (section 11) |
| AWS | **not used** | section 11 |

`.vercelignore` excludes `wrangler.toml`, `.env*`, `node_modules`, `fadfada-submission.zip`
and the demo video from the build context. No billable resource was created, no production
data was modified, and no branch configuration was changed during this audit.

## 13. Official requirement sources (retrieved for this audit)

Direct fetches of `/rules` and `/details/faqs` returned **HTTP 403** on 2026-10-20
(bot-blocked); the rules page was successfully captured on **2026-10-19**, and the FAQ/rules
wording below was re-obtained via search-index retrieval on 2026-10-20. Cite dates with any
quotation; treat anything not corroborated as unverified.

**Mandatory (Alexa+ track)** — from the official rules/FAQ:

- Public repo with a **detectable open-source LICENSE** (pass/fail gate) — satisfied
  (`license.spdx_id: MIT`, `license.key: mit`, `private: false` on the default branch).
- A working **self-hosted MCP server** implementing **spec ≥ 2025-11-25 over Streamable
  HTTP**, *or* an Agent Skill, *or* a clearly labelled simulated experience — satisfied
  (section 1: `2025-11-25`, `WebStandardStreamableHTTPServerTransport`).
- **Runtime technology hook:** the required technology must be *imported and actually
  called* in the code — satisfied (`@modelcontextprotocol/sdk`, sections 2 and 9).
- Submission: working product, **code repository**, **public English video < 3 min**
  (YouTube/Vimeo), **Product Feedback form** (required), significant-update explanation,
  setup instructions in the README.
- Not required: any physical hardware, any AWS service, or connection to a real Alexa+ device.

**Explicitly impossible for every entrant (official statements):**

- Alexa+ Add-on developer tools (Category SDK, MCP Toolkit, CLI, Web Simulator) are
  **preview, select-partners-only**, with **no way for participants to apply**.
- DevRel (Emerson Sklar, Amazon): *"There is no way for you to actually integrate with
  Alexa+."*
- FAQ confirms the accepted path: a **web page acting as a real MCP client** issuing
  `initialize` / `tools-list` / `tools-call` over Streamable HTTP **satisfies the
  requirement** — which is exactly what `FamilyFlowConsole` + `/api/alexa/family-flow`
  provide (**currently 404 in production**, section 9).
- An MCP server **does not need to stay running** after submission.
- Simulated route: no need to resemble the Alexa UI; voice is not required; only the
  interaction layer may be simulated while the backend is real.

**Optional (+10%):** friction log of Alexa+ usage.

**Judging:** Technology, Design, Impact, Idea — equally weighted. AWS Builder is a separate
**mini challenge** requiring AWS of its own; it is not a condition of the Alexa+ track.
