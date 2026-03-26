# AgentSmith

AgentSmith is an internal operations console for a solo IT operator who needs one place to monitor endpoint health, audit identity risk, verify backup confidence, and keep operational documentation useful.

## Work In Progress

AgentSmith is actively under construction.

The project currently has:
- a bootstrapped monorepo workspace
- a foundational web shell
- a Fastify API scaffold
- a shared environment/config package
- the Phase 1 canonical Prisma schema

The project does not yet have:
- live Entra ID sign-in
- connector sync status screens
- audit trail views
- production-ready module workflows

In other words: the suit is on, the sunglasses are polished, and the infrastructure is waking up, but AgentSmith is still learning the building before he starts managing it.

## Workspace Layout

- `apps/web` - React + Vite frontend
- `apps/api` - Fastify API
- `packages/shared` - shared environment parsing and reusable types
- `prisma` - canonical data model and Prisma schema
- `.planning` - project roadmap, research, state, and phase artifacts

## Local Setup

1. Copy `.env.example` to `.env` and adjust values for your machine.
2. Install dependencies:

```bash
pnpm install
```

3. Generate the Prisma client:

```bash
pnpm db:generate
```

4. Start the API and frontend together:

```bash
pnpm dev
```

The API health endpoint runs on `http://localhost:3001/health` and the Vite frontend runs on `http://localhost:5173`.

If `pnpm` is not available on your machine yet, enable it with Corepack or install it directly before running the commands above.

## Initial Focus

This repository starts with the five highest-value tools:

1. Asset health dashboard
2. Onboarding/offboarding automator
3. Privilege and stale account auditor
4. Backup confidence dashboard
5. Documentation assistant

## Current Phase

The repo is currently in Phase 1: Foundations and Secure Data Flow.

That means the immediate work is focused on:
- secure sign-in with Entra ID
- connector freshness and sync visibility
- audit logging
- canonical shared data models for later dashboards and workflows

## Planning Artifacts

- `.planning/PROJECT.md`
- `.planning/config.json`
- `.planning/research/`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `AGENTS.md`
