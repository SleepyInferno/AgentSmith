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

You can run AgentSmith either **locally** or with **Docker**. Choose the path that fits your setup.

### Option A: Local Setup

| Prerequisite | Minimum Version | Download Link |
|---|---|---|
| **Node.js** | v20.0.0 or later | [https://nodejs.org/en/download](https://nodejs.org/en/download) |
| **pnpm** | v10.0.0 or later | [https://pnpm.io/installation](https://pnpm.io/installation) |
| **PostgreSQL** | 15 or later | [https://www.postgresql.org/download/](https://www.postgresql.org/download/) |
| **pgvector extension** | 0.5.0 or later | [https://github.com/pgvector/pgvector#installation](https://github.com/pgvector/pgvector#installation) |
| **Git** | 2.30 or later | [https://git-scm.com/downloads](https://git-scm.com/downloads) |

### Option B: Docker

| Prerequisite | Minimum Version | Download Link |
|---|---|---|
| **Docker** | 24.0 or later | [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/) |
| **Docker Compose** | v2.20 or later (included with Docker Desktop) | [https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/) |
| **Git** | 2.30 or later | [https://git-scm.com/downloads](https://git-scm.com/downloads) |

### Optional (for full feature set)

These are the same regardless of whether you run locally or with Docker:

| Prerequisite | Purpose | Download / Setup Link |
|---|---|---|
| **Microsoft Entra ID (Azure AD) tenant** | SSO authentication via OpenID Connect | [https://learn.microsoft.com/en-us/entra/fundamentals/create-new-tenant](https://learn.microsoft.com/en-us/entra/fundamentals/create-new-tenant) |
| **Microsoft Intune license** | Live device inventory and compliance sync | [https://learn.microsoft.com/en-us/mem/intune/fundamentals/what-is-intune](https://learn.microsoft.com/en-us/mem/intune/fundamentals/what-is-intune) |
| **OpenAI API key** | Document classification, summarization, tagging, and embedding | [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

> **Note:** AgentSmith works without any of the optional prerequisites. The first-run bootstrap creates a local admin account, and all integration features gracefully degrade when credentials are not configured.

---

## Installation (Local)

> Skip to [Installation (Docker)](#installation-docker) if you prefer containers.

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

> **Important:** Replace `SESSION_SECRET` with a strong random string (at least 32 characters). This secret is used to derive encryption keys for credential storage. Generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4. Set up the database

You need PostgreSQL with the pgvector extension. Pick whichever approach you prefer:

#### Use Docker for just the database (recommended)

This gives you PostgreSQL + pgvector in one command, no local install required:

```bash
docker run -d --name agentsmith-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agentsmith \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

The pgvector extension is already included. Enable it:

```bash
docker exec -i agentsmith-db psql -U postgres -d agentsmith -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### Or install PostgreSQL + pgvector natively

<details>
<summary>Ubuntu/Debian</summary>

```bash
sudo apt install postgresql-16 postgresql-16-pgvector
sudo -u postgres createdb agentsmith
sudo -u postgres psql -d agentsmith -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
</details>

<details>
<summary>macOS (Homebrew)</summary>

```bash
brew install postgresql@16 pgvector
brew services start postgresql@16
createdb agentsmith
psql -d agentsmith -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
</details>

<details>
<summary>Windows</summary>

1. Download and install PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Download pgvector from [https://github.com/pgvector/pgvector/releases](https://github.com/pgvector/pgvector/releases) and follow the Windows instructions in the pgvector README
3. Create the database and enable the extension:
```sql
CREATE DATABASE agentsmith;
\c agentsmith
CREATE EXTENSION IF NOT EXISTS vector;
```
</details>

### 5. Apply database migrations

The migrations are raw SQL files. Apply them in order:

```bash
psql -d agentsmith -f prisma/migrations/20260328_0602_documentation_search/migration.sql
psql -d agentsmith -f prisma/migrations/20260328_0605_documentation_search_hardening/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0001_user_auth_fields/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0002_integration_credential_system_key/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0003_pgvector_document_embedding/migration.sql
psql -d agentsmith -f prisma/migrations/20260330_0004_integration_credential_test_fields/migration.sql
psql -d agentsmith -f prisma/migrations/20260331_0001_device_compliance_models/migration.sql
psql -d agentsmith -f prisma/migrations/20260401_0001_app_setting_ingest_models/migration.sql
```

> If you used the Docker database, prefix with:
> `docker exec -i agentsmith-db psql -U postgres -d agentsmith < prisma/migrations/.../migration.sql`

### 6. Generate the Prisma client

```bash
pnpm db:generate
```

### 7. Start the development servers

```bash
pnpm dev
```

This starts both servers in parallel:

- **API:** [http://localhost:3001](http://localhost:3001)
- **Web:** [http://localhost:5173](http://localhost:5173)

### 8. First-run setup

On first launch, the app redirects to a setup screen where you create a local admin account. No Entra ID needed.

---

## Installation (Docker)

Run the entire stack (API, frontend, and database) with Docker Compose. No Node.js or PostgreSQL install required on your host machine.

### 1. Clone the repository

```bash
git clone https://github.com/SleepyInferno/AgentSmith.git
cd AgentSmith
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`. When running with Docker Compose, change `DATABASE_URL` to point at the `db` service name instead of `localhost`:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/agentsmith?schema=public
PORT=3001
WEB_ORIGIN=http://localhost:5173
SESSION_SECRET=generate-a-strong-random-secret-here

# Optional - Microsoft Entra ID (leave empty to use local auth only)
ENTRA_TENANT_ID=
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_REDIRECT_URI=http://localhost:3001/auth/callback
```

> **Important:** Replace `SESSION_SECRET` with a strong random string (at least 32 characters). Generate one with:
> ```bash
> docker run --rm node:20-slim node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Create `docker-compose.yml`

Create this file in the project root:

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: agentsmith
    ports:
      - "5432:5432"
    volumes:
      - agentsmith-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    env_file: .env
    ports:
      - "3001:3001"

  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: web
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "5173:5173"

volumes:
  agentsmith-db:
```

### 4. Create `Dockerfile`

Create this file in the project root:

```dockerfile
# ── Base ──
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ── Build shared package ──
FROM deps AS build-shared
COPY packages/shared/ packages/shared/
RUN pnpm --filter @agentsmith/shared build

# ── Build Prisma client ──
FROM build-shared AS prisma
COPY prisma/ prisma/
RUN pnpm db:generate

# ── API target ──
FROM prisma AS api
COPY apps/api/ apps/api/
EXPOSE 3001
CMD ["pnpm", "--filter", "@agentsmith/api", "dev"]

# ── Web target ──
FROM build-shared AS web
COPY apps/web/ apps/web/
EXPOSE 5173
CMD ["pnpm", "--filter", "@agentsmith/web", "dev", "--", "--host", "0.0.0.0"]
```

### 5. Start everything

```bash
docker compose up -d --build
```

### 6. Apply database migrations

Once the `db` container is healthy (give it a few seconds on first start):

```bash
# Enable pgvector
docker exec -i agentsmith-db-1 psql -U postgres -d agentsmith -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Apply all migrations in order
for f in prisma/migrations/*/migration.sql; do
  echo "Applying $f..."
  docker exec -i agentsmith-db-1 psql -U postgres -d agentsmith < "$f"
done
```

> **Windows (PowerShell):**
> ```powershell
> docker exec -i agentsmith-db-1 psql -U postgres -d agentsmith -c "CREATE EXTENSION IF NOT EXISTS vector;"
> Get-ChildItem prisma\migrations\*\migration.sql | Sort-Object FullName | ForEach-Object {
>   Write-Host "Applying $($_.FullName)..."
>   Get-Content $_.FullName | docker exec -i agentsmith-db-1 psql -U postgres -d agentsmith
> }
> ```

### 7. Open the app

- **Web:** [http://localhost:5173](http://localhost:5173)
- **API:** [http://localhost:3001](http://localhost:3001)

On first launch, the app redirects to a setup screen where you create a local admin account.

### Useful Docker commands

```bash
# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f api

# Stop everything
docker compose down

# Stop and remove database volume (full reset)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build
```

---

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

### Local

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

### Docker

```bash
# API unit tests
docker compose exec api pnpm --filter @agentsmith/api test

# Web unit tests
docker compose exec web pnpm --filter @agentsmith/web test
```

> Playwright E2E tests require a browser and are best run on the host machine rather than inside a container.

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

> **Docker note:** If running with Docker, the source and output folders must be accessible inside the `api` container. Add volume mounts to the `api` service in `docker-compose.yml`:
> ```yaml
> api:
>   volumes:
>     - /path/on/host/source:/data/ingest/source
>     - /path/on/host/output:/data/ingest/output
> ```
> Then configure `/data/ingest/source` and `/data/ingest/output` as the folder paths in the UI.

## Security

- **Credentials are never sent to the browser.** Integration secrets are stored server-side with AES-256-GCM encryption. The API only returns `{ configured: boolean }` to the frontend.
- **Session management** uses secure, HTTP-only cookies with session ID regeneration on every login.
- **Local auth** uses bcrypt password hashing with timing-safe comparison to prevent user enumeration.
- **Bootstrap endpoint** is DB-locked after the first admin is created -- it cannot be re-opened via configuration.
- **All API routes** behind `/api/` (except health and auth) require an authenticated session.

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (`localhost` for local, `db` for Docker Compose) |
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
