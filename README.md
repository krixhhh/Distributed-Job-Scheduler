# Distributed Job Scheduler

A distributed job scheduling application built using React, Node.js, TypeScript, Prisma, Redis and SQLite. It allows users to create queues, schedule jobs, monitor workers and manage workflows through a modern web dashboard.

---

##  Key Features

* **High-Throughput Queuing**: Powered by BullMQ and Redis for low-latency job processing.
* **Clean Architecture**: Organized backend with reusable services and APIs.
* **Modern Developer Dashboard**: Built with React, Tailwind CSS, Recharts and Framer Motion.
* **DAG Workflows**: Orchestrate sequential and parallel job execution pipelines via topological task sorting.
* **Worker Monitor & Heartbeats**: Background worker nodes report CPU, memory, and active job metrics to the telemetry database.
* **Dead Letter Queue (DLQ)**: Failed tasks after maximum retries are forwarded to a DLQ database record for analysis.

---

##  Tech Stack

* **Language**: TypeScript
* **Runtime**: Node.js (v20+)
* **Framework**: Express (Backend), React 19 (Frontend)
* **Database**: SQLite, PostgreSQL
* **ORM**: Prisma Client
* **Queue Broker**: Redis & BullMQ
* **Styling**: Tailwind CSS
* **Build Tool**: Vite (Frontend), TSC (Backend/Worker/Shared)

---

