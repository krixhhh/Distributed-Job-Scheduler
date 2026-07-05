# Distributed Job Scheduler

A production-grade, highly resilient, enterprise **Distributed Job Scheduler** built with Node.js Clean Architecture, TypeScript, Redis, BullMQ, Prisma, and SQLite/PostgreSQL. It features a modern glassmorphic dark-mode React 19 dashboard, automated failure diagnostics, sequential/parallel Directed Acyclic Graph (DAG) workflows, automatic worker recovery, and live telemetry tracking.

---

## 🏗️ Architecture Overview

The system consists of three main services communicating over REST, Redis queues, and a database:

```mermaid
graph TD
    Dashboard[React 19 Dashboard] <--> |REST API / JWT / HTTP-only Cookies| Backend[Express Backend API]
    APIKeys[Third-Party Triggers] --> |x-api-key Authentication| Backend
    Backend <--> |Prisma Client| Database[(SQLite/PostgreSQL Store)]
    Backend <--> |BullMQ / ioredis| Redis[(Redis Queue / Cache)]
    Worker[Worker Node Process] <--> |Atomic Locking & Claim| Redis
    Worker <--> |Heartbeats & Telemetry| Database
    Worker --> |Logging Service| Notification Service]
    Worker --> |Alert Dispatches| Integrations[Slack / Discord / SMTP]
```

### Core Architecture Layers (Backend)
* **Shared Package**: Housing static Zod validation schemas (registration, queues, job definitions) and TypeScript contracts shared between the frontend, backend, and workers.
* **Repositories**: Coordinating data querying bounds and mutations using Prisma.
* **Services**: Core business logic containing scheduling queues, DAG topological sort traversal engines, metrics aggregation, and JWT generation.
* **Controllers / Adapters**: Receiving REST requests, enforcing validation middleware filters, and serializing outputs.

---

## 🌟 Key Features

* **High-Throughput Queuing**: Powered by BullMQ and Redis for low-latency job processing.
* **Clean Architecture**: Decoupled, maintainable, and type-safe backend server using Clean Architecture principles.
* **Modern Developer Dashboard**: Glassmorphic, dark-mode visual interface built with React 19, Tailwind CSS, Recharts, and Framer Motion.
* **Failure Diagnostics**: Automatic runtime exception analysis, suggesting actionable markdown fixes for failing jobs directly on the dashboard.
* **DAG Workflows**: Orchestrate sequential and parallel job execution pipelines via topological task sorting.
* **Worker Monitor & Heartbeats**: Background worker nodes report CPU, memory, and active job metrics to the telemetry database.
* **Dead Letter Queue (DLQ)**: Failed tasks after maximum retries are forwarded to a DLQ database record for analysis.

---

## 🛠️ Tech Stack

* **Language**: TypeScript
* **Runtime**: Node.js (v20+)
* **Framework**: Express (Backend), React 19 (Frontend)
* **Database**: SQLite (Local development), PostgreSQL (Production-ready)
* **ORM**: Prisma Client
* **Queue Broker**: Redis & BullMQ
* **Styling**: Tailwind CSS
* **Build Tool**: Vite (Frontend), TSC (Backend/Worker/Shared)
* **Diagnostics Engine**: Automated Diagnostics API

---

## 📂 Folder Structure

```
Distributed_Job_Scheduler/
├── shared/                  # Type-safe validation schemas and interfaces
├── backend/                 # Clean Architecture REST API Server
│   ├── prisma/              # Prisma configuration, schemas, and seeds
│   ├── src/                 # REST API source code
│   │   ├── config/          # Client initializations (Prisma, Winston, Redis)
│   │   ├── controllers/     # Express route controller mappings
│   │   ├── errors/          # Custom HTTP exceptions and global handlers
│   │   ├── middleware/      # Rate-limiting, JWT, validation filters
│   │   ├── repositories/    # Database query abstractions
│   │   ├── routes/          # Express routing endpoints
│   │   ├── services/        # Topologic DAGs, metrics, queue triggers
│   │   └── server.ts        # Entry bootstrap runner
├── worker/                  # Background task worker engine
│   ├── src/                 # Processing worker source
│   │   ├── config/          # Redis connection limits
│   │   ├── services/        # Diagnostics API connectors, notification dispatchers
│   │   ├── workers/         # Dynamic BullMQ workers, recovery timers, locks
│   │   └── index.ts         # Process launcher
├── frontend/                # React 19 developer dashboard
│   ├── src/                 # React dashboard code
│   │   ├── components/      # Glassmorphic component styles
│   │   ├── context/         # Auth contexts
│   │   ├── pages/           # Metrics charts, DAG workflow canvases, settings
│   │   └── services/        # Axios API clients
│   └── vite.config.ts       # Proxy configuration for dev server
├── docker-compose.yml       # Docker orchestrator stack config
├── nginx.conf               # Nginx reverse proxy configuration
└── package.json             # Root monorepo workspace configuration
```

---

## 🚀 Getting Started & Local Setup

### Option A: Local Run (No Docker Required)

