# AgentSmith - Solo IT Ops Suite

An internal operations console built for one-person or very small IT teams. AgentSmith combines Microsoft tenant visibility with guided operational workflows so a solo admin can spot risk fast, act from one place, and leave behind usable operational history instead of scattered notes.

## What It Does

AgentSmith surfaces the highest-risk issues first and helps complete critical operational workflows consistently without relying on memory. It covers:

- **Asset Health Dashboard** - Device risk scoring, compliance state, encryption/antivirus/patch signal tracking, and a prioritized maintenance queue
- **Lifecycle Automation** - Guided onboarding and offboarding checklists with step-by-step tracking, audit trail, and ticket references
- **Network Visibility** - Sites, WAN links, LAN segments, firewalls, switches, access points, and topology mapping with finding severity and freshness indicators
- **Backup Confidence** - Coverage policy enforcement, restore test tracking, evidence source management, and confidence scoring per protected system
- **Documentation Assistant** - SOP, contact, infrastructure note, and recovery procedure management with full-text search, metadata review, and revision history
- **Intune Device Sync** - Live device inventory from Microsoft Intune via Graph API, compliance policy tracking, freshness indicators, and manual sync trigger
- **Document Ingest Pipeline** - Automated file watcher that parses documents (markdown, text, docx, pdf), uses OpenAI to classify/summarize/tag/embed, organizes files by category, and creates searchable document entries with vector embeddings
- **Integrations Settings** - Server-side credential storage (AES-256-GCM encrypted) for Intune and OpenAI with connection health testing
- **First-Run Bootstrap** - One-time local admin setup that works without requiring Microsoft Entra ID pre-configuration
- **Audit Trail** - Every significant action (login, sync, metadata review) is recorded with actor, target, result, and timestamp

## Prerequisites

Before running AgentSmith, you need the following installed on your machine:

### Required

