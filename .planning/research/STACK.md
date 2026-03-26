# Stack Research

## Recommended Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS or a small internal design system layered on semantic components
- **State/Data Fetching**: TanStack Query for async tenant data, lightweight local state for filters and panel state
- **Backend API**: Node.js + TypeScript with Fastify or Express
- **Database**: PostgreSQL for normalized operational data, audit logs, workflow runs, and searchable documentation metadata
- **Jobs/Sync**: Background worker process for scheduled connector syncs, workflow execution, and alert generation
- **Auth**: Microsoft Entra ID sign-in for operators, with role-based authorization in the app
- **Search**: PostgreSQL full-text search for v1 documentation search, with room to move to a dedicated search engine later
- **Hosting**: Internal server, Azure App Service, or container host with secure secret management

## Why This Stack Fits

- TypeScript across the stack lowers cognitive overhead for a solo builder.
- React is a strong fit for dashboard-heavy internal tooling with filters, tables, details, and guided task flows.
- PostgreSQL gives enough structure for assets, identities, workflow logs, and documentation relationships without overcomplicating v1.
- Scheduled sync workers are important because many dashboards need snapshots and trendable health status, not only live API calls.

## Integration Priorities

- Microsoft Graph
- Intune device data
- Entra ID users, groups, sign-ins, and role assignments
- Backup provider APIs or import adapters for backup status and restore-test evidence

## V1 Technical Principles

- Separate external connector logic from domain logic.
- Keep write actions explicit, reviewable, and fully logged.
- Normalize key entities early: users, devices, systems, sites, groups, workflows, documents.
- Design every module to degrade gracefully when a connector is partially unavailable.
