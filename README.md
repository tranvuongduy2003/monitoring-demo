# MonitoringDemo

An end-to-end observability demo built with .NET 10, Aspire, React, PostgreSQL, OpenTelemetry, Prometheus, Loki, and Grafana.

## Architecture

```text
Browser
   │ HTTP
   ▼
┌────────────────────────── .NET Aspire AppHost ──────────────────────────┐
│                                                                        │
│  React + Vite :5173                                                    │
│         │                                                              │
│         │ /api proxy                                                   │
│         ▼                                                              │
│  .NET Minimal API :5000                                                │
│         │                                                              │
│         ├── SQL reads/writes ───────────────► PostgreSQL :5432          │
│         │                                                              │
│         ├── /metrics ◄── scrape ───────────── Prometheus :9090          │
│         │                                             ▲                │
│         │                                             │ PromQL         │
│         │                                             │                │
│         ├── OTLP structured logs ────────► Loki :3100 │                │
│         ├── LogQL analytics queries ─────►     ▲       │                │
│         │                                     │ LogQL │                │
│         │                                     │       │                │
│         │                               Grafana :3000 ─┘                │
│         │                                                              │
│         └── OTLP metrics and traces ───────► Aspire Dashboard :17225   │
│                                                                        │
│  API hosted services                                                   │
│    ├── Background order simulator ────────► PostgreSQL + telemetry     │
│    ├── Logging seed service ──────────────► Loki                       │
│    └── Metrics seed service ──────────────► Prometheus endpoint data   │
│                                                                        │
│  AppHost loads environment settings, injects service references,       │
│  waits for dependencies, and manages the complete local stack.         │
└────────────────────────────────────────────────────────────────────────┘
```

### Runtime flow

| Area | Responsibility |
|---|---|
| **Aspire AppHost** | Loads DevOps environment settings, starts every resource, injects service references, performs dependency health checks, and exposes local endpoints. |
| **React frontend** | Displays order, metric, logging, and distributed tracing labs. Vite proxies `/api/*` requests to the API, so the browser does not need an internal service address. |
| **API service** | Provides order/product endpoints, telemetry analytics, health checks, and the Prometheus `/metrics` endpoint. |
| **Background services** | Continuously create sample orders, metrics, and structured logs so dashboards contain useful data immediately. |
| **PostgreSQL** | Stores products and orders. Aspire injects the generated database connection string into the API. |
| **Prometheus** | Pulls metrics from `/metrics`; Grafana reads them with PromQL. |
| **Loki** | Receives structured application logs over OTLP and serves LogQL queries to both the API and Grafana. |
| **Tempo** | Receives OpenTelemetry traces over OTLP and serves TraceQL search plus trace-by-ID data to the API and Grafana. |
| **Grafana** | Uses provisioned Prometheus, Loki, and Tempo data sources plus repository-managed dashboards. |
| **Aspire Dashboard** | Displays resource state, distributed traces, metrics, and diagnostic information during local development. |

Telemetry is correlated through request, correlation, trace, and span identifiers. Environment variables control public ports, container versions, credentials, retention, scrape intervals, and service URLs.

## Features

- Custom OpenTelemetry counters, gauges, histograms, traces, and structured logs
- Dedicated OpenTelemetry architecture lab covering the API, SDK, automatic and manual instrumentation, resources, semantic conventions, Tracer, Meter, Logger, and W3C propagators
- Repeatable multi-signal OpenTelemetry seeding with an in-process timeline, per-operation analytics, error counts, and latency statistics
- Dedicated OTLP transport lab covering OTLP, OTLP/gRPC, OTLP/HTTP, signal paths, ports, endpoint precedence, and live non-secret configuration
- Repeatable OTLP batch seeding with protocol and signal breakdowns, payload compression, retry/failure counts, latency percentiles, and recent export visualization
- Correlation, request, trace, and span IDs across application logs
- Prometheus metric scraping and Loki OTLP log storage
- Live Prometheus architecture lab covering pull collection, scrape intervals, targets, jobs, instances, exporters, service discovery, TSDB retention, and rules
- Live Fundamental PromQL lab covering metric selection, label filtering, instant and range vectors, `sum`, `avg`, `min`, `max`, `count`, `rate`, `increase`, `by`, `without`, and `histogram_quantile`
- Live distributed tracing lab covering traces, trace/span IDs, roots, parent-child relationships, durations, attributes, events, statuses, waterfalls, and TraceQL
- Live context propagation lab covering distributed context, W3C Trace Context, `traceparent`, `tracestate`, HTTP headers, gRPC metadata, and fundamental baggage
- Provisioned Grafana data sources and dashboards
- Background order simulation, repeatable metric/trace seed endpoints, startup trace scenarios, and continuous bounded metric seeding so every visualization has test data
- File-based target discovery plus provisioned recording and alerting rules
- React workspace with focused pages for orders, OpenTelemetry, OTLP, metrics, Prometheus, logs, traces, and learning resources
- Responsive application shell with persistent desktop navigation and a mobile sidebar
- Domain-oriented frontend with strict `@/` absolute imports
- Environment-driven local and DevOps configuration

## Requirements

- .NET SDK 10+
- Node.js 20+
- Docker Desktop

## Quick start

```powershell
Copy-Item src/MonitoringDemo.AppHost/.env.example src/MonitoringDemo.AppHost/.env

Push-Location src/MonitoringDemo.Frontend
npm install
Pop-Location

dotnet run --project src/MonitoringDemo.AppHost
```

## Local services

| Service | URL | Credentials |
|---|---|---|
| Frontend | `http://localhost:5173` | — |
| API | `http://localhost:5000` | — |
| API metrics | `http://localhost:5000/metrics` | — |
| Prometheus | `http://localhost:9090` | — |
| Loki | `http://localhost:3100/ready` | — |
| Tempo | `http://localhost:3200/ready` | — |
| Grafana | `http://localhost:3000` | `admin` / configured password |
| Aspire dashboard | `https://localhost:17225` | Launch token |

Ports and credentials can be changed in the AppHost `.env` file.
Tempo also exposes its standard OTLP receivers on port `4317` for gRPC and `4318` for HTTP/protobuf.

## Environment files

Local `.env` files are ignored by Git. Committed templates document every supported setting:

| Layer | Template |
|---|---|
| Frontend | `src/MonitoringDemo.Frontend/.env.example` |
| API standalone mode | `src/MonitoringDemo.ApiService/.env.example` |
| Aspire and DevOps | `src/MonitoringDemo.AppHost/.env.example` |

Shell, IDE, CI, and deployment environment variables take precedence over `.env` values.

## Project structure

```text
src/
├── MonitoringDemo.AppHost/          Aspire and monitoring infrastructure
├── MonitoringDemo.ApiService/       API, data, telemetry, and background jobs
├── MonitoringDemo.Frontend/         React dashboard
│   └── src/
│       ├── app/                      Application entry and routing
│       ├── pages/                    Focused page composition
│       ├── domains/                  Orders, metrics, logging, and tracing
│       └── shared/                   Reusable UI, hooks, and services
└── MonitoringDemo.ServiceDefaults/  Health checks and OpenTelemetry defaults
```

## Validation

```powershell
dotnet build MonitoringDemo.slnx
npm --prefix src/MonitoringDemo.Frontend run build
```

## License

For demonstration and learning purposes.