This is the fastest way to run the application on Windows without needing a PostgreSQL database server.

#### 1. Setup Redis (Windows Native)
1. Open PowerShell as **Administrator** and install Redis:
   ```powershell
   winget install --id taizod1024.redis-windows-fork --accept-package-agreements --accept-source-agreements --silent
   ```
2. Start the local Redis Server:
   ```powershell
   redis-server --port 6379
   ```

#### 2. Configure Environment
1. Copy `.env.example` to `.env` in the root workspace folder.
2. The default SQLite connection string is already pre-configured to use the shared local file:
   ```env
   DATABASE_URL="file:C:/Users/KRISH/Downloads/Distributed_Job_Scheduler/backend/prisma/dev.db"
   ```

#### 3. Install Dependencies & Build
1. In the project root, install packages:
   ```bash
   npm install
   ```
2. Build the shared schemas and application bundles:
   ```bash
   npm run build:shared
   npm run build -w backend
   npm run build -w worker
   ```

#### 4. Initialize Database
Initialize the database schemas and insert the pre-seeded default workspace data:
```bash
cd backend
npx prisma db push --schema=prisma/schema.prisma
npx prisma db seed --schema=prisma/schema.prisma
```

#### 5. Launch Services
Open separate terminals for each service from the project root:
* **Start API Server**: `npm run start -w backend`
* **Start Worker Node**: `npm run start -w worker`
* **Start Frontend UI**: `npm run dev -w frontend`

Once started, navigate to [http://localhost:5173](http://localhost:5173) in your browser.

---

### Option B: Dockerized Stack (Docker Desktop Required)

To spin up the entire application stack using a single command (requires Docker Desktop):

```bash
docker compose up --build
```

This boots:
1. **PostgreSQL Container** (Postgres 15 on port `5432`)
2. **Redis Container** (Redis 7 on port `6379`)
3. **Backend API** (Exposed on `http://localhost:4000`)
4. **Worker Node** (Auto-restarts when Postgres/Redis are ready)
5. **Frontend Dashboard** (Served through Nginx proxy on `http://localhost` / Port `80`)

---

## 🔑 Seeded Test Credentials

The database is pre-seeded with a default workspace and queue, allowing you to log in immediately:

* **Email**: `admin@scheduler.com`
* **Password**: `AdminPassword123!`
* **Seeded Organization**: `Default Organization`
* **Seeded Project**: `Default Project`
* **Seeded Queue**: `default-queue` (active)

---

## 🔌 API Endpoints

### Authentication
* `POST /api/auth/register` - Create user and organization
* `POST /api/auth/login` - Authenticate user and start secure session (HTTP-only cookie + JWT)
* `POST /api/auth/logout` - Clear user session cookies
* `POST /api/auth/refresh` - Silently refresh access token

### Projects & Queues
* `GET /api/projects` - List user projects
* `POST /api/projects` - Create project workspace
* `GET /api/projects/:projectId/queues` - List queues under project
* `POST /api/projects/:projectId/queues` - Create queue (supports linear/exponential/fixed retry policies)
* `POST /api/projects/:projectId/queues/:queueId/pause` - Pause queue job consumption
* `POST /api/projects/:projectId/queues/:queueId/resume` - Resume queue job consumption

### Job Management
* `GET /api/projects/:projectId/jobs` - List, search, and filter jobs
* `POST /api/projects/:projectId/jobs` - Dispatch new job (immediate, delayed, or cron schedule)
* `GET /api/jobs/:jobId` - Fetch execution history and logs

### Workers & Telemetry
* `GET /api/workers` - Get live worker node statuses and resource statistics
* `GET /api/projects/:projectId/metrics` - Fetch real-time job execution telemetry and queue depth metrics

---

## 📸 Screenshots

### Operations Dashboard
A dark-mode analytics console providing visual tracking of active worker nodes, memory consumption, queue size, and detailed status logs.

### Execution Logs
When a task fails (e.g. contains `"fail"` in payload), the diagnostics engine automatically analyzes the stack trace and presents actionable code suggestions.

---

## 📝 Assumptions

1. **Local SQLite Connection**: While the production target utilizes a containerized PostgreSQL database, local development defaults to SQLite to guarantee instantaneous, manual-free startup.
2. **NodeNext Resolution**: Import statements contain `.js` file extensions in compliance with TypeScript `NodeNext` ESM module resolution.
3. **Diagnostics API Configuration**: If the diagnostics API key is omitted, the worker handles failure scenarios seamlessly but skips diagnostics explanation suggestions.

---

## 🔮 Future Improvements

* **Multi-tenant Role Based Access Control (RBAC)**: Support project-level invitation tokens with Read, Write, and Administrator roles.
* **Distributed Locking (Redlock)**: Implement resilient distributed locking to ensure zero-duplicate processing across horizontally scaled worker networks.
* **Advanced DAG Workflow Canvas**: Drag-and-drop task builder to define workflow graphs directly in the browser dashboard.
* **Webhooks & Custom Dispatches**: Build third-party event listeners, enabling queues to post back completed job payloads to specified webhooks.
