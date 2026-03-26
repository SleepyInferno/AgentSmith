import type { LifecycleTemplate } from "./lifecycle.types.js";

export const lifecycleTemplates: LifecycleTemplate[] = [
  {
    key: "employee-onboarding",
    kind: "onboarding",
    version: 1,
    title: "Employee onboarding",
    description: "Guided joiner workflow covering identity, licensing, group access, device setup, and checklist confirmation.",
    groups: [
      {
        key: "identity",
        title: "Identity",
        position: 1,
        steps: [
          {
            key: "identity-create-account",
            title: "Create directory account",
            instructions: "Create the user account in Entra ID and verify the primary UPN and MFA bootstrap plan.",
            position: 1,
          },
          {
            key: "identity-verify-profile",
            title: "Verify profile details",
            instructions: "Confirm display name, job title, department, manager, and starter metadata before access is granted.",
            position: 2,
          },
        ],
      },
      {
        key: "licensing",
        title: "Licensing",
        position: 2,
        steps: [
          {
            key: "licensing-assign-core",
            title: "Assign core licenses",
            instructions: "Apply the required Microsoft 365 and security licenses for the role and confirm provisioning begins.",
            position: 1,
          },
        ],
      },
      {
        key: "group",
        title: "Group access",
        position: 3,
        steps: [
          {
            key: "group-assign-standard",
            title: "Assign baseline groups",
            instructions: "Add the user to standard groups for site, department, collaboration, and security posture.",
            position: 1,
          },
          {
            key: "group-assign-role",
            title: "Review role-specific group access",
            instructions: "Add only the role-specific groups approved for the starter and record exceptions if access is deferred.",
            position: 2,
          },
        ],
      },
      {
        key: "device",
        title: "Device",
        position: 4,
        steps: [
          {
            key: "device-prepare-endpoint",
            title: "Prepare endpoint",
            instructions: "Stage or assign the primary device, confirm enrollment ownership, and record the asset reference if available.",
            position: 1,
          },
          {
            key: "device-verify-baseline",
            title: "Verify baseline configuration",
            instructions: "Confirm encryption, antivirus, patching, and required onboarding apps are ready before handoff.",
            position: 2,
          },
        ],
      },
      {
        key: "checklist",
        title: "Checklist",
        position: 5,
        steps: [
          {
            key: "checklist-orientation",
            title: "Confirm orientation checklist",
            instructions: "Verify welcome materials, key contacts, and first-day access checks are complete or escalated.",
            position: 1,
          },
        ],
      },
    ],
  },
  {
    key: "employee-offboarding",
    kind: "offboarding",
    version: 1,
    title: "Employee offboarding",
    description: "Guided leaver workflow covering access removal, device recovery, handoff, and follow-up completion.",
    groups: [
      {
        key: "access",
        title: "Access removal",
        position: 1,
        steps: [
          {
            key: "access-disable-account",
            title: "Disable account access",
            instructions: "Disable sign-in, reset sessions, and confirm high-risk access paths are removed.",
            position: 1,
          },
          {
            key: "access-remove-licenses",
            title: "Remove direct license assignments",
            instructions: "Remove or reassign licenses according to retention policy and document exceptions.",
            position: 2,
          },
        ],
      },
      {
        key: "device",
        title: "Device recovery",
        position: 2,
        steps: [
          {
            key: "device-recover-assets",
            title: "Recover assigned devices",
            instructions: "Collect assigned devices, accessories, badges, and record the asset or shipment reference.",
            position: 1,
          },
        ],
      },
      {
        key: "handoff",
        title: "Handoff",
        position: 3,
        steps: [
          {
            key: "handoff-transfer-mailbox",
            title: "Transfer mailbox or files",
            instructions: "Capture mailbox delegation, shared file ownership, or export references needed for business continuity.",
            position: 1,
          },
        ],
      },
      {
        key: "follow-up",
        title: "Follow-up",
        position: 4,
        steps: [
          {
            key: "follow-up-confirm-closure",
            title: "Confirm follow-up actions",
            instructions: "Record any remaining manual follow-up, ticket closure, or manager confirmation required after offboarding.",
            position: 1,
          },
        ],
      },
    ],
  },
];

export const lifecycleTemplatesByKey = Object.fromEntries(
  lifecycleTemplates.map((template) => [template.key, template]),
) as Record<LifecycleTemplate["key"], LifecycleTemplate>;
