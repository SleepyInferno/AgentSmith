# AgentSmith

AgentSmith is an internal operations console for a solo IT operator who needs one place to monitor endpoint health, audit identity risk, verify backup confidence, and keep operational documentation useful.

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
corepack pnpm install
```

3. Generate the Prisma client:

```bash
corepack pnpm db:generate
```

4. Start the API and frontend together:

```bash
corepack pnpm dev
```

The API health endpoint runs on `http://localhost:3001/health` and the Vite frontend runs on `http://localhost:5173`.

## Initial Focus

This repository starts with the five highest-value tools:

1. Asset health dashboard
2. Onboarding/offboarding automator
3. Privilege and stale account auditor
4. Backup confidence dashboard
5. Documentation assistant

## Planning Artifacts

- `.planning/PROJECT.md`
- `.planning/config.json`
- `.planning/research/`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `AGENTS.md`
