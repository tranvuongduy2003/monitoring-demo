# MonitoringDemo

MonitoringDemo is a local observability scenario generator built with .NET 10, .NET Aspire, React, PostgreSQL, OpenTelemetry, Prometheus, Loki, Tempo, and Grafana.

The product boundary is intentional:

- **Scenario Lab** generates bounded workloads and seed telemetry.
- **Learn & tools** preserves the observability fundamentals, logs guide, concept map, and backend links.
- **Grafana** owns dashboards, queries, correlations, and investigations.
- **Prometheus, Loki, and Tempo** store the generated signals.
- The API does not proxy those backends or build a second analytics layer.

## What you can generate

The frontend exposes five explicit scenarios:

| Scenario | Purpose | Signals |
|---|---|---|
| Steady order traffic | Healthy business traffic backed by PostgreSQL records | Metrics, logs, traces, database rows |
| Traffic spike | Elevated utilization, saturation, throughput, and latency | Metrics, logs, traces |
| Dependency outage | Dependency errors, server failures, slow traces, and error logs | Metrics, logs, traces |
| Cache pressure | A low cache-hit ratio with added latency and queue pressure | Metrics, logs, traces |
| Trace storm | Dense multi-hop traces for propagation and waterfall analysis | Traces, logs |

Every run is user-triggered. There are no background seed workers continuously changing the dataset.

Each run also emits the learning telemetry used by the Grafana Fundamentals, Signal Correlation, and Fundamental Alerting dashboards.

## Learning library

Open `http://localhost:5173/#/learn` to access the retained learning material:

- Observability fundamentals
- Logs, structured context, correlation, Loki, and LogQL
- The observability concept map
- Direct links to every Grafana dashboard and monitoring backend

## Provisioned Grafana dashboards

| Dashboard | UID |
|---|---|
| API Metrics | `monitoring-demo` |
| Application Monitoring | `application-monitoring` |
| Monitoring Methodologies | `monitoring-methodologies` |
| Logs & Correlation | `monitoring-demo-logs` |
| Signal Correlation | `signal-correlation` |
| Grafana Fundamentals | `grafana-fundamentals` |
| Fundamental Alerting | `fundamental-alerting` |

## Runtime architecture

![MonitoringDemo observability architecture](observability.png)

The Collector is the application signal path for logs and traces. Prometheus scrapes the API's native metrics endpoint and the Collector exporter. Grafana reads Prometheus, Loki, and Tempo directly.

## Requirements

- .NET SDK 10.0.203 or a compatible later patch
- Node.js 20+
- Docker Desktop or another Docker-compatible container runtime

## Quick start

From the repository root:

```powershell
Copy-Item src/MonitoringDemo.AppHost/.env.example src/MonitoringDemo.AppHost/.env

Push-Location src/MonitoringDemo.Frontend
npm ci
Pop-Location

dotnet run --project src/MonitoringDemo.AppHost
```

Open the Aspire Dashboard URL printed at startup, or go to `http://localhost:5173` for Scenario Lab. After running a scenario, follow its **Investigate in Grafana** link. The example Grafana credentials are `admin` / `change-me`.

## Scenario API

```http
GET  /api/scenarios
POST /api/scenarios/{scenarioId}?count=200
GET  /metrics
GET  /health
GET  /alive
```

`count` is optional and clamped to a safe range by the API. The run response reports how many metric observations, application transactions, methodology requests, logs, traces, and database rows were generated.

## Local services

| Service | Default URL |
|---|---|
| Scenario Lab | `http://localhost:5173` |
| API | `http://localhost:5000` |
| API metrics | `http://localhost:5000/metrics` |
| Grafana | `http://localhost:3000` |
| Prometheus | `http://localhost:9090` |
| Loki readiness | `http://localhost:3100/ready` |
| Tempo readiness | `http://localhost:3200/ready` |
| Aspire Dashboard | `https://localhost:17225` |

All ports, image tags, retention periods, scrape intervals, and credentials are configurable in `src/MonitoringDemo.AppHost/.env`.

## Project structure

```text
src/
|-- MonitoringDemo.AppHost/          Aspire orchestration and observability provisioning
|   |-- grafana/                     Data sources and scenario-focused dashboards
|   |-- loki/                        Log storage configuration
|   |-- otel-collector/              OTLP receivers, processors, and exporters
|   |-- prometheus/                  Scraping and scenario alert rules
|   `-- tempo/                       Trace storage configuration
|-- MonitoringDemo.ApiService/
|   |-- Features/Scenarios/          Catalog, workload orchestration, and run results
|   |-- Features/*                   Reusable telemetry emitters
|   |-- Infrastructure/Persistence/  PostgreSQL context and product seed data
|   `-- Infrastructure/Telemetry/    Application meters and activity source
|-- MonitoringDemo.Frontend/         Focused React scenario console
`-- MonitoringDemo.ServiceDefaults/ OpenTelemetry and health-check configuration
```

## Validation

```powershell
dotnet build MonitoringDemo.slnx
npm --prefix src/MonitoringDemo.Frontend run build
```

## License

For demonstration and learning purposes.
