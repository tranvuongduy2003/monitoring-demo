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
| **React frontend** | Displays order, metric, logging, tracing, and Grafana learning labs. Vite proxies `/api/*` requests to the API, so the browser does not need an internal service address. |
| **API service** | Provides order/product endpoints, telemetry analytics, health checks, and the Prometheus `/metrics` endpoint. |
| **OpenTelemetry Collector** | Receives OTLP over gRPC or HTTP, applies memory limiting and batching, and routes each signal to its configured exporters. |
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
- Complete application monitoring lab covering HTTP, database, cache, dependencies, custom metrics, custom spans, and typed errors
- Healthy, cache-pressure, and dependency-outage seed scenarios with windowed analytics, live React visualizations, PromQL examples, alerts, and a provisioned Grafana dashboard
- Dedicated monitoring methodologies lab covering RED, USE, and the Four Golden Signals with correlated request/resource analytics
- Repeatable baseline, traffic-spike, and failure-burst seeding plus continuous Prometheus-ready samples and a provisioned Grafana dashboard
- Dedicated OpenTelemetry architecture lab covering the API, SDK, automatic and manual instrumentation, resources, semantic conventions, Tracer, Meter, Logger, and W3C propagators
- Repeatable multi-signal OpenTelemetry seeding with an in-process timeline, per-operation analytics, error counts, and latency statistics
- Dedicated OTLP transport lab covering OTLP, OTLP/gRPC, OTLP/HTTP, signal paths, ports, endpoint precedence, and live non-secret configuration
- Repeatable OTLP batch seeding with protocol and signal breakdowns, payload compression, retry/failure counts, latency percentiles, and recent export visualization
- Production-shaped OpenTelemetry Collector topology with OTLP receivers, memory limiting, batching, per-signal pipelines, Tempo/Loki exporters, and a Prometheus scrape endpoint
- Repeatable Collector pipeline seeding with receiver throughput, signal routing, batch triggers, memory pressure, retry/drop counts, and latency analytics
- Bidirectional logs ↔ traces and metrics ↔ traces correlation in Grafana, with trace-ID and span-ID filtering
- Trace-based OpenTelemetry exemplars stored by Prometheus and linked to real Tempo traces
- Repeatable correlation seeding with per-minute operations, logs, metric points, exemplars, latency, failures, and recent ID analytics
- Prometheus metric scraping and Loki OTLP log storage
- Live Prometheus architecture lab covering pull collection, scrape intervals, targets, jobs, instances, exporters, service discovery, TSDB retention, and rules
- Live Fundamental PromQL lab covering metric selection, label filtering, instant and range vectors, `sum`, `avg`, `min`, `max`, `count`, `rate`, `increase`, `by`, `without`, and `histogram_quantile`
- Live distributed tracing lab covering traces, trace/span IDs, roots, parent-child relationships, durations, attributes, events, statuses, waterfalls, and TraceQL
- Live context propagation lab covering distributed context, W3C Trace Context, `traceparent`, `tracestate`, HTTP headers, gRPC metadata, and fundamental baggage
- Dedicated Grafana lab covering data sources, dashboards, panels, PromQL/LogQL/TraceQL queries, variables, Explore, annotations, fundamental alerting, and five correlation labs
- Complete fundamental alerting lab covering threshold rules, Normal/Pending/Firing transitions, severity routing, provisioned webhook contact points, delivery analytics, suppression, and alert-fatigue measurement
- Repeatable healthy, pending, firing, and alert-fatigue scenarios plus Prometheus metrics and a dedicated provisioned Grafana dashboard
- Provisioned Grafana data sources, cross-signal correlations, dashboards, template variables, Loki annotations, and a Grafana-managed alert rule
- Repeatable Grafana interaction seeding with query volume, errors, dashboard views, data-source latency, panel usage, annotations, and recent-activity analytics
- Background order simulation, repeatable metric/trace seed endpoints, startup trace scenarios, and continuous bounded metric seeding so every visualization has test data
- File-based target discovery plus provisioned recording and alerting rules
- React workspace with focused pages for orders, OpenTelemetry, OTLP, Collector, metrics, Prometheus, logs, traces, Grafana, and learning resources
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
The Collector receives application telemetry on host ports `14317` (gRPC) and `14318` (HTTP), and exposes transformed metrics for Prometheus on `9464`.

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
├── MonitoringDemo.AppHost/          Aspire composition root
│   ├── Configuration/               Validated, typed environment settings
│   ├── Orchestration/               Database, observability, and workload resources
│   ├── grafana/                      Provisioning and dashboards
│   ├── otel-collector/               Collector pipelines
│   ├── prometheus/                   Scraping, targets, and rules
│   ├── loki/                         Log storage configuration
│   └── tempo/                        Trace storage configuration
├── MonitoringDemo.ApiService/       Feature-oriented backend
│   ├── Domain/                       Core entities and domain constants
│   ├── Features/                     Vertical API slices (endpoint, service, contracts)
│   ├── Hosting/                      Dependency injection and HTTP pipeline composition
│   └── Infrastructure/               Persistence, observability, and telemetry adapters
├── MonitoringDemo.Frontend/         React dashboard
│   └── src/
│       ├── app/                      Application entry and routing
│       ├── pages/                    Focused page composition
│       ├── domains/                  Orders, metrics, logging, and tracing
│       └── shared/                   Reusable UI, hooks, and services
└── MonitoringDemo.ServiceDefaults/  Shared hosting, health, configuration, and telemetry defaults
```

## Validation

```powershell
dotnet build MonitoringDemo.slnx
npm --prefix src/MonitoringDemo.Frontend run build
```

## License

For demonstration and learning purposes.
