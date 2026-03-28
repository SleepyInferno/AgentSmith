import type {
  DocumentKind,
  DocumentMetadataDimension,
  DocumentRevisionType,
  DocumentReviewState,
  DocumentationDataMode,
  DocumentationSearchFilters,
  DocumentationQueueReason,
  DocumentationSearchReason,
} from "./docs.types.js";

export type DocumentationFixtureSystem = {
  id: string;
  sourceSystem: string;
  sourceId: string;
  name: string;
  category: string | null;
  ownerTeam: string | null;
  criticality: string | null;
  dataMode: DocumentationDataMode;
};

export type DocumentationFixtureDocument = {
  id: string;
  sourceSystem: string;
  sourceId: string;
  title: string;
  kind: DocumentKind;
  category: string | null;
  owner: string | null;
  summary: string;
  contentText: string;
  searchText: string;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  queueSummary: string | null;
  focusReason: DocumentationQueueReason | null;
  suggestedNextStep: string;
  createdAt: string;
  updatedAt: string;
  dataMode: DocumentationDataMode;
};

export type DocumentationFixtureMetadataAssignment = {
  documentId: string;
  dimension: DocumentMetadataDimension;
  valueKey: string;
  valueLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentationFixtureSystemLink = {
  documentId: string;
  systemId: string;
  relationshipLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentationFixtureRevision = {
  documentId: string;
  revisionType: DocumentRevisionType;
  summary: string;
  changedFields: string[];
  actorLabel: string | null;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  createdAt: string;
};

export type DocumentationFixtureSearchCase = {
  query: string;
  filters: DocumentationSearchFilters;
  expectedTopDocumentId: string;
  expectedOrderedDocumentIds: string[];
  expectedReasonCode: DocumentationSearchReason["code"];
  summary: string;
};

const seededSource = "seeded_example";
const seededDataMode: DocumentationDataMode = "seeded_example";

const metadataGapReason: DocumentationQueueReason = {
  code: "metadata_incomplete",
  label: "Metadata incomplete",
  summary: "Document metadata is incomplete for operational search",
};

const recentChangeReason: DocumentationQueueReason = {
  code: "recent_change",
  label: "Updated since last review",
  summary: "Content changed after the last review",
};

const overdueReviewReason: DocumentationQueueReason = {
  code: "review_overdue",
  label: "Review overdue",
  summary: "Review due date has passed",
};

export const documentationFixtureSystems: DocumentationFixtureSystem[] = [
  {
    id: "sys-branch-firewall",
    sourceSystem: seededSource,
    sourceId: "sys-branch-firewall",
    name: "Branch Edge Firewall",
    category: "network_security",
    ownerTeam: "Network Operations",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-branch-circuit",
    sourceSystem: seededSource,
    sourceId: "sys-branch-circuit",
    name: "Branch Fiber Circuit",
    category: "wan_connectivity",
    ownerTeam: "Network Operations",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-sharepoint-tenant",
    sourceSystem: seededSource,
    sourceId: "sys-sharepoint-tenant",
    name: "Microsoft 365 Collaboration",
    category: "m365",
    ownerTeam: "Productivity",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-entra-break-glass",
    sourceSystem: seededSource,
    sourceId: "sys-entra-break-glass",
    name: "Entra Break-Glass Accounts",
    category: "identity",
    ownerTeam: "Identity Operations",
    criticality: "tier_0",
    dataMode: seededDataMode,
  },
  {
    id: "sys-hyperv-cluster",
    sourceSystem: seededSource,
    sourceId: "sys-hyperv-cluster",
    name: "HQ Hyper-V Cluster",
    category: "virtualization",
    ownerTeam: "Infrastructure",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-san-fabric",
    sourceSystem: seededSource,
    sourceId: "sys-san-fabric",
    name: "Primary SAN Fabric",
    category: "storage",
    ownerTeam: "Infrastructure",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-backup-platform",
    sourceSystem: seededSource,
    sourceId: "sys-backup-platform",
    name: "Veeam Backup Platform",
    category: "backup",
    ownerTeam: "Infrastructure",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-domain-controller-01",
    sourceSystem: seededSource,
    sourceId: "sys-domain-controller-01",
    name: "Primary Domain Controller",
    category: "identity",
    ownerTeam: "Infrastructure Services",
    criticality: "tier_0",
    dataMode: seededDataMode,
  },
  {
    id: "sys-print-fleet",
    sourceSystem: seededSource,
    sourceId: "sys-print-fleet",
    name: "Managed Print Fleet",
    category: "vendor_service",
    ownerTeam: "Workplace Services",
    criticality: "tier_3",
    dataMode: seededDataMode,
  },
];

export const documentationFixtures: DocumentationFixtureDocument[] = [
  {
    id: "doc-password-reset-sop",
    sourceSystem: seededSource,
    sourceId: "doc-password-reset-sop",
    title: "Password Reset SOP",
    kind: "sop",
    category: "Identity Operations",
    owner: "Service Desk",
    summary: "Standard user password reset flow with MFA cleanup and handoff notes.",
    contentText:
      "Reset the Entra ID password, confirm MFA methods, invalidate stale sessions, and capture handoff notes before closing the request.",
    searchText:
      "password reset sop entra id mfa cleanup service desk identity operations handoff notes",
    reviewState: "current",
    reviewDueAt: "2026-06-01T00:00:00.000Z",
    lastReviewedAt: "2026-03-01T15:00:00.000Z",
    sourceUpdatedAt: "2026-02-14T18:00:00.000Z",
    contentUpdatedAt: "2026-02-14T18:00:00.000Z",
    queueSummary: null,
    focusReason: null,
    suggestedNextStep: "No immediate action required.",
    createdAt: "2025-11-10T09:00:00.000Z",
    updatedAt: "2026-03-01T15:00:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-branch-firewall-recovery",
    sourceSystem: seededSource,
    sourceId: "doc-branch-firewall-recovery",
    title: "Branch Firewall Recovery Runbook",
    kind: "recovery_procedure",
    category: "Recovery",
    owner: "Network Operations",
    summary: "Recover the branch firewall, carrier handoff, and VPN failover path after an outage.",
    contentText:
      "Recover the branch edge firewall, validate the fiber circuit handoff, fail over VPN traffic, and confirm LTE backup routing before reopening the site.",
    searchText:
      "branch firewall recovery runbook fiber circuit failover vpn lte carrier handoff network outage",
    reviewState: "overdue",
    reviewDueAt: "2026-03-10T00:00:00.000Z",
    lastReviewedAt: "2025-12-10T16:00:00.000Z",
    sourceUpdatedAt: "2026-03-05T12:00:00.000Z",
    contentUpdatedAt: "2026-03-05T12:00:00.000Z",
    queueSummary: "Review due date has passed",
    focusReason: overdueReviewReason,
    suggestedNextStep:
      "Review the runbook against the current branch firewall firmware and branch failover process.",
    createdAt: "2025-08-20T12:00:00.000Z",
    updatedAt: "2026-03-05T12:00:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-contoso-isp-contacts",
    sourceSystem: seededSource,
    sourceId: "doc-contoso-isp-contacts",
    title: "Contoso Fiber ISP Contacts",
    kind: "contact",
    category: "Carrier Contacts",
    owner: "Network Operations",
    summary: "Contoso Fiber NOC, account team, and after-hours dispatch contacts for circuit escalations.",
    contentText:
      "Use this contact list for Contoso Fiber NOC circuit escalations, after-hours dispatch, maintenance bridge calls, and account-team follow-up.",
    searchText:
      "contoso fiber noc circuit contacts after hours dispatch carrier escalation bridge phone list",
    reviewState: "current",
    reviewDueAt: "2026-05-15T00:00:00.000Z",
    lastReviewedAt: "2026-02-18T14:30:00.000Z",
    sourceUpdatedAt: "2026-02-20T11:15:00.000Z",
    contentUpdatedAt: "2026-02-20T11:15:00.000Z",
    queueSummary: "Document metadata is incomplete for operational search",
    focusReason: metadataGapReason,
    suggestedNextStep: "Add the missing site tag so circuit contacts surface for branch outages.",
    createdAt: "2025-10-02T10:00:00.000Z",
    updatedAt: "2026-02-20T11:15:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-m365-break-glass",
    sourceSystem: seededSource,
    sourceId: "doc-m365-break-glass",
    title: "Microsoft 365 Break-Glass and SharePoint Restore",
    kind: "recovery_procedure",
    category: "Recovery",
    owner: "Identity Operations",
    summary: "Emergency access and SharePoint restore guidance for tenant-wide Microsoft 365 incidents.",
    contentText:
      "Use the break-glass accounts to regain admin access, confirm the emergency credential evidence, and run the SharePoint restore checklist for tenant-wide recovery.",
    searchText:
      "m365 break glass sharepoint restore tenant recovery emergency access global admin evidence",
    reviewState: "unreviewed",
    reviewDueAt: "2026-04-15T00:00:00.000Z",
    lastReviewedAt: "2026-02-12T09:00:00.000Z",
    sourceUpdatedAt: "2026-03-27T07:30:00.000Z",
    contentUpdatedAt: "2026-03-27T07:30:00.000Z",
    queueSummary: "Content changed after the last review",
    focusReason: recentChangeReason,
    suggestedNextStep:
      "Re-review the SharePoint restore scope and confirm the emergency account evidence is still valid.",
    createdAt: "2025-09-15T08:00:00.000Z",
    updatedAt: "2026-03-27T07:30:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-hyperv-cluster-notes",
    sourceSystem: seededSource,
    sourceId: "doc-hyperv-cluster-notes",
    title: "Hyper-V Cluster and SAN Notes",
    kind: "infrastructure_note",
    category: "Infrastructure",
    owner: "Infrastructure",
    summary: "Operational notes for Hyper-V maintenance, SAN zoning, and CSV ownership.",
    contentText:
      "Capture Hyper-V cluster maintenance notes, SAN zoning caveats, CSV ownership checks, and MPIO path validation before storage work.",
    searchText:
      "hyper-v san cluster notes csv ownership mpio zoning maintenance hq virtualization storage",
    reviewState: "current",
    reviewDueAt: "2026-04-20T00:00:00.000Z",
    lastReviewedAt: "2026-01-05T13:00:00.000Z",
    sourceUpdatedAt: "2026-03-18T18:00:00.000Z",
    contentUpdatedAt: "2026-03-18T18:00:00.000Z",
    queueSummary: null,
    focusReason: null,
    suggestedNextStep: "Review SAN failover notes before the next host maintenance window.",
    createdAt: "2025-07-22T15:00:00.000Z",
    updatedAt: "2026-03-18T18:00:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-veeam-renewal-notes",
    sourceSystem: seededSource,
    sourceId: "doc-veeam-renewal-notes",
    title: "Veeam Renewal Notes",
    kind: "vendor_note",
    category: "Vendor Notes",
    owner: null,
    summary: "Support renewal timing, licensing changes, and risk notes for the Veeam platform.",
    contentText:
      "Track the Veeam renewal date, support co-term details, repository growth notes, and escalation path for licensing changes.",
    searchText:
      "veeam renewal notes support contract licensing coterm repository growth backup platform vendor",
    reviewState: "current",
    reviewDueAt: "2026-06-10T00:00:00.000Z",
    lastReviewedAt: "2026-03-10T11:00:00.000Z",
    sourceUpdatedAt: "2026-03-15T14:00:00.000Z",
    contentUpdatedAt: "2026-03-15T14:00:00.000Z",
    queueSummary: "Document metadata is incomplete for operational search",
    focusReason: metadataGapReason,
    suggestedNextStep: "Assign a contract owner before the renewal notice window closes.",
    createdAt: "2025-12-05T12:00:00.000Z",
    updatedAt: "2026-03-15T14:00:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-new-hire-workstation-setup",
    sourceSystem: seededSource,
    sourceId: "doc-new-hire-workstation-setup",
    title: "New-Hire Workstation Setup SOP",
    kind: "sop",
    category: "Onboarding",
    owner: "Service Desk",
    summary: "Provision a standard workstation, enroll it in Intune, and hand off credentials safely.",
    contentText:
      "Stage the device, assign the Intune profile, validate Autopilot enrollment, install baseline apps, and capture handoff evidence before day one.",
    searchText:
      "new hire workstation setup sop intune autopilot baseline apps onboarding service desk",
    reviewState: "due_soon",
    reviewDueAt: "2026-04-03T00:00:00.000Z",
    lastReviewedAt: "2026-02-28T16:00:00.000Z",
    sourceUpdatedAt: "2026-02-28T16:00:00.000Z",
    contentUpdatedAt: "2026-02-28T16:00:00.000Z",
    queueSummary: "Review due date is approaching",
    focusReason: null,
    suggestedNextStep: "Confirm the app package list still matches the onboarding baseline.",
    createdAt: "2025-10-14T14:00:00.000Z",
    updatedAt: "2026-02-28T16:00:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-domain-controller-restore",
    sourceSystem: seededSource,
    sourceId: "doc-domain-controller-restore",
    title: "Domain Controller Restore Procedure",
    kind: "recovery_procedure",
    category: "Recovery",
    owner: "Infrastructure Services",
    summary: "Restore the primary domain controller and verify replication, DNS, and FSMO health.",
    contentText:
      "Recover the domain controller from backup, validate DNS and SYSVOL, confirm replication partners, and check FSMO role health before release.",
    searchText:
      "domain controller restore recovery active directory dns sysvol fsmo replication backup",
    reviewState: "current",
    reviewDueAt: "2026-05-30T00:00:00.000Z",
    lastReviewedAt: "2026-03-12T10:30:00.000Z",
    sourceUpdatedAt: "2026-03-12T10:30:00.000Z",
    contentUpdatedAt: "2026-03-12T10:30:00.000Z",
    queueSummary: null,
    focusReason: null,
    suggestedNextStep: "No immediate action required.",
    createdAt: "2025-06-01T11:00:00.000Z",
    updatedAt: "2026-03-12T10:30:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-print-vendor-contact-list",
    sourceSystem: seededSource,
    sourceId: "doc-print-vendor-contact-list",
    title: "Managed Print Vendor Contacts",
    kind: "contact",
    category: "Vendor Contacts",
    owner: "Workplace Services",
    summary: "Printer vendor dispatch, toner escalation, and regional account contacts.",
    contentText:
      "Use this list for managed print dispatch, toner escalations, copier outages, and regional vendor account contacts by site.",
    searchText:
      "print vendor contacts dispatch toner escalation copier outage site support managed print",
    reviewState: "current",
    reviewDueAt: "2026-07-01T00:00:00.000Z",
    lastReviewedAt: "2026-03-18T12:15:00.000Z",
    sourceUpdatedAt: "2026-03-18T12:15:00.000Z",
    contentUpdatedAt: "2026-03-18T12:15:00.000Z",
    queueSummary: null,
    focusReason: null,
    suggestedNextStep: "No immediate action required.",
    createdAt: "2025-11-21T09:00:00.000Z",
    updatedAt: "2026-03-18T12:15:00.000Z",
    dataMode: seededDataMode,
  },
  {
    id: "doc-site-oncall-handoff",
    sourceSystem: seededSource,
    sourceId: "doc-site-oncall-handoff",
    title: "Site On-Call Handoff Notes",
    kind: "infrastructure_note",
    category: "Infrastructure",
    owner: "Infrastructure",
    summary: "On-call handoff covering rack access, emergency contacts, and site-specific gotchas.",
    contentText:
      "Capture rack locations, badge access notes, emergency phone tree updates, and site-specific maintenance caveats for the next on-call rotation.",
    searchText:
      "site on call handoff notes rack access badge emergency phone tree infrastructure",
    reviewState: "current",
    reviewDueAt: "2026-05-20T00:00:00.000Z",
    lastReviewedAt: "2026-03-03T17:00:00.000Z",
    sourceUpdatedAt: "2026-03-03T17:00:00.000Z",
    contentUpdatedAt: "2026-03-03T17:00:00.000Z",
    queueSummary: null,
    focusReason: null,
    suggestedNextStep: "No immediate action required.",
    createdAt: "2025-09-30T16:00:00.000Z",
    updatedAt: "2026-03-03T17:00:00.000Z",
    dataMode: seededDataMode,
  },
];

export const documentMetadataAssignmentFixtures: DocumentationFixtureMetadataAssignment[] = [
  {
    documentId: "doc-password-reset-sop",
    dimension: "site",
    valueKey: "site-hq",
    valueLabel: "HQ",
    createdAt: "2025-11-10T09:00:00.000Z",
    updatedAt: "2026-03-01T15:00:00.000Z",
  },
  {
    documentId: "doc-password-reset-sop",
    dimension: "owner",
    valueKey: "owner-service-desk",
    valueLabel: "Service Desk",
    createdAt: "2025-11-10T09:00:00.000Z",
    updatedAt: "2026-03-01T15:00:00.000Z",
  },
  {
    documentId: "doc-password-reset-sop",
    dimension: "category",
    valueKey: "category-identity-operations",
    valueLabel: "Identity Operations",
    createdAt: "2025-11-10T09:00:00.000Z",
    updatedAt: "2026-03-01T15:00:00.000Z",
  },
  {
    documentId: "doc-branch-firewall-recovery",
    dimension: "site",
    valueKey: "site-branch-office",
    valueLabel: "Branch Office",
    createdAt: "2025-08-20T12:00:00.000Z",
    updatedAt: "2026-03-05T12:00:00.000Z",
  },
  {
    documentId: "doc-branch-firewall-recovery",
    dimension: "owner",
    valueKey: "owner-network-operations",
    valueLabel: "Network Operations",
    createdAt: "2025-08-20T12:00:00.000Z",
    updatedAt: "2026-03-05T12:00:00.000Z",
  },
  {
    documentId: "doc-branch-firewall-recovery",
    dimension: "category",
    valueKey: "category-recovery",
    valueLabel: "Recovery",
    createdAt: "2025-08-20T12:00:00.000Z",
    updatedAt: "2026-03-05T12:00:00.000Z",
  },
  {
    documentId: "doc-contoso-isp-contacts",
    dimension: "owner",
    valueKey: "owner-network-operations",
    valueLabel: "Network Operations",
    createdAt: "2025-10-02T10:00:00.000Z",
    updatedAt: "2026-02-20T11:15:00.000Z",
  },
  {
    documentId: "doc-contoso-isp-contacts",
    dimension: "category",
    valueKey: "category-carrier-contacts",
    valueLabel: "Carrier Contacts",
    createdAt: "2025-10-02T10:00:00.000Z",
    updatedAt: "2026-02-20T11:15:00.000Z",
  },
  {
    documentId: "doc-m365-break-glass",
    dimension: "site",
    valueKey: "site-cloud",
    valueLabel: "Cloud",
    createdAt: "2025-09-15T08:00:00.000Z",
    updatedAt: "2026-03-27T07:30:00.000Z",
  },
  {
    documentId: "doc-m365-break-glass",
    dimension: "owner",
    valueKey: "owner-identity-operations",
    valueLabel: "Identity Operations",
    createdAt: "2025-09-15T08:00:00.000Z",
    updatedAt: "2026-03-27T07:30:00.000Z",
  },
  {
    documentId: "doc-m365-break-glass",
    dimension: "category",
    valueKey: "category-recovery",
    valueLabel: "Recovery",
    createdAt: "2025-09-15T08:00:00.000Z",
    updatedAt: "2026-03-27T07:30:00.000Z",
  },
  {
    documentId: "doc-hyperv-cluster-notes",
    dimension: "site",
    valueKey: "site-hq",
    valueLabel: "HQ",
    createdAt: "2025-07-22T15:00:00.000Z",
    updatedAt: "2026-03-18T18:00:00.000Z",
  },
  {
    documentId: "doc-hyperv-cluster-notes",
    dimension: "owner",
    valueKey: "owner-infrastructure",
    valueLabel: "Infrastructure",
    createdAt: "2025-07-22T15:00:00.000Z",
    updatedAt: "2026-03-18T18:00:00.000Z",
  },
  {
    documentId: "doc-hyperv-cluster-notes",
    dimension: "category",
    valueKey: "category-infrastructure",
    valueLabel: "Infrastructure",
    createdAt: "2025-07-22T15:00:00.000Z",
    updatedAt: "2026-03-18T18:00:00.000Z",
  },
  {
    documentId: "doc-veeam-renewal-notes",
    dimension: "site",
    valueKey: "site-cloud",
    valueLabel: "Cloud",
    createdAt: "2025-12-05T12:00:00.000Z",
    updatedAt: "2026-03-15T14:00:00.000Z",
  },
  {
    documentId: "doc-veeam-renewal-notes",
    dimension: "category",
    valueKey: "category-vendor-notes",
    valueLabel: "Vendor Notes",
    createdAt: "2025-12-05T12:00:00.000Z",
    updatedAt: "2026-03-15T14:00:00.000Z",
  },
  {
    documentId: "doc-new-hire-workstation-setup",
    dimension: "site",
    valueKey: "site-hq",
    valueLabel: "HQ",
    createdAt: "2025-10-14T14:00:00.000Z",
    updatedAt: "2026-02-28T16:00:00.000Z",
  },
  {
    documentId: "doc-new-hire-workstation-setup",
    dimension: "owner",
    valueKey: "owner-service-desk",
    valueLabel: "Service Desk",
    createdAt: "2025-10-14T14:00:00.000Z",
    updatedAt: "2026-02-28T16:00:00.000Z",
  },
  {
    documentId: "doc-new-hire-workstation-setup",
    dimension: "category",
    valueKey: "category-onboarding",
    valueLabel: "Onboarding",
    createdAt: "2025-10-14T14:00:00.000Z",
    updatedAt: "2026-02-28T16:00:00.000Z",
  },
  {
    documentId: "doc-domain-controller-restore",
    dimension: "site",
    valueKey: "site-hq",
    valueLabel: "HQ",
    createdAt: "2025-06-01T11:00:00.000Z",
    updatedAt: "2026-03-12T10:30:00.000Z",
  },
  {
    documentId: "doc-domain-controller-restore",
    dimension: "owner",
    valueKey: "owner-infrastructure-services",
    valueLabel: "Infrastructure Services",
    createdAt: "2025-06-01T11:00:00.000Z",
    updatedAt: "2026-03-12T10:30:00.000Z",
  },
  {
    documentId: "doc-domain-controller-restore",
    dimension: "category",
    valueKey: "category-recovery",
    valueLabel: "Recovery",
    createdAt: "2025-06-01T11:00:00.000Z",
    updatedAt: "2026-03-12T10:30:00.000Z",
  },
  {
    documentId: "doc-print-vendor-contact-list",
    dimension: "site",
    valueKey: "site-hq",
    valueLabel: "HQ",
    createdAt: "2025-11-21T09:00:00.000Z",
    updatedAt: "2026-03-18T12:15:00.000Z",
  },
  {
    documentId: "doc-print-vendor-contact-list",
    dimension: "site",
    valueKey: "site-branch-office",
    valueLabel: "Branch Office",
    createdAt: "2025-11-21T09:00:00.000Z",
    updatedAt: "2026-03-18T12:15:00.000Z",
  },
  {
    documentId: "doc-print-vendor-contact-list",
    dimension: "owner",
    valueKey: "owner-workplace-services",
    valueLabel: "Workplace Services",
    createdAt: "2025-11-21T09:00:00.000Z",
    updatedAt: "2026-03-18T12:15:00.000Z",
  },
  {
    documentId: "doc-print-vendor-contact-list",
    dimension: "category",
    valueKey: "category-vendor-contacts",
    valueLabel: "Vendor Contacts",
    createdAt: "2025-11-21T09:00:00.000Z",
    updatedAt: "2026-03-18T12:15:00.000Z",
  },
  {
    documentId: "doc-site-oncall-handoff",
    dimension: "site",
    valueKey: "site-hq",
    valueLabel: "HQ",
    createdAt: "2025-09-30T16:00:00.000Z",
    updatedAt: "2026-03-03T17:00:00.000Z",
  },
  {
    documentId: "doc-site-oncall-handoff",
    dimension: "owner",
    valueKey: "owner-infrastructure",
    valueLabel: "Infrastructure",
    createdAt: "2025-09-30T16:00:00.000Z",
    updatedAt: "2026-03-03T17:00:00.000Z",
  },
  {
    documentId: "doc-site-oncall-handoff",
    dimension: "category",
    valueKey: "category-infrastructure",
    valueLabel: "Infrastructure",
    createdAt: "2025-09-30T16:00:00.000Z",
    updatedAt: "2026-03-03T17:00:00.000Z",
  },
];

export const documentSystemLinkFixtures: DocumentationFixtureSystemLink[] = [
  {
    documentId: "doc-branch-firewall-recovery",
    systemId: "sys-branch-firewall",
    relationshipLabel: "primary recovery target",
    createdAt: "2025-08-20T12:00:00.000Z",
    updatedAt: "2026-03-05T12:00:00.000Z",
  },
  {
    documentId: "doc-branch-firewall-recovery",
    systemId: "sys-branch-circuit",
    relationshipLabel: "carrier dependency",
    createdAt: "2025-08-20T12:00:00.000Z",
    updatedAt: "2026-03-05T12:00:00.000Z",
  },
  {
    documentId: "doc-contoso-isp-contacts",
    systemId: "sys-branch-circuit",
    relationshipLabel: "supports service",
    createdAt: "2025-10-02T10:00:00.000Z",
    updatedAt: "2026-02-20T11:15:00.000Z",
  },
  {
    documentId: "doc-m365-break-glass",
    systemId: "sys-sharepoint-tenant",
    relationshipLabel: "restore target",
    createdAt: "2025-09-15T08:00:00.000Z",
    updatedAt: "2026-03-27T07:30:00.000Z",
  },
  {
    documentId: "doc-m365-break-glass",
    systemId: "sys-entra-break-glass",
    relationshipLabel: "access dependency",
    createdAt: "2025-09-15T08:00:00.000Z",
    updatedAt: "2026-03-27T07:30:00.000Z",
  },
  {
    documentId: "doc-hyperv-cluster-notes",
    systemId: "sys-hyperv-cluster",
    relationshipLabel: "primary platform",
    createdAt: "2025-07-22T15:00:00.000Z",
    updatedAt: "2026-03-18T18:00:00.000Z",
  },
  {
    documentId: "doc-hyperv-cluster-notes",
    systemId: "sys-san-fabric",
    relationshipLabel: "storage dependency",
    createdAt: "2025-07-22T15:00:00.000Z",
    updatedAt: "2026-03-18T18:00:00.000Z",
  },
  {
    documentId: "doc-veeam-renewal-notes",
    systemId: "sys-backup-platform",
    relationshipLabel: "vendor owner",
    createdAt: "2025-12-05T12:00:00.000Z",
    updatedAt: "2026-03-15T14:00:00.000Z",
  },
  {
    documentId: "doc-domain-controller-restore",
    systemId: "sys-domain-controller-01",
    relationshipLabel: "primary recovery target",
    createdAt: "2025-06-01T11:00:00.000Z",
    updatedAt: "2026-03-12T10:30:00.000Z",
  },
  {
    documentId: "doc-domain-controller-restore",
    systemId: "sys-hyperv-cluster",
    relationshipLabel: "hosting platform",
    createdAt: "2025-06-01T11:00:00.000Z",
    updatedAt: "2026-03-12T10:30:00.000Z",
  },
  {
    documentId: "doc-print-vendor-contact-list",
    systemId: "sys-print-fleet",
    relationshipLabel: "supports fleet",
    createdAt: "2025-11-21T09:00:00.000Z",
    updatedAt: "2026-03-18T12:15:00.000Z",
  },
];

export const documentRevisionFixtures: DocumentationFixtureRevision[] = [
  {
    documentId: "doc-password-reset-sop",
    revisionType: "review_completed",
    summary: "Reviewed password reset steps after the latest MFA cleanup policy update.",
    changedFields: ["reviewState", "reviewDueAt", "lastReviewedAt"],
    actorLabel: "Solo IT Operator",
    reviewState: "current",
    reviewDueAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-03-01T15:00:00.000Z",
  },
  {
    documentId: "doc-branch-firewall-recovery",
    revisionType: "review_completed",
    summary: "Validated the branch firewall recovery steps ahead of the current failover window.",
    changedFields: ["reviewState", "reviewDueAt", "lastReviewedAt"],
    actorLabel: "Network Operations",
    reviewState: "current",
    reviewDueAt: "2026-03-10T00:00:00.000Z",
    createdAt: "2025-12-10T16:00:00.000Z",
  },
  {
    documentId: "doc-branch-firewall-recovery",
    revisionType: "source_sync",
    summary: "Updated circuit handoff and LTE fallback contact details.",
    changedFields: ["contentText", "searchText", "sourceUpdatedAt", "contentUpdatedAt"],
    actorLabel: "Contoso Network Sync",
    reviewState: "overdue",
    reviewDueAt: "2026-03-10T00:00:00.000Z",
    createdAt: "2026-03-05T12:00:00.000Z",
  },
  {
    documentId: "doc-contoso-isp-contacts",
    revisionType: "source_sync",
    summary: "Refreshed the NOC and after-hours dispatch contact list after circuit maintenance.",
    changedFields: ["contentText", "sourceUpdatedAt", "contentUpdatedAt"],
    actorLabel: "Vendor Notes Import",
    reviewState: "current",
    reviewDueAt: "2026-05-15T00:00:00.000Z",
    createdAt: "2026-02-20T11:15:00.000Z",
  },
  {
    documentId: "doc-m365-break-glass",
    revisionType: "source_sync",
    summary: "Added SharePoint restore validation steps after a tenant permission change.",
    changedFields: ["contentText", "searchText", "sourceUpdatedAt", "contentUpdatedAt"],
    actorLabel: "Microsoft 365 Sync",
    reviewState: "unreviewed",
    reviewDueAt: "2026-04-15T00:00:00.000Z",
    createdAt: "2026-03-27T07:30:00.000Z",
  },
  {
    documentId: "doc-hyperv-cluster-notes",
    revisionType: "review_completed",
    summary: "Reviewed SAN zoning and CSV ownership notes with the virtualization owner.",
    changedFields: ["reviewState", "reviewDueAt", "lastReviewedAt"],
    actorLabel: "Infrastructure",
    reviewState: "current",
    reviewDueAt: "2026-04-20T00:00:00.000Z",
    createdAt: "2026-01-05T13:00:00.000Z",
  },
  {
    documentId: "doc-hyperv-cluster-notes",
    revisionType: "source_sync",
    summary: "Updated MPIO validation notes after SAN firmware maintenance.",
    changedFields: ["contentText", "sourceUpdatedAt", "contentUpdatedAt"],
    actorLabel: "Hyper-V Maintenance Export",
    reviewState: "current",
    reviewDueAt: "2026-04-20T00:00:00.000Z",
    createdAt: "2026-03-18T18:00:00.000Z",
  },
  {
    documentId: "doc-veeam-renewal-notes",
    revisionType: "source_sync",
    summary: "Updated the Veeam renewal quote, support terms, and co-term date.",
    changedFields: ["summary", "contentText", "sourceUpdatedAt", "contentUpdatedAt"],
    actorLabel: "Veeam Renewal Import",
    reviewState: "current",
    reviewDueAt: "2026-06-10T00:00:00.000Z",
    createdAt: "2026-03-15T14:00:00.000Z",
  },
  {
    documentId: "doc-new-hire-workstation-setup",
    revisionType: "review_completed",
    summary: "Reviewed the onboarding workstation flow after the latest baseline update.",
    changedFields: ["reviewState", "reviewDueAt", "lastReviewedAt"],
    actorLabel: "Service Desk Lead",
    reviewState: "due_soon",
    reviewDueAt: "2026-04-03T00:00:00.000Z",
    createdAt: "2026-02-28T16:00:00.000Z",
  },
  {
    documentId: "doc-domain-controller-restore",
    revisionType: "review_completed",
    summary: "Validated the authoritative restore and replication checks during DR prep.",
    changedFields: ["reviewState", "reviewDueAt", "lastReviewedAt"],
    actorLabel: "Infrastructure Services",
    reviewState: "current",
    reviewDueAt: "2026-05-30T00:00:00.000Z",
    createdAt: "2026-03-12T10:30:00.000Z",
  },
  {
    documentId: "doc-print-vendor-contact-list",
    revisionType: "metadata_review",
    summary: "Expanded the print vendor contacts to cover both HQ and Branch Office.",
    changedFields: ["metadataAssignments"],
    actorLabel: "Workplace Services",
    reviewState: "current",
    reviewDueAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-03-18T12:15:00.000Z",
  },
  {
    documentId: "doc-site-oncall-handoff",
    revisionType: "source_sync",
    summary: "Updated badge access and emergency phone tree notes for the next on-call rotation.",
    changedFields: ["contentText", "sourceUpdatedAt", "contentUpdatedAt"],
    actorLabel: "Facilities Sync",
    reviewState: "current",
    reviewDueAt: "2026-05-20T00:00:00.000Z",
    createdAt: "2026-03-03T17:00:00.000Z",
  },
];

export const documentationFixtureSearchCases: DocumentationFixtureSearchCase[] = [
  {
    query: "sharepoint restore",
    filters: { q: "sharepoint restore" },
    expectedTopDocumentId: "doc-m365-break-glass",
    expectedOrderedDocumentIds: ["doc-m365-break-glass", "doc-domain-controller-restore"],
    expectedReasonCode: "content_match",
    summary: "SharePoint restore searches should surface the emergency tenant recovery document first.",
  },
  {
    query: "fiber noc circuit",
    filters: { q: "fiber noc circuit" },
    expectedTopDocumentId: "doc-contoso-isp-contacts",
    expectedOrderedDocumentIds: ["doc-contoso-isp-contacts", "doc-branch-firewall-recovery"],
    expectedReasonCode: "content_match",
    summary: "Carrier escalation searches should surface the Contoso contact list before the broader recovery runbook.",
  },
  {
    query: "hyper-v san",
    filters: { q: "hyper-v san" },
    expectedTopDocumentId: "doc-hyperv-cluster-notes",
    expectedOrderedDocumentIds: ["doc-hyperv-cluster-notes", "doc-domain-controller-restore"],
    expectedReasonCode: "content_match",
    summary: "Hyper-V storage searches should rank the infrastructure notes above adjacent recovery content.",
  },
  {
    query: "veeam renewal",
    filters: { q: "veeam renewal" },
    expectedTopDocumentId: "doc-veeam-renewal-notes",
    expectedOrderedDocumentIds: ["doc-veeam-renewal-notes", "doc-domain-controller-restore"],
    expectedReasonCode: "content_match",
    summary: "Renewal searches should surface the vendor note before unrelated backup recovery procedures.",
  },
];
