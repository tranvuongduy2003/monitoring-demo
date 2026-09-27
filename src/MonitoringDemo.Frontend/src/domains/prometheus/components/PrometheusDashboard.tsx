import type { usePrometheusDashboard } from '@/domains/prometheus/hooks/usePrometheusDashboard';
import type { PrometheusOverview } from '@/domains/prometheus/types';
import { dateTime } from '@/shared/lib/formatters';

type PrometheusDashboardModel = ReturnType<typeof usePrometheusDashboard>;

export function PrometheusDashboard({ model }: { model: PrometheusDashboardModel }) {
  const { overview, seeding, message, seedPrometheus } = model;
  const data = overview.data;
  const recordingRules = data?.rules.filter((rule) => rule.kind === 'recording') ?? [];
  const alertingRules = data?.rules.filter((rule) => rule.kind === 'alerting') ?? [];
  const throughput = data?.analytics.throughput.slice(-40) ?? [];
  const maxThroughput = Math.max(0.001, ...throughput.map((point) => point.value));
  const maxMetricCount = Math.max(1, ...(data?.storage.topMetrics.map((metric) => metric.count) ?? []));

  return (
    <section className="panel learning-panel prometheus-lab" aria-labelledby="prometheus-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Prometheus lab</p>
          <h2 id="prometheus-heading">Pull-based collection, storage, rules, and live analytics</h2>
          <p>{statusText(data, overview.loading)}</p>
        </div>
        <button type="button" onClick={() => void seedPrometheus()} disabled={seeding}>
          {seeding ? 'Seeding...' : 'Seed 240 observations'}
        </button>
      </div>

      {message && <p className="notice panel-notice" role="status">{message}</p>}
      {overview.error && <p className="error panel-notice" role="alert">The overview API could not be loaded. Automatic retry is active.</p>}
      {data && !data.connected && <p className="error panel-notice" role="status">Prometheus is offline: {data.error}. Start the AppHost to activate the live fields.</p>}

      <div className="prometheus-summary" aria-label="Prometheus live summary">
        <Summary label="Targets up" value={data ? `${data.analytics.targetsUp}/${data.targets.length}` : '--'} detail="up query" />
        <Summary label="Jobs" value={data?.jobs.length ?? '--'} detail="scrape pools" />
        <Summary label="Head series" value={data?.storage.headSeries.toLocaleString() ?? '--'} detail="active TSDB series" />
        <Summary label="Order rate" value={data ? `${data.analytics.ordersPerSecond.toFixed(3)}/s` : '--'} detail="recording rule" />
        <Summary label="p95 latency" value={data ? `${data.analytics.p95DurationMilliseconds.toFixed(0)} ms` : '--'} detail="recording rule" />
        <Summary label="Firing alerts" value={data?.analytics.firingAlerts ?? '--'} detail="ALERTS series" />
      </div>

      <div className="prometheus-architecture">
        <h3>Prometheus architecture</h3>
        <div className="architecture-flow" aria-label="Prometheus pull architecture">
          <FlowNode title="Service discovery" detail={`file_sd · ${data?.settings.discoveryRefreshInterval ?? '30s'}`} />
          <span aria-hidden="true">→</span>
          <FlowNode title="Prometheus server" detail="retrieve · TSDB · evaluate" />
          <span aria-hidden="true">→</span>
          <FlowNode title="Rules & PromQL" detail="record · alert · query" />
          <span aria-hidden="true">→</span>
          <FlowNode title="Grafana / API" detail="visualize analytics" />
        </div>
        <div className="pull-flow"><code>Prometheus</code><span>GET every {data?.settings.apiScrapeInterval ?? '5s'} →</span><code>apiservice:5000/metrics</code></div>
      </div>

      <div className="prometheus-analytics">
        <div className="metric-chart">
          <h3>Recorded order throughput · last hour</h3>
          <div className="time-bars prometheus-bars" aria-label="Recorded orders per second">
            {throughput.map((point) => (
              <div className="time-column" key={point.timestamp} title={`${dateTime.format(new Date(point.timestamp))}: ${point.value.toFixed(4)} orders/s`}>
                <span style={{ height: `${Math.max(3, (point.value / maxThroughput) * 100)}%` }} />
              </div>
            ))}
            {throughput.length === 0 && <p className="chart-empty">Waiting for recording-rule samples...</p>}
          </div>
          <code className="promql">sum(job:orders_created:rate5m)</code>
        </div>
        <div className="metric-chart">
          <h3>TSDB series by metric</h3>
          {data?.storage.topMetrics.map((metric) => (
            <div className="series-row" key={metric.name}>
              <code title={metric.name}>{metric.name}</code>
              <div className="bar-track"><span style={{ width: `${(metric.count / maxMetricCount) * 100}%` }} /></div>
              <strong>{metric.count}</strong>
            </div>
          ))}
          {!data?.storage.topMetrics.length && <p className="muted">TSDB analytics appear after the first successful scrapes.</p>}
        </div>
      </div>

      <div className="prometheus-table-section">
        <div className="subheading"><div><h3>Targets, jobs, and instances</h3><p className="muted">A job groups targets; every target endpoint becomes an instance label.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Health</th><th>Job</th><th>Instance</th><th>Scrape URL</th><th>Interval</th><th>Last duration</th></tr></thead>
            <tbody>
              {data?.targets.map((target) => (
                <tr key={`${target.job}-${target.instance}`}>
                  <td><span className={`pill ${target.health === 'up' ? 'completed' : 'failed'}`}>{target.health}</span></td>
                  <td>{target.job}</td><td><code>{target.instance}</code></td><td><code>{target.scrapeUrl}</code></td>
                  <td>{target.scrapeInterval || (target.job === 'apiservice' ? data.settings.apiScrapeInterval : data.settings.globalScrapeInterval)}</td>
                  <td>{(target.lastScrapeDurationSeconds * 1000).toFixed(1)} ms</td>
                </tr>
              ))}
              {!data?.targets.length && <tr><td colSpan={6} className="empty">No discovered targets available.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rules-grid">
        <RuleList title="Recording rules" rules={recordingRules} empty="Waiting for Prometheus to load recording rules." />
        <RuleList title="Alerting rules" rules={alertingRules} empty="Waiting for Prometheus to load alerting rules." />
      </div>

      <div className="prometheus-concepts">
        <Concept title="Pull model" live="Prometheus initiates collection; the API never pushes samples." />
        <Concept title="Scraping" live={`HTTP GET ${data?.settings.metricsPath ?? '/metrics'} converts an exporter response into timestamped samples.`} />
        <Concept title="Scrape interval" live={`Global ${data?.settings.globalScrapeInterval ?? '15s'} · API override ${data?.settings.apiScrapeInterval ?? '5s'}.`} />
        <Concept title="Targets" live={`${data?.targets.length ?? 0} endpoint(s) discovered; ${data?.targets.filter((target) => target.health === 'up').length ?? 0} currently healthy.`} />
        <Concept title="Jobs" live={`${data?.jobs.map((job) => `${job.name} (${job.healthyTargetCount}/${job.targetCount})`).join(', ') || 'prometheus, apiservice'} group related targets.`} />
        <Concept title="Instances" live={`${data?.jobs.reduce((sum, job) => sum + job.instanceCount, 0) ?? 0} unique scraped endpoints supply the instance label.`} />
        <Concept title="/metrics" live="The API exposes OpenMetrics text at /metrics for machine collection and inspection." />
        <Concept title="Exporters" live="The .NET OpenTelemetry Prometheus exporter translates counters, gauges, histograms, and runtime instruments." />
        <Concept title="Service discovery" live={`${data?.settings.discoveryMechanism ?? 'file_sd'} reloads target metadata every ${data?.settings.discoveryRefreshInterval ?? '30s'}.`} />
        <Concept title="TSDB" live={`${data?.storage.headSeries.toLocaleString() ?? 0} active series and ${data?.storage.headChunks.toLocaleString() ?? 0} in-memory chunks.`} />
        <Concept title="Basic retention" live={`Samples are retained for ${data?.storage.retention ?? '15d'}; old blocks are removed automatically.`} />
        <Concept title="Recording rules" live={`${recordingRules.length} precomputed PromQL expressions make dashboards faster and consistent.`} />
        <Concept title="Alerting rules" live={`${alertingRules.length} conditions are evaluated every ${data?.settings.evaluationInterval ?? '15s'}; ${data?.analytics.firingAlerts ?? 0} firing.`} />
      </div>
    </section>
  );
}

function Summary({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function FlowNode({ title, detail }: { title: string; detail: string }) {
  return <div><strong>{title}</strong><small>{detail}</small></div>;
}

function Concept({ title, live }: { title: string; live: string }) {
  return <article><strong>{title}</strong><span>{live}</span></article>;
}

function RuleList({ title, rules, empty }: { title: string; rules: PrometheusOverview['rules']; empty: string }) {
  return (
    <div>
      <h3>{title}</h3>
      {rules.map((rule) => (
        <article className="rule-card" key={rule.name}>
          <div><strong>{rule.name}</strong><span className={`pill ${rule.health === 'ok' ? 'completed' : 'failed'}`}>{rule.state}</span></div>
          <code>{rule.query}</code>
          <small>{rule.group} · evaluated in {(rule.evaluationTimeSeconds * 1000).toFixed(2)} ms</small>
        </article>
      ))}
      {rules.length === 0 && <p className="muted">{empty}</p>}
    </div>
  );
}

function statusText(data: PrometheusOverview | null, loading: boolean): string {
  if (loading && !data) return 'Loading Prometheus runtime state...';
  if (!data?.connected) return 'Configuration is documented below; live runtime state is unavailable.';
  return `Connected to ${data.baseUrl} · checked ${dateTime.format(new Date(data.checkedAt))}`;
}
