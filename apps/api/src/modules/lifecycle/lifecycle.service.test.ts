import assert from "node:assert/strict";
import test from "node:test";
import { buildLifecycleRunSnapshot, validateLifecycleStepUpdate } from "./lifecycle.service.js";

test("employee-onboarding snapshot copies ordered identity, licensing, group, device, and checklist groups", () => {
  const run = buildLifecycleRunSnapshot("employee-onboarding", {
    displayName: "Alex Example",
    email: "alex@example.com",
    requestedBy: "Casey Admin",
  });

  assert.equal(run.kind, "onboarding");
  assert.equal(run.templateKey, "employee-onboarding");
  assert.equal(run.templateVersion, 1);
  assert.equal(run.status, "active");
  assert.equal(run.subjectDisplayName, "Alex Example");
  assert.equal(run.subjectEmail, "alex@example.com");
  assert.deepEqual(
    run.groups.map((group) => group.key),
    ["identity", "licensing", "group", "device", "checklist"],
  );
  assert.deepEqual(
    run.groups.flatMap((group) => group.steps.map((step) => step.status)),
    ["pending", "pending", "pending", "pending", "pending", "pending", "pending", "pending"],
  );
  assert.match(run.groups[2]!.steps[0]!.instructions, /standard groups/i);
  assert.equal(run.groups[4]!.steps[0]!.key, "checklist-orientation");
});

test("employee-offboarding snapshot copies grouped access, device, handoff, and follow-up steps with immutable positions", () => {
  const run = buildLifecycleRunSnapshot("employee-offboarding", {
    displayName: "Morgan Exit",
    email: "morgan@example.com",
    requestedBy: "Casey Admin",
  });

  assert.equal(run.kind, "offboarding");
  assert.deepEqual(
    run.groups.map((group) => [group.key, group.position]),
    [
      ["access", 1],
      ["device", 2],
      ["handoff", 3],
      ["follow-up", 4],
    ],
  );
  assert.deepEqual(
    run.groups.flatMap((group) => group.steps.map((step) => [step.key, step.position])),
    [
      ["access-disable-account", 1],
      ["access-remove-licenses", 2],
      ["device-recover-assets", 1],
      ["handoff-transfer-mailbox", 1],
      ["follow-up-confirm-closure", 1],
    ],
  );
});

test("validateLifecycleStepUpdate requires a reason when skipped or blocked", () => {
  assert.throws(
    () =>
      validateLifecycleStepUpdate({
        status: "skipped",
        statusReason: "   ",
      }),
    /required reason/i,
  );

  assert.throws(
    () =>
      validateLifecycleStepUpdate({
        status: "blocked",
      }),
    /required reason/i,
  );

  const manualUpdate = validateLifecycleStepUpdate({
    status: "manual",
    note: "Completed by helpdesk ticket",
    ticketId: "HD-42",
  });

  assert.equal(manualUpdate.status, "manual");
  assert.equal(manualUpdate.note, "Completed by helpdesk ticket");
  assert.equal(manualUpdate.ticketId, "HD-42");
});
