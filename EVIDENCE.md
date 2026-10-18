# FadFada — Alexa+ Submission Evidence

Real, reproducible evidence for the Amazon Developer Hackathon 2026 (Alexa+ track).
All MCP traffic below is against the live production endpoint
`https://fad-fada.vercel.app/api/mcp/family-flow` (Streamable HTTP, protocol `2025-11-25`).
The bearer token is **redacted**; it is stored as the sensitive Vercel environment variable
`FAMILY_FLOW_MCP_TOKEN` and in a gitignored local file. No secrets or personal data appear here.

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
`/api/parent/return-code` intentionally `200` as the documented child-exit path):

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

## 8. Build verification (local)

```
npm run typecheck   # tsc --noEmit  -> pass
npm test            # vitest run    -> 15/15 pass
npm run build       # next build    -> pass; /api/alexa/family-flow and /api/mcp/family-flow routes compiled
npm run lint        # unavailable: no ESLint config (next lint prompts interactively)
```

## 9. Deployment status (verified 2026-10-18)

**In production** (`https://fad-fada.vercel.app`), confirmed live today:

- `POST /api/mcp/family-flow` `initialize` with bearer token → **HTTP 200**,
  `protocolVersion 2025-11-25`, `serverInfo fadfada-family-flow/0.1.112`.
- Same request with no `Authorization` → **HTTP 401** `{"error":"UNAUTHORIZED"}`.
- `scripts/verify-parent-guards.ts` against production → **ALL GUARDS OK** (section 6).

**Not yet in production** (pending a Vercel deploy of the default branch):

- `GET /api/alexa/family-flow` (the in-app web MCP console proxy) → **HTTP 404**, i.e. the
  running deployment predates this route. Compiled and tested locally, not deployed.
- The approval-guard fix (`complete_step` → `409 ROUTINE_NOT_APPROVED`) therefore also is
  **not live yet**; it ships with the same deploy.

The default branch is `release/0.1.62-clean`, and GitHub reports the MIT license
(`license.key: mit`) from that branch. Repository requirements are satisfied regardless of
deployment; the two items above are feature/shipping items, not eligibility blockers.
