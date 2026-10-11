# Devpost Submission Draft — Amazon Developer Hackathon 2026

Track: Alexa+ (primary). AWS Builder: NO-GO decided — adding an unverified AWS claim would weaken the entry; submit Alexa+ track only.

## Project Name

FadFada — Family Flow (Alexa+ homework routine agent)

## Tagline

Homework that respects a parent's approval: an Alexa+ routine agent that never talks to a child until a parent says yes.

## Short Description

FadFada is an Arabic-first family homework companion. Family Flow is the new agentic layer: a parent turns homework into a time-boxed routine, approves the child-facing handoff, changes constraints, and the routine adapts — across sessions, via web UI or over a self-hosted Streamable HTTP MCP server. Parent-only data stays out of the child workspace, by design.

## Links

- Repo: https://github.com/moazizbera/FadFada (public)
- Live app: https://fad-fada.vercel.app
- Demo video: <YouTube unlisted link>
- Change log: `CHANGELOG.md` (root of repo)
- Friction log: `FRICTION_LOG.md` (root of repo)

## Inspiration

Families told us homework support needs a boundary: a child should be able to practice safely, and a parent should see what needs review without reading the child's answers. We built the homework practice loop first; Alexa+ was the natural second surface — a voice agent that proposes, earns approval, and hands off — without ever automating unapproved communication to a child.

## What It Does

- Parent or an Alexa+ caller asks for "25 minutes of math before bedtime".
- The routine engine builds three steps (settle / guided practice / parent review) in `awaiting_parent_approval`.
- Constraints can change ("she is tired, make it 10 minutes") — steps rebuild, completed progress is kept, and the routine returns to awaiting approval because the child-facing plan changed.
- An explicit parent approval records the authorizing event. Only then can practice begin.
- The child workspace receives only approved output; the parent API returns `403 PARENT_WORKSPACE_REQUIRED` to child-mode sessions.

## How We Built It

- Next.js + React 19 + TypeScript + Prisma + Neon Postgres (existing FadFada stack).
- New deterministic Family Flow engine (`src/lib/familyFlow.ts`) — pure, unit-tested (~3 tests).
- New parent-only API (`/api/parent/family-flow`) with child-ownership checks; routine state lives as append-only `InteractionEvent` records.
- New self-hosted Streamable HTTP MCP server (`/api/mcp/family-flow`) with the official `@modelcontextprotocol/sdk`, protocol `2025-11-25`, bearer auth, server-derived parent binding. Tools: `get_family_routine`, `create_family_routine`, `reschedule_family_routine`, `approve_family_routine`.
- Parent demo surface in the profile workspace (`FamilyFlowPanel`).
- Workspace-identity guards (`src/lib/workspaceIdentity.ts`) with unit tests.

## What Makes It Different

- Multi-turn, stateful agentic workflow, not a Q&A skill: approvals, revisions, and review signals all persist across sessions.
- Safety is structural: a material change (time/task) always resets approval; no child answers or conversations are ever stored in routine records.
- One approval-gated engine serves both the human parent UI and the MCP/Alexa+ surface.

## Challenges We Ran Into

- Streamable HTTP requires an `Accept: application/json, text/event-stream` header; a raw request returned 406 until we matched the spec.
- Serverless + long-lived transport: we keep the MCP connection short-lived and stateless per request; routine state lives in the event store, not the server.
- Designing approval semantics: rescheduling originally kept approval; we changed it so any child-facing material change requires a fresh parent decision (unit-tested).

## Accomplishments

- Live production MCP server with a verified `2025-11-25` handshake and a full create → reschedule → approve → read lifecycle recorded against real data.
- Cross-surface consistency: a routine created via MCP appears in the parent UI API and vice versa.
- Changelog and friction log at repo root for judge transparency.

## What We Learned

- Clean domain logic (a pure routine engine) made safety behavior testable and explainable.
- Append-only events kept two surfaces consistent without a schema migration.
- Honest submission packaging (friction log, dated changelog) is part of a credible entry.

## What's Next

- Record and attach the under-3-minute demo video.
- Final visual pass in the child workspace for the recorded demo.

## AWS Builder Go/No-Go (decided: NO-GO)

- No AWS CLI, credentials, or Bedrock access were available in this environment, and the decision window closed without them.
- Decision: submit the Alexa+ track only and make no AWS or Bedrock claim. Nothing in the repo claims an AWS integration.

## Safety Notes

Family Flow is not medical, therapeutic, emergency, legal, or financial advice. Routine records store identifiers, timings, status, and aggregate learning signals only — never child answer text. Demo uses fictional, nickname-only child data.