| Prerequisite | Minimum Version | Download Link |
|---|---|---|
| **Node.js** | v20.0.0 or later | [https://nodejs.org/en/download](https://nodejs.org/en/download) |
| **pnpm** | v10.0.0 or later | [https://pnpm.io/installation](https://pnpm.io/installation) |
| **PostgreSQL** | 15 or later | [https://www.postgresql.org/download/](https://www.postgresql.org/download/) |
| **pgvector extension** | 0.5.0 or later | [https://github.com/pgvector/pgvector#installation](https://github.com/pgvector/pgvector#installation) |
| **Git** | 2.30 or later | [https://git-scm.com/downloads](https://git-scm.com/downloads) |

### Optional (for full feature set)

| Prerequisite | Purpose | Download / Setup Link |
|---|---|---|
| **Microsoft Entra ID (Azure AD) tenant** | SSO authentication via OpenID Connect | [https://learn.microsoft.com/en-us/entra/fundamentals/create-new-tenant](https://learn.microsoft.com/en-us/entra/fundamentals/create-new-tenant) |
| **Microsoft Intune license** | Live device inventory and compliance sync | [https://learn.microsoft.com/en-us/mem/intune/fundamentals/what-is-intune](https://learn.microsoft.com/en-us/mem/intune/fundamentals/what-is-intune) |
| **OpenAI API key** | Document classification, summarization, tagging, and embedding | [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

> **Note:** AgentSmith works without any of the optional prerequisites. The first-run bootstrap creates a local admin account, and all integration features gracefully degrade when credentials are not configured.

### Installing pgvector

pgvector is required for the document embedding and vector search features. Installation varies by platform:

**Ubuntu/Debian:**
```bash
sudo apt install postgresql-16-pgvector
```

**macOS (Homebrew):**
```bash
brew install pgvector
```

**Windows:**
Download from [https://github.com/pgvector/pgvector/releases](https://github.com/pgvector/pgvector/releases) and follow the Windows installation instructions in the pgvector README.

**Docker (recommended for development):**
```bash
docker run -d --name agentsmith-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agentsmith \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

After installation, enable the extension in your database:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/SleepyInferno/AgentSmith.git
cd AgentSmith
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy the example environment file and update it with your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentsmith?schema=public
PORT=3001
WEB_ORIGIN=http://localhost:5173
SESSION_SECRET=generate-a-strong-random-secret-here

# Optional - Microsoft Entra ID (leave empty to use local auth only)
ENTRA_TENANT_ID=
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_REDIRECT_URI=http://localhost:3001/auth/callback
```

> **Important:** Replace `SESSION_SECRET` with a strong random string (at least 32 characters). This secret is used to derive encryption keys for credential storage. You can generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Set up the database

Create the PostgreSQL database and apply migrations:

```bash
createdb agentsmith
```

Apply the Prisma migrations manually by running the SQL files in `prisma/migrations/` in order against your database. The migrations are raw SQL files designed to be applied with `psql` or any PostgreSQL client:

```bash
# Apply each migration in order
psql -d agentsmith -f prisma/migrations/20260328_0602_documentation_search/migration.sql
psql -d agentsmith -f prisma/migrations/20260328_0605_documentation_search_hardening/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0001_user_auth_fields/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0002_integration_credential_system_key/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0003_pgvector_document_embedding/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0004_integration_credential_test_fields/migration.sql
psql -d agentsmith -f prisma/migrations/20260331_0001_device_compliance_models/migration.sql
psql -d agentsmith -f prisma/migrations/20260401_0001_app_setting_ingest_models/migration.sql
```

> **Note:** Migration `20260330_0003_pgvector_document_embedding` requires the pgvector extension to be installed and enabled first.

### 5. Generate the Prisma client

```bash
pnpm db:generate
```

### 6. Start the development servers

```bash
pnpm dev
```

This starts both the API server (port 3001) and the web frontend (port 5173) in parallel.

- **API:** [http://localhost:3001](http://localhost:3001)
- **Web:** [http://localhost:5173](http://localhost:5173)

### 7. First-run setup

On first launch, the app will redirect you to a setup screen where you can create a local admin account. No Microsoft Entra ID configuration is required for initial setup.

## Project Structure

```
AgentSmith/
  apps/
    api/          Fastify API server (TypeScript, Node.js)
    web/          React frontend (Vite, TypeScript)
  packages/
    shared/       Shared types and environment validation (Zod)
  prisma/
    schema.prisma Database schema
    migrations/   Raw SQL migration files
  .env.example    Environment variable template
```

### Tech Stack

**Backend:**
- [Fastify](https://fastify.dev/) - HTTP server framework
- [Prisma](https://www.prisma.io/) - Database ORM and schema management
- [PostgreSQL](https://www.postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector) - Relational database with vector search
- [OpenAI SDK](https://github.com/openai/openai-node) - Document classification and embeddings
- [Microsoft Graph Client](https://github.com/microsoftgraph/msgraph-sdk-javascript) - Intune device sync
- [chokidar](https://github.com/paulmillr/chokidar) - File system watcher for document ingest
- [mammoth](https://github.com/mwilliamson/mammoth.js) - DOCX parsing
- [unpdf](https://github.com/nicolo-ribaudo/unpdf) - PDF text extraction
- [js-tiktoken](https://github.com/openai/tiktoken) - Token counting for text chunking
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - Password hashing for local auth

**Frontend:**
- [React 19](https://react.dev/) - UI framework
- [Vite](https://vite.dev/) - Build tool and dev server
- [React Router v7](https://reactrouter.com/) - Client-side routing
- [TanStack Query](https://tanstack.com/query/) - Server state management and data fetching
- [TanStack Table](https://tanstack.com/table/) - Data table with sorting, filtering, and pagination

**Testing:**
- [Node.js Test Runner](https://nodejs.org/api/test.html) - API unit tests
- [Vitest](https://vitest.dev/) - Frontend unit tests
- [Playwright](https://playwright.dev/) - End-to-end browser tests
- [Testing Library](https://testing-library.com/) - React component testing

## Running Tests

```bash
# Run all tests (API unit + web unit + Playwright E2E)
pnpm test

# Run only API tests
pnpm test:api

# Run only web tests (unit + E2E)
pnpm test:web

# Run individual test suites
pnpm --filter @agentsmith/api test     # API unit tests
pnpm --filter @agentsmith/web test     # Web unit tests (Vitest)
pnpm --filter @agentsmith/web test:e2e # Playwright E2E tests
```

Before running Playwright tests for the first time, install the browsers:

```bash
npx playwright install
```

## Configuring Integrations

After initial setup, configure integrations from the **Settings** page (`/settings`) in the web UI:

### Microsoft Intune

1. Register an app in Microsoft Entra ID with the following Graph API permissions:
   - `DeviceManagementManagedDevices.Read.All`
   - `DeviceManagementConfiguration.Read.All`
2. Enter the Tenant ID, Client ID, and Client Secret on the Intune integration section
3. Click "Test Connection" to verify
4. Use "Sync Now" on the device inventory page to pull devices

### OpenAI

1. Create an API key at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Enter the API key and select a model on the OpenAI integration section
3. Click "Test Connection" to verify

### Document Ingest

1. Configure the source folder (where documents are placed) and output folder (where classified copies go)
2. Click "Save" to persist the paths and start the file watcher
3. Drop `.md`, `.txt`, `.docx`, or `.pdf` files into the source folder
4. The watcher automatically parses, classifies, summarizes, tags, and embeds each document
5. Use "Trigger Ingest" for a manual scan of all files in the source folder

## Security

- **Credentials are never sent to the browser.** Integration secrets are stored server-side with AES-256-GCM encryption. The API only returns `{ configured: boolean }` to the frontend.
- **Session management** uses secure, HTTP-only cookies with session ID regeneration on every login.
- **Local auth** uses bcrypt password hashing with timing-safe comparison to prevent user enumeration.
- **Bootstrap endpoint** is DB-locked after the first admin is created -- it cannot be re-opened via configuration.
- **All API routes** behind `/api/` (except health and auth) require an authenticated session.

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `PORT` | No | `3001` | API server port |
| `WEB_ORIGIN` | Yes | - | Frontend URL for CORS (e.g., `http://localhost:5173`) |
| `SESSION_SECRET` | Yes | - | Secret for session signing and credential encryption key derivation |
| `ENTRA_TENANT_ID` | No | - | Microsoft Entra ID tenant ID (leave empty for local-only auth) |
| `ENTRA_CLIENT_ID` | No | - | Entra ID application (client) ID |
| `ENTRA_CLIENT_SECRET` | No | - | Entra ID client secret |
| `ENTRA_REDIRECT_URI` | No | - | OAuth callback URL (e.g., `http://localhost:3001/auth/callback`) |
| `DEV_AUTH_BYPASS` | No | `false` | Skip authentication in development (do not use in production) |

## License

This project is proprietary and not licensed for redistribution.
