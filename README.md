# 📊 MonitoringDemo — End-to-End Observability with .NET Aspire

A monitoring demo featuring a **.NET Minimal API** backend with OpenTelemetry instrumentation, a lean **React** status page, **PostgreSQL**, and self-hosted **Prometheus** + **Grafana** — all orchestrated by **Aspire 13** on **.NET 10**.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    .NET Aspire AppHost                       │
│                    (Orchestrator)                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  PostgreSQL   │  │  Prometheus  │  │     Grafana      │   │
│  │    :5432      │  │    :9090     │  │     :3000        │   │
│  │  + pgAdmin    │  │  (scrapes)   │  │  (visualizes)    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │
│         │                 │                                  │
│  ┌──────┴───────┐         │                                 │
│  │  API Service  ├────────┘  /metrics                       │
│  │  .NET 10      │                                          │
│  │  :5000        │◄────── /api/* proxy                      │
│  └──────────────┘         │                                 │
│         ▲                 │                                 │
│  ┌──────┴───────────────────┐                               │
│  │  React Frontend          │                               │
│  │  Vite                    │                               │
│  │  :5173                   │                               │
│  └──────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

- **OpenTelemetry Instrumentation** — Custom metrics (counters, histograms, gauges), structured logs, and distributed traces
- **Background Order Simulator** — Generates realistic telemetry data every 2-5 seconds for demo purposes
- **Self-Hosted Monitoring Stack** — Prometheus scrapes `/metrics`, Grafana auto-provisions dashboards
- **Lean status page** — Live order statistics and recent activity, with detailed visualization left to Grafana
- **Aspire Orchestration** — Single `dotnet run` starts everything: database, monitoring, API, and frontend

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **.NET SDK** | 10.0+ | [Download](https://dotnet.microsoft.com/download/dotnet/10.0) |
| **Node.js** | 20+ | [Download](https://nodejs.org/) |
| **Docker Desktop** | Latest | Must be running for PostgreSQL, Prometheus, Grafana |

## 🚀 Quick Start

```bash
# 1. Clone and navigate
cd monitoring-demo

# 2. Install frontend dependencies
cd src/MonitoringDemo.Frontend
npm install
cd ../..

# 3. Run the entire stack via Aspire
dotnet run --project src/MonitoringDemo.AppHost
```

### Run from JetBrains Rider

1. Start Docker Desktop.
2. Open `MonitoringDemo.slnx` and let Rider restore the solution.
3. Select the shared **Aspire** run configuration in the toolbar.
4. Run or debug it. The Aspire dashboard opens at `https://localhost:17225`.

The profile uses the .NET SDK selected by `global.json` and the Aspire CLI version
paired with the AppHost SDK, so a separately installed global Aspire CLI is not required.

Aspire will automatically:
- Start PostgreSQL and seed demo data
- Launch Prometheus (scraping API metrics)
- Launch Grafana (pre-provisioned dashboards)
- Start the .NET API with OpenTelemetry
- Start the React dev server

## 🔗 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Aspire Dashboard** | `https://localhost:17225` | — |
| **React Frontend** | `http://localhost:5173` | — |
| **API Service** | `http://localhost:5000` | — |
| **API Metrics** | `http://localhost:5000/metrics` | — |
| **Prometheus** | `http://localhost:9090` | — |
| **Grafana** | `http://localhost:3000` | admin / admin |
| **pgAdmin** | Via Aspire Dashboard link | — |

## 📈 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products/{id}` | Get product by ID |
| `GET` | `/api/orders?limit=20` | Recent orders |
| `POST` | `/api/orders` | Create order `{productId, quantity}` |
| `GET` | `/api/orders/stats` | Dashboard statistics |
| `GET` | `/metrics` | Prometheus metrics |
| `GET` | `/health` | Health check |

## 🔭 Custom Telemetry

### Metrics (Prometheus)
- `orders_created_total` — Counter of created orders (tags: status, category)
- `orders_failed_total` — Counter of failed orders
- `order_processing_duration_ms` — Histogram of processing time
- `active_orders_count` — Gauge of pending orders

### Traces
- `MonitoringDemo.ApiService` — Custom activity source for business operations
- Auto-instrumented: ASP.NET Core, HTTP client, EF Core

### Logs
- Structured logging with scopes via ILogger
- Exported via OpenTelemetry to Aspire Dashboard

## 🎨 Frontend

The frontend intentionally stays small: it shows API-backed order statistics, recent orders, a test-order action, and links to the dedicated monitoring tools. Grafana remains the place for detailed charts and telemetry analysis.

## License

This project is for demonstration purposes.
