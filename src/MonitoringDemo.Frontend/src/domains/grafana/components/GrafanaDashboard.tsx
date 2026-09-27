import type { useGrafanaDashboard } from '@/domains/grafana/hooks/useGrafanaDashboard';
import type { GrafanaAnalytics, GrafanaTimelinePoint } from '@/domains/grafana/types';
import { SectionHeading } from '@/shared/components/SectionHeading';

type GrafanaDashboardModel = ReturnType<typeof useGrafanaDashboard>;

const grafanaUrl = (import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const sections = ['data-sources', 'dashboards', 'panels', 'queries', 'variables', 'explore', 'annotations', 'alerting'] as const;

export function GrafanaDashboard({ model }: { model: GrafanaDashboardModel }) {
  const { overview, seeding, seedResult, error, seedGrafana } = model;
  const data = overview.data;
  const analytics = data?.analytics;

  return (
    <section className="panel learning-panel grafana-lab" aria-labelledby="grafana-heading">
      <SectionHeading
        eyebrow="Grafana lab"
        title="From raw telemetry to operational decisions"
        headingId="grafana-heading"
        description={analytics ? `${analytics.queryCount.toLocaleString()} seeded queries across ${data?.dataSources.length ?? 0} signal backends in the last hour` : 'Loading the Grafana workspace...'}
        actions={<><a className="grafana-primary-link" href={grafanaUrl} target="_blank" rel="noreferrer">Open Grafana ↗</a><button type="button" onClick={() => void seedGrafana()} disabled={seeding}>{seeding ? 'Seeding...' : 'Seed 180 interactions'}</button></>}
      />

      {(overview.error || error) && <p className="error panel-notice" role="alert">{error || 'Grafana analytics could not be loaded. Automatic retry is active.'}</p>}
      {seedResult && <p className="notice panel-notice" role="status">Run {seedResult.run} added {seedResult.seeded} queries and {seedResult.traceCount} correlated traces to the visualization dataset.</p>}

      <div className="grafana-summary" aria-label="Grafana analytics summary">
        <Summary label="Queries" value={analytics?.queryCount.toLocaleString() ?? '--'} detail="last 60 minutes" />
        <Summary label="Dashboard views" value={analytics?.dashboardViewCount.toLocaleString() ?? '--'} detail="seeded sessions" />
        <Summary label="Average query" value={analytics ? `${analytics.averageQueryDurationMilliseconds.toFixed(0)} ms` : '--'} detail="all data sources" />
        <Summary label="p95 query" value={analytics ? `${analytics.p95QueryDurationMilliseconds.toFixed(0)} ms` : '--'} detail="tail latency" />
        <Summary label="Errors" value={analytics?.errorCount ?? '--'} detail="failed queries" tone="warning" />
        <Summary label="Active alerts" value={analytics?.activeAlerts ?? '--'} detail="modeled alert state" tone={analytics?.activeAlerts ? 'error' : 'success'} />
      </div>

      <div className="grafana-analytics">
        <div>
          <h3>Query activity by minute</h3>
          <QueryTimeline points={analytics?.timeline.slice(-40) ?? []} />
          <div className="grafana-legend"><span className="queries">Queries</span><span className="errors">Errors</span><span className="markers">Annotations</span></div>
        </div>
        <div>
          <h3>Data-source workload</h3>
          <div className="grafana-source-bars">
            {analytics?.dataSourceUsage.map(source => {
              const maximum = Math.max(1, ...analytics.dataSourceUsage.map(item => item.queryCount));
              return <article key={source.name}><div><strong>{source.name}</strong><span>{source.queryCount} queries · {source.averageDurationMilliseconds.toFixed(0)} ms avg</span></div><div><i style={{ width: `${source.queryCount / maximum * 100}%` }} /></div><small>{source.errorCount} errors</small></article>;
            })}
          </div>
        </div>
      </div>

      <nav className="grafana-section-nav" aria-label="Grafana topics">
        {sections.map((section, index) => <a href={`#grafana-${section}`} key={section}><span>{String(index + 1).padStart(2, '0')}</span>{section.replace('-', ' ')}</a>)}
      </nav>

      <LabSection id="grafana-data-sources" eyebrow="01 · Data Sources" title="Connect each signal to its query engine" description="Provisioning creates these connections on startup with stable UIDs, so dashboards and correlations remain portable.">
        <div className="grafana-card-grid grafana-data-sources">
          {data?.dataSources.map(source => <article key={source.uid}><div><SignalIcon signal={source.signal} /><span className="pill completed">Provisioned</span></div><h3>{source.name}</h3><p>{source.purpose}</p><dl><div><dt>UID</dt><dd><code>{source.uid}</code></dd></div><div><dt>Language</dt><dd>{source.queryLanguage}</dd></div><div><dt>Signal</dt><dd>{source.signal}</dd></div></dl>{source.isDefault && <small>Default data source</small>}</article>)}
        </div>
      </LabSection>

      <LabSection id="grafana-dashboards" eyebrow="02 · Dashboards" title="Compose related panels into reusable operational views" description="All three dashboards are file-provisioned in the MonitoringDemo folder and survive container recreation.">
        <div className="grafana-dashboard-list">
          {data?.dashboards.map(dashboard => <article key={dashboard.uid}><div><span className="grafana-dashboard-icon">▦</span><div><h3>{dashboard.title}</h3><p>{dashboard.purpose}</p></div></div><div><strong>{dashboard.panelCount}</strong><span>panels</span></div><a href={`${grafanaUrl}/d/${dashboard.uid}`} target="_blank" rel="noreferrer">View ↗</a></article>)}
        </div>
      </LabSection>

      <LabSection id="grafana-panels" eyebrow="03 · Panels" title="Choose a visual that answers one concrete question" description="Panel type, reduction, unit, thresholds, and legend should reinforce the meaning of the query.">
        <div className="grafana-panel-layout">
          <div className="grafana-card-grid grafana-panels">{data?.panels.map(panel => <article key={panel.type}><span>{panel.type}</span><h3>{panel.title}</h3><p>{panel.useWhen}</p><code>{panel.query}</code><small>{panel.display}</small></article>)}</div>
          <div className="grafana-panel-popularity"><h3>Seeded panel views</h3>{analytics?.panelUsage.map(panel => { const max = Math.max(1, ...analytics.panelUsage.map(item => item.viewCount)); return <div key={panel.type}><span>{panel.type}</span><div><i style={{ width: `${panel.viewCount / max * 100}%` }} /></div><strong>{panel.viewCount}</strong></div>; })}</div>
        </div>
      </LabSection>

      <LabSection id="grafana-queries" eyebrow="04 · Queries" title="Ask the backend, then shape the result" description="Queries execute in their data source; Grafana supplies time ranges and variables, then transforms and renders the returned frames.">
        <div className="grafana-query-grid">{data?.queries.map(query => <article key={`${query.language}-${query.title}`}><div><span>{query.language}</span><small>{query.queryType}</small></div><h3>{query.title}</h3><code>{query.expression}</code><p>{query.explanation}</p></article>)}</div>
      </LabSection>

      <LabSection id="grafana-variables" eyebrow="05 · Variables" title="Make one dashboard reusable across contexts" description="Template variables appear as dashboard controls and are interpolated into panel titles, links, and queries.">
        <div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Definition</th><th>Current</th><th>Multi</th><th>Why it exists</th></tr></thead><tbody>{data?.variables.map(variable => <tr key={variable.name}><td><code>${variable.name}</code></td><td>{variable.type}</td><td><code>{variable.definition}</code></td><td>{variable.current}</td><td>{variable.multiValue ? 'Yes' : 'No'}</td><td>{variable.purpose}</td></tr>)}</tbody></table></div>
      </LabSection>

      <LabSection id="grafana-explore" eyebrow="06 · Explore" title="Investigate first; promote durable answers to dashboards" description="Explore is the ad-hoc workspace for iterating on queries, inspecting raw results, splitting views, and moving between correlated signals.">
        <div className="grafana-explore-grid">{data?.explore.map(item => <article key={item.signal}><div><SignalIcon signal={item.signal} /><span>{item.dataSource}</span></div><h3>{item.signal} investigation</h3><code>{item.query}</code><p>{item.workflow}</p><a href={`${grafanaUrl}/explore`} target="_blank" rel="noreferrer">Open in Explore ↗</a></article>)}</div>
      </LabSection>

      <LabSection id="grafana-annotations" eyebrow="07 · Annotations" title="Overlay events on telemetry timelines" description="Annotations explain why a graph changed by placing deployments, incidents, and other events directly on time-series panels.">
        <div className="grafana-annotation-layout"><div className="grafana-annotation-track"><span>60m ago</span><div>{analytics?.timeline.filter(point => point.annotations > 0).map(point => <i key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.annotations} annotations`} />)}</div><span>now</span></div><div>{data?.annotations.map(annotation => <article key={annotation.name}><div><strong>{annotation.name}</strong><span className={`pill ${annotation.enabled ? 'completed' : 'pending'}`}>{annotation.enabled ? 'Enabled' : 'Example'}</span></div><p>{annotation.source} · {annotation.tags}</p><code>{annotation.query}</code></article>)}</div></div>
      </LabSection>

      <LabSection id="grafana-alerting" eyebrow="08 · Fundamental Grafana Alerting" title="Evaluate, route, and manage alert state" description="A Grafana-managed rule is provisioned with the stack. The lifecycle is Normal → Pending → Alerting, with explicit No Data and Error behavior.">
        <div className="grafana-alert-flow" aria-label="Grafana alerting flow"><Flow label="Query" detail="Prometheus range" /><b>→</b><Flow label="Reduce" detail="Last value" /><b>→</b><Flow label="Threshold" detail="Above 2" /><b>→</b><Flow label="State" detail="Pending / Alerting" /><b>→</b><Flow label="Route" detail="Contact point" /></div>
        <div className="grafana-alert-grid">{data?.alerting.map(alert => <article key={alert.uid}><div><span className={`grafana-alert-state ${alert.state.toLowerCase()}`}>{alert.state}</span><small>{alert.source}</small></div><h3>{alert.title}</h3><code>{alert.query}</code><dl><div><dt>Condition</dt><dd>{alert.condition}</dd></div><div><dt>For</dt><dd>{alert.for}</dd></div><div><dt>No data</dt><dd>{alert.noDataState}</dd></div></dl></article>)}</div>
      </LabSection>

      <section className="grafana-recent" aria-labelledby="grafana-recent-heading"><h3 id="grafana-recent-heading">Recent seeded query activity</h3><div className="table-wrap compact-table"><table><thead><tr><th>Time</th><th>Dashboard</th><th>Data source</th><th>Panel</th><th>Duration</th><th>Status</th></tr></thead><tbody>{analytics?.recentActivity.map((activity, index) => <tr key={`${activity.timestamp}-${index}`}><td>{new Date(activity.timestamp).toLocaleTimeString()}</td><td>{activity.dashboard}</td><td>{activity.dataSource}</td><td>{activity.panelType}</td><td>{activity.durationMilliseconds.toFixed(0)} ms</td><td><span className={`pill ${activity.status === 'Success' ? 'completed' : 'failed'}`}>{activity.status}</span></td></tr>)}</tbody></table></div></section>
    </section>
  );
}

function LabSection({ id, eyebrow, title, description, children }: { id: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="grafana-section" id={id}><div className="otel-subheading"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3><p className="muted">{description}</p></div>{children}</section>;
}

function QueryTimeline({ points }: { points: GrafanaTimelinePoint[] }) {
  const maximum = Math.max(1, ...points.map(point => point.queries));
  return <div className="grafana-timeline" aria-label="Grafana query activity over time">{points.map(point => <div key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.queries} queries, ${point.errors} errors`}><i style={{ height: `${Math.max(4, point.queries / maximum * 100)}%` }} />{point.errors > 0 && <b style={{ height: `${Math.max(3, point.errors / maximum * 100)}%` }} />}{point.annotations > 0 && <em />}</div>)}{points.length === 0 && <p className="chart-empty">Waiting for seeded queries...</p>}</div>;
}

function SignalIcon({ signal }: { signal: string }) {
  const symbol = signal === 'Metrics' ? 'M' : signal === 'Logs' ? 'L' : 'T';
  return <span className={`grafana-signal-icon ${signal.toLowerCase()}`} aria-hidden="true">{symbol}</span>;
}

function Summary({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone?: 'success' | 'warning' | 'error' }) {
  return <article className={tone ? `grafana-summary--${tone}` : undefined}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Flow({ label, detail }: { label: string; detail: string }) {
  return <div><strong>{label}</strong><span>{detail}</span></div>;
}
