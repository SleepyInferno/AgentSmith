# Deferred Items

- 2026-03-27: `npx pnpm --filter @agentsmith/api typecheck` still fails in pre-existing lifecycle files after Prisma client regeneration. Current failing files include `apps/api/src/modules/lifecycle/lifecycle.repository.ts` and `apps/api/src/routes/lifecycle.ts`. The new network module tests pass; this remains out of scope for plan `04-01`.
