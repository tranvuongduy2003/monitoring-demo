import { MonitoringLinks } from '@/components/MonitoringLinks';
import { PageHeader } from '@/shared/components/PageHeader';

const areas = [
  { route: 'orders', label: 'Orders', description: 'Watch business activity, revenue, failures, and recent transactions.', accent: 'blue', value: 'Business health' },
  { route: 'opentelemetry', label: 'OpenTelemetry', description: 'Explore the SDK pipeline and three correlated telemetry signals.', accent: 'violet', value: 'Signal pipeline' },
  { route: 'otlp', label: 'OTLP', description: 'Compare gRPC and HTTP export paths, live batches, and endpoint configuration.', accent: 'blue', value: 'Telemetry transport' },
  { route: 'collector', label: 'Collector', description: 'Route signals through receivers, processors, pipelines, and exporters.', accent: 'violet', value: 'Control plane' },
  { route: 'metrics', label: 'Metrics', description: 'Inspect counters, gauges, histograms, labels, and cardinality.', accent: 'cyan', value: 'Measurements' },
  { route: 'application', label: 'Application', description: 'Correlate HTTP, database, cache, dependency, business, span, and error signals.', accent: 'emerald', value: 'Request path' },
  { route: 'methodologies', label: 'Methodologies', description: 'Diagnose one seeded workload with RED, USE, and the Four Golden Signals.', accent: 'blue', value: 'Diagnostic lenses' },
  { route: 'prometheus', label: 'Prometheus', description: 'Understand scraping, PromQL, recording rules, alerts, and TSDB.', accent: 'orange', value: 'Time series' },
  { route: 'logs', label: 'Logs', description: 'Generate structured events and investigate them with LogQL.', accent: 'emerald', value: 'Events' },
  { route: 'traces', label: 'Traces', description: 'Follow distributed requests through spans and context propagation.', accent: 'rose', value: 'Request journeys' },
  { route: 'grafana', label: 'Grafana', description: 'Turn multi-signal queries into dashboards, annotations, and actionable alerts.', accent: 'orange', value: 'Visualization' },
];

export function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Monitoring workspace"
        title="See every signal in context"
        description="A hands-on observability lab for following business activity from application code to metrics, logs, and distributed traces."
      />

      <section className="overview-intro">
        <div>
          <span className="overview-kicker">Explore the stack</span>
          <h2>Choose a signal to investigate</h2>
        </div>
        <p>Each section now loads independently, keeping the workspace focused and reducing background requests.</p>
      </section>

      <section className="area-grid" aria-label="Observability areas">
        {areas.map((area, index) => (
          <a className={`area-card ${area.accent}`} href={`#/${area.route}`} key={area.route}>
            <span className="area-number">0{index + 1}</span>
            <span className="area-value">{area.value}</span>
            <strong>{area.label}</strong>
            <p>{area.description}</p>
            <span className="area-link">Open workspace <span aria-hidden="true">→</span></span>
          </a>
        ))}
      </section>

      <MonitoringLinks />
    </>
  );
}
