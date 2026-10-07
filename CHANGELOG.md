# FadFada Changelog

All dates are release-focused. This log is part of the hackathon submission evidence.

## 2026-10-07 — Family Flow for Amazon Alexa+ (version 0.1.112)

New capability for the Amazon Developer Hackathon Alexa+ track. Made FadFada's homework loop usable by a voice agent without weakening the parent gate.

**Added**
- Deterministic Family Flow routine engine (`src/lib/familyFlow.ts`): builds a time-boxed homework routine (settle / guided practice / parent review), tracks revisions and approval state, and resets approval whenever a child-facing constraint (total time) changes. 3 unit tests.
- Parent-only routine API (`src/app/api/parent/family-flow/route.ts`): create, reschedule, approve, and mark a step complete. Requires a parent workspace session, verifies child ownership, persists routine transitions as append-only `InteractionEvent` records. Never stores child answers.
- Self-hosted Streamable HTTP MCP server (`src/app/api/mcp/family-flow/route.ts` + `src/lib/familyFlowMcp.ts`) using the official `@modelcontextprotocol/sdk`, protocol `2025-11-25`. Bearer-token auth, constant-time token comparison, server-derived parent binding from `FAMILY_FLOW_MCP_PARENT_ID`. Four tools: `get_family_routine`, `create_family_routine`, `reschedule_family_routine`, `approve_family_routine`. CORS plus `OPTIONS` preflight. Verified live in production: handshake, tool listing, and a full create → reschedule → approve → read lifecycle.
- Parent demo surface (`src/components/FamilyFlowPanel.tsx`) mounted in the parent profile workspace to create, approve, reschedule, and complete a routine.
- Child-scoped homework accuracy and remediation signals wired into the admin dashboard (homework assigned / completed, snapshot feedback, child profiles created).

**Behavior that matters for judging**
- A routine starts `awaiting_parent_approval`. Nothing is sent toward the child until an explicit approval event.
- Rescheduling a routine returns it to `awaiting_parent_approval` and keeps already-completed steps.
- MCP and the parent UI share the same append-only event source: a routine created by the MCP server appears in the parent API and vice versa (verified against production data).
- Child workspace sessions are rejected by parent-only routes with `403 PARENT_WORKSPACE_REQUIRED`; workspace-identity guards are covered by unit tests.