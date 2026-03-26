import assert from "node:assert/strict";
import test from "node:test";
import { buildLifecycleRunSnapshot, buildLifecycleRunSummary } from "./lifecycle.service.js";

test("buildLifecycleRunSummary reports completed, blocked, skipped, and unresolved follow-up work", () => {
  const run = buildLifecycleRunSnapshot("employee-offboarding", {
    displayName: "Morgan Exit",
    email: "morgan@example.com",
    requestedBy: "Casey Admin",
  });

  run.groups[0]!.steps[0] = {
    ...run.groups[0]!.steps[0]!,
    status: "manual",
    note: "Disabled in tenant",
    completedAt: "2026-03-26T18:30:00.000Z",
  };
  run.groups[0]!.steps[1] = {
    ...run.groups[0]!.steps[1]!,
    status: "automated",
    completedAt: "2026-03-26T18:31:00.000Z",
  };
  run.groups[1]!.steps[0] = {
    ...run.groups[1]!.steps[0]!,
    status: "blocked",
    statusReason: "Laptop not returned",
  };
  run.groups[2]!.steps[0] = {
    ...run.groups[2]!.steps[0]!,
    status: "skipped",
    statusReason: "No mailbox data to transfer",
  };

  const summary = buildLifecycleRunSummary(run);

  assert.equal(summary.completedCount, 2);
  assert.equal(summary.manualCount, 1);
  assert.equal(summary.skippedCount, 1);
  assert.equal(summary.blockedCount, 1);
  assert.deepEqual(
    summary.unresolvedFollowUps.map((step) => [step.stepKey, step.status]),
    [
      ["device-recover-assets", "blocked"],
      ["handoff-transfer-mailbox", "skipped"],
      ["follow-up-confirm-closure", "pending"],
    ],
  );
  assert.equal(summary.groups.find((group) => group.key === "follow-up")?.unresolvedCount, 1);
  assert.equal(summary.groups.find((group) => group.key === "access")?.completedCount, 2);
  assert.match(summary.unresolvedFollowUps[2]!.title, /follow-up/i);
});
