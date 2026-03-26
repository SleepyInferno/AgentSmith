# Architecture Research

## Proposed Components

### 1. Frontend Application

Responsibilities:
- Show dashboards, filtered tables, workflow runners, document search, and detail panels
- Surface prioritized queues such as "needs action", "offboarding in progress", or "backups missing proof"
- Present review screens before any sensitive write action

### 2. API Layer

Responsibilities:
- Serve normalized data to the frontend
- Enforce authorization and audit logging
- Orchestrate workflow runs and expose connector health

### 3. Connector Services

Responsibilities:
- Pull data from Microsoft Graph, Intune, Entra ID, and backup systems
- Translate external schemas into internal canonical models
- Isolate provider-specific quirks from the rest of the application

### 4. Domain Modules

Responsibilities:
- Asset health scoring
- Lifecycle workflow execution
- Identity risk analysis
- Backup confidence analysis
- Documentation indexing and search

### 5. Data Store

Responsibilities:
- Persist normalized entities, sync snapshots, workflow templates, run logs, audit logs, and documents
- Support filter-heavy internal dashboards and full-text search

### 6. Background Job Runner

Responsibilities:
- Scheduled syncs
- Alert generation
- Workflow step execution where asynchronous follow-up is needed
- Document review reminders and stale-data detection

## Data Flow

1. External systems feed connector services.
2. Connector services normalize data into the application database.
3. Domain modules compute health scores, exceptions, drift findings, and workflow readiness.
4. API endpoints expose this curated data to the frontend.
5. Sensitive user actions flow from frontend -> API -> domain module -> connector service -> audit log.

## Build Order Implications

1. Start with platform foundations, canonical data model, and connector shell.
2. Build asset health first because it proves the shared entity model and creates immediate value.
3. Add onboarding/offboarding next because it depends on stable user, group, and device context.
4. Layer in privilege auditing and backup confidence on top of the same synced data foundation.
5. Add documentation assistant after the core operational entities exist so docs can be linked to real objects.
