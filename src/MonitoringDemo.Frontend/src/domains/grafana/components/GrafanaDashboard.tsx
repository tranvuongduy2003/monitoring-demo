import type { useGrafanaDashboard } from '@/domains/grafana/hooks/useGrafanaDashboard';
import type { AlertingTimelinePoint, CorrelationTimelinePoint, GrafanaAnalytics, GrafanaTimelinePoint } from '@/domains/grafana/types';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type GrafanaDashboardModel = ReturnType<typeof useGrafanaDashboard>;

const grafanaUrl = (import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const sections = ['data-sources', 'dashboards', 'panels', 'queries', 'variables', 'explore', 'annotations', 'alerting', 'correlation'] as const;

export function GrafanaDashboard({ model }: { model: GrafanaDashboardModel }) {
  const { overview, seeding, seedResult, correlationSeeding, correlationSeedResult, alertingSeeding, alertingSeedResult, error, seedGrafana, seedCorrelations, seedAlerting } = model;
  const data = overview.data;
  const analytics = data?.analytics;
  const alerting = data?.alertingAnalytics;
  const correlation = data?.correlationAnalytics;

  return (
    <section className="panel learning-panel grafana-lab" aria-labelledby="grafana-heading">
      <SectionHeading
        eyebrow="Grafana lab"
        title="From raw telemetry to operational decisions"
        headingId="grafana-heading"
        description={analytics ? `${analytics.queryCount.toLocaleString()} seeded queries across ${data?.dataSources.length ?? 0} signal backends in the last hour` : 'Loading the Grafana workspace...'}
        actions={<><Button asChild variant="secondary"><a className="grafana-primary-link" href={grafanaUrl} target="_blank" rel="noreferrer">Open Grafana ↗</a></Button><Button type="button" onClick={() => void seedGrafana()} disabled={seeding}>{seeding ? 'Seeding...' : 'Seed 180 interactions'}</Button></>}
      />

      {(overview.error || error) && <p className="error panel-notice" role="alert">{error || 'Grafana analytics could not be loaded. Automatic retry is active.'}</p>}
      {seedResult && <p className="notice panel-notice" role="status">Run {seedResult.run} added {seedResult.seeded} queries, {seedResult.traceCount} traces, and {seedResult.correlationCount} fully correlated operations.</p>}
      {correlationSeedResult && <p className="notice panel-notice" role="status">Correlation run {correlationSeedResult.run} emitted {correlationSeedResult.seeded} operations across logs, metrics, traces, and exemplars.</p>}
      {alertingSeedResult && <p className="notice panel-notice" role="status">Alerting run {alertingSeedResult.run} added {alertingSeedResult.seededEvaluations} evaluations for the {alertingSeedResult.scenario} scenario.</p>}

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
          {data?.dataSources.map(source => <Card asChild key={source.uid}><article><div><SignalIcon signal={source.signal} /><Badge variant="success" className="pill completed">Provisioned</Badge></div><h3>{source.name}</h3><p>{source.purpose}</p><dl><div><dt>UID</dt><dd><code>{source.uid}</code></dd></div><div><dt>Language</dt><dd>{source.queryLanguage}</dd></div><div><dt>Signal</dt><dd>{source.signal}</dd></div></dl>{source.isDefault && <small>Default data source</small>}</article></Card>)}
        </div>
      </LabSection>

      <LabSection id="grafana-dashboards" eyebrow="02 · Dashboards" title="Compose related panels into reusable operational views" description="All three dashboards are file-provisioned in the MonitoringDemo folder and survive container recreation.">
        <div className="grafana-dashboard-list">
          {data?.dashboards.map(dashboard => <Card asChild key={dashboard.uid}><article><div><span className="grafana-dashboard-icon">▦</span><div><h3>{dashboard.title}</h3><p>{dashboard.purpose}</p></div></div><div><strong>{dashboard.panelCount}</strong><span>panels</span></div><Button asChild variant="link"><a href={`${grafanaUrl}/d/${dashboard.uid}`} target="_blank" rel="noreferrer">View ↗</a></Button></article></Card>)}
        </div>
      </LabSection>

      <LabSection id="grafana-panels" eyebrow="03 · Panels" title="Choose a visual that answers one concrete question" description="Panel type, reduction, unit, thresholds, and legend should reinforce the meaning of the query.">
        <div className="grafana-panel-layout">
          <div className="grafana-card-grid grafana-panels">{data?.panels.map(panel => <Card asChild key={panel.type}><article><span>{panel.type}</span><h3>{panel.title}</h3><p>{panel.useWhen}</p><code>{panel.query}</code><small>{panel.display}</small></article></Card>)}</div>
          <div className="grafana-panel-popularity"><h3>Seeded panel views</h3>{analytics?.panelUsage.map(panel => { const max = Math.max(1, ...analytics.panelUsage.map(item => item.viewCount)); return <div key={panel.type}><span>{panel.type}</span><div><i style={{ width: `${panel.viewCount / max * 100}%` }} /></div><strong>{panel.viewCount}</strong></div>; })}</div>
        </div>
      </LabSection>

      <LabSection id="grafana-queries" eyebrow="04 · Queries" title="Ask the backend, then shape the result" description="Queries execute in their data source; Grafana supplies time ranges and variables, then transforms and renders the returned frames.">
        <div className="grafana-query-grid">{data?.queries.map(query => <Card asChild key={`${query.language}-${query.title}`}><article><div><span>{query.language}</span><small>{query.queryType}</small></div><h3>{query.title}</h3><code>{query.expression}</code><p>{query.explanation}</p></article></Card>)}</div>
      </LabSection>

      <LabSection id="grafana-variables" eyebrow="05 · Variables" title="Make one dashboard reusable across contexts" description="Template variables appear as dashboard controls and are interpolated into panel titles, links, and queries.">
        <div className="table-wrap"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Definition</TableHead><TableHead>Current</TableHead><TableHead>Multi</TableHead><TableHead>Why it exists</TableHead></TableRow></TableHeader><TableBody>{data?.variables.map(variable => <TableRow key={variable.name}><TableCell><code>${variable.name}</code></TableCell><TableCell>{variable.type}</TableCell><TableCell><code>{variable.definition}</code></TableCell><TableCell>{variable.current}</TableCell><TableCell>{variable.multiValue ? 'Yes' : 'No'}</TableCell><TableCell>{variable.purpose}</TableCell></TableRow>)}</TableBody></Table></div>
      </LabSection>

      <LabSection id="grafana-explore" eyebrow="06 · Explore" title="Investigate first; promote durable answers to dashboards" description="Explore is the ad-hoc workspace for iterating on queries, inspecting raw results, splitting views, and moving between correlated signals.">
        <div className="grafana-explore-grid">{data?.explore.map(item => <Card asChild key={item.signal}><article><div><SignalIcon signal={item.signal} /><span>{item.dataSource}</span></div><h3>{item.signal} investigation</h3><code>{item.query}</code><p>{item.workflow}</p><Button asChild variant="link"><a href={`${grafanaUrl}/explore`} target="_blank" rel="noreferrer">Open in Explore ↗</a></Button></article></Card>)}</div>
      </LabSection>

      <LabSection id="grafana-annotations" eyebrow="07 · Annotations" title="Overlay events on telemetry timelines" description="Annotations explain why a graph changed by placing deployments, incidents, and other events directly on time-series panels.">
        <div className="grafana-annotation-layout"><div className="grafana-annotation-track"><span>60m ago</span><div>{analytics?.timeline.filter(point => point.annotations > 0).map(point => <i key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.annotations} annotations`} />)}</div><span>now</span></div><div>{data?.annotations.map(annotation => <Card asChild key={annotation.name}><article><div><strong>{annotation.name}</strong><Badge variant={annotation.enabled ? 'success' : 'secondary'} className={`pill ${annotation.enabled ? 'completed' : 'pending'}`}>{annotation.enabled ? 'Enabled' : 'Example'}</Badge></div><p>{annotation.source} · {annotation.tags}</p><code>{annotation.query}</code></article></Card>)}</div></div>
      </LabSection>

      <LabSection id="grafana-alerting" eyebrow="08 · Fundamental Alerting" title="Evaluate, route, and manage alert state" description="Seed real threshold signals, watch rules move through Pending and Firing, inspect routed notifications, and measure alert fatigue.">
        <div className="alerting-actions" aria-label="Alerting test scenarios">
          <div><strong>Test the complete lifecycle</strong><span>Each scenario adds 90 deterministic evaluations and updates Prometheus gauges.</span></div>
          <div>{['healthy', 'pending', 'firing', 'alert-fatigue'].map(scenario => <Button variant="secondary" size="sm" type="button" key={scenario} onClick={() => void seedAlerting(scenario)} disabled={Boolean(alertingSeeding)}>{alertingSeeding === scenario ? 'Seeding…' : scenario.replace('-', ' ')}</Button>)}</div>
          <a href={`${grafanaUrl}/d/fundamental-alerting`} target="_blank" rel="noreferrer">Open alert dashboard ↗</a>
        </div>

        <div className="alerting-summary" aria-label="Fundamental alerting analytics">
          <Summary label="Evaluations" value={alerting?.evaluationCount.toLocaleString() ?? '--'} detail="last 60 minutes" />
          <Summary label="Breaches" value={alerting?.thresholdBreaches ?? '--'} detail="values above threshold" tone="warning" />
          <Summary label="Pending" value={alerting?.pendingRules ?? '--'} detail="waiting for duration" tone={alerting?.pendingRules ? 'warning' : 'success'} />
          <Summary label="Firing" value={alerting?.firingRules ?? '--'} detail="active incidents" tone={alerting?.firingRules ? 'error' : 'success'} />
          <Summary label="Delivered" value={alerting?.deliveredNotifications ?? '--'} detail="routed notifications" />
          <Summary label="Noise ratio" value={alerting ? `${alerting.noiseRatioPercent.toFixed(1)}%` : '--'} detail={`${alerting?.suppressedNotifications ?? 0} suppressed`} tone={alerting && alerting.noiseRatioPercent > 35 ? 'error' : 'success'} />
        </div>

        <div className="grafana-alert-flow" aria-label="Grafana alerting flow"><Flow label="Query" detail="Prometheus signal" /><b>→</b><Flow label="Threshold" detail="Compare value" /><b>→</b><Flow label="Pending" detail="Sustain for duration" /><b>→</b><Flow label="Firing" detail="Open incident" /><b>→</b><Flow label="Notify" detail="Policy + channel" /></div>

        <AlertTopic title="Threshold alerts" description="A threshold turns an observed value into a breach decision. The threshold, unit, and current value stay visible so the decision is explainable.">
          <div className="alert-threshold-grid">{alerting?.rules.map(rule => { const percent = Math.min(100, rule.currentValue / rule.threshold * 70); return <Card asChild key={rule.uid}><article><div><strong>{rule.title}</strong><span>{rule.currentValue.toFixed(1)} {rule.unit}</span></div><div className="alert-threshold-track"><i style={{ width: `${percent}%` }} /><b style={{ left: '70%' }} /></div><small>Threshold: {rule.threshold.toLocaleString()} {rule.unit} · {rule.breaches} breaches</small></article></Card>; })}</div>
        </AlertTopic>

        <AlertTopic title="Alert rules" description="Rules bind a query, condition, pending duration, labels, and explicit No Data/Error behavior into one repeatable evaluation.">
          <div className="grafana-alert-grid">{data?.alerting.map(alert => <Card asChild key={alert.uid}><article><div><span className={`grafana-alert-state ${alert.state.toLowerCase()}`}>{alert.state}</span><small>{alert.severity} · {alert.source}</small></div><h3>{alert.title}</h3><code>{alert.query}</code><dl><div><dt>Condition</dt><dd>{alert.condition}</dd></div><div><dt>For</dt><dd>{alert.for}</dd></div><div><dt>No data / error</dt><dd>{alert.noDataState} / {alert.errorState}</dd></div></dl></article></Card>)}</div>
        </AlertTopic>

        <div className="alert-state-topics">
          <AlertTopic title="Pending" description="A rule is Pending while its threshold is breached but the configured duration has not elapsed. Recovery during this window prevents a notification.">
            <div className="alert-state-card pending"><strong>{alerting?.pendingRules ?? 0}</strong><span>rules pending now</span><small>Use the pending scenario to hold all rules above threshold without opening incidents.</small></div>
          </AlertTopic>
          <AlertTopic title="Firing" description="A rule becomes Firing only after the breach remains true for the full pending duration. Entering Firing creates an incident and routes a notification.">
            <div className="alert-state-card firing"><strong>{alerting?.firingRules ?? 0}</strong><span>rules firing now</span><small>{alerting?.incidentCount ?? 0} distinct firing transitions occurred in this window.</small></div>
          </AlertTopic>
        </div>

        <div className="alerting-analytics">
          <div><h4>State and notification timeline</h4><AlertingTimeline points={alerting?.timeline.slice(-48) ?? []} /><div className="alerting-legend"><span className="pending">Pending</span><span className="firing">Firing</span><span className="delivered">Delivered</span><span className="suppressed">Suppressed</span></div></div>
          <div><h4>Rule health</h4>{alerting?.rules.map(rule => <Card asChild className="alert-rule-health" key={rule.uid}><article><span className={`grafana-alert-state ${rule.state.toLowerCase()}`}>{rule.state}</span><div><strong>{rule.title}</strong><small>{rule.evaluations} evaluations · {rule.transitions} transitions · {rule.notifications} notifications</small></div></article></Card>)}</div>
        </div>

        <AlertTopic title="Notification channels" description="Notification policies route by severity and lifecycle, then grouping and cooldown settings control cadence.">
          <div className="notification-channel-grid">{data?.notificationChannels.map(channel => { const usage = alerting?.channels.find(item => item.name === channel.name); return <Card asChild key={channel.name}><article><div><strong>{channel.name}</strong><Badge variant="success" className="pill completed">{channel.provisioned ? 'Provisioned' : 'Example'}</Badge></div><p>{channel.type} · {channel.route}</p><small>{channel.cadence}</small><dl><div><dt>Attempts</dt><dd>{usage?.attempts ?? 0}</dd></div><div><dt>Delivered</dt><dd>{usage?.delivered ?? 0}</dd></div><div><dt>Suppressed</dt><dd>{usage?.suppressed ?? 0}</dd></div></dl></article></Card>; })}</div>
        </AlertTopic>

        <AlertTopic title="Alert fatigue" description="Fatigue is visible as repeated or suppressed notifications per distinct incident. The alert-fatigue scenario intentionally flaps to make this cost measurable.">
          <div className="alert-fatigue-layout"><div className="alert-fatigue-score"><strong>{alerting ? `${alerting.noiseRatioPercent.toFixed(1)}%` : '--'}</strong><span>notification noise</span><small>{alerting?.notificationAttempts ?? 0} attempts for {alerting?.incidentCount ?? 0} incidents</small></div><div className="alert-fatigue-practices">{data?.alertFatigue.map((practice, index) => <Card asChild key={practice.title}><article><span>{index + 1}</span><div><strong>{practice.title}</strong><p>{practice.description}</p></div></article></Card>)}</div></div>
        </AlertTopic>

        <div className="alerting-recent"><h4>Recent alert events</h4><div className="table-wrap compact-table"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Rule</TableHead><TableHead>Detail</TableHead><TableHead>Scenario</TableHead></TableRow></TableHeader><TableBody>{alerting?.recentEvents.map((event, index) => <TableRow key={`${event.timestamp}-${event.type}-${index}`}><TableCell>{new Date(event.timestamp).toLocaleTimeString()}</TableCell><TableCell>{event.type}</TableCell><TableCell>{event.rule}</TableCell><TableCell>{event.detail}</TableCell><TableCell><code>{event.scenario}</code></TableCell></TableRow>)}</TableBody></Table></div></div>
      </LabSection>

      <LabSection id="grafana-correlation" eyebrow="09 · Correlation" title="Move between logs, metrics, and traces without losing context" description="The seed path emits real logs and measurements inside sampled spans. The same trace and span identities are retained by Loki, Prometheus exemplars, and Tempo so every pivot can be tested in Grafana.">
        <div className="correlation-actions">
          <div>
            <strong>Live correlation dataset</strong>
            <span>{correlation?.operationCount ?? 0} operations available in the current 60-minute analytics window</span>
          </div>
          <Button type="button" onClick={() => void seedCorrelations()} disabled={correlationSeeding}>{correlationSeeding ? 'Seeding correlated signals...' : 'Seed 24 correlated operations'}</Button>
        </div>

        <div className="correlation-summary" aria-label="Correlation analytics summary">
          <Summary label="Operations" value={correlation?.operationCount ?? '--'} detail="seeded transactions" />
          <Summary label="Logs" value={correlation?.logCount ?? '--'} detail="trace-aware events" />
          <Summary label="Metric points" value={correlation?.metricPointCount ?? '--'} detail="inside active spans" />
          <Summary label="Exemplars" value={correlation?.exemplarCount ?? '--'} detail="trace candidates" tone="success" />
          <Summary label="Trace IDs" value={correlation?.uniqueTraceIds ?? '--'} detail="128-bit identities" />
          <Summary label="Span IDs" value={correlation?.uniqueSpanIds ?? '--'} detail="64-bit identities" />
        </div>

        <div className="correlation-flow" aria-label="Cross-signal correlation flow">
          <Flow label="Loki logs" detail="trace_id · span_id" /><b>↔</b>
          <Flow label="Tempo trace" detail="span waterfall" /><b>↔</b>
          <Flow label="Prometheus" detail="exemplar diamond" />
        </div>

        <div className="correlation-analytics">
          <div>
            <h3>Correlated operations by minute</h3>
            <CorrelationTimeline points={correlation?.timeline.slice(-40) ?? []} />
            <div className="grafana-legend"><span className="queries">Operations</span><span className="errors">Failures</span><span className="markers">Exemplars</span></div>
          </div>
          <div className="correlation-latency">
            <h3>Correlated latency</h3>
            <strong>{correlation ? `${correlation.p95DurationMilliseconds.toFixed(0)} ms` : '--'}</strong>
            <span>p95</span>
            <small>{correlation ? `${correlation.averageDurationMilliseconds.toFixed(0)} ms average` : 'Waiting for seed data'}</small>
          </div>
        </div>

        <div className="correlation-card-grid">
          {data?.correlations.map((item, index) => <Card asChild key={item.title}><article>
            <div><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.signals}</strong></div>
            <h3>{item.title}</h3>
            <dl><div><dt>Join key</dt><dd><code>{item.joinKey}</code></dd></div><div><dt>Provisioning</dt><dd>{item.configuration}</dd></div></dl>
            <code>{item.query}</code>
            <p>{item.workflow}</p>
          </article></Card>)}
        </div>

        <div className="correlation-recent">
          <h3>Recent end-to-end correlation samples</h3>
          <div className="table-wrap compact-table"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Correlation ID</TableHead><TableHead>Trace ID</TableHead><TableHead>Root span</TableHead><TableHead>Exemplar span</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{correlation?.recentOperations.map(operation => <TableRow key={operation.correlationId}><TableCell>{new Date(operation.timestamp).toLocaleTimeString()}</TableCell><TableCell><code>{operation.correlationId}</code></TableCell><TableCell><code title={operation.traceId}>{shortId(operation.traceId)}</code></TableCell><TableCell><code title={operation.rootSpanId}>{shortId(operation.rootSpanId)}</code></TableCell><TableCell><code title={operation.metricSpanId}>{shortId(operation.metricSpanId)}</code></TableCell><TableCell>{operation.durationMilliseconds.toFixed(0)} ms</TableCell><TableCell><Badge variant={operation.status === 'Completed' ? 'success' : 'destructive'} className={`pill ${operation.status === 'Completed' ? 'completed' : 'failed'}`}>{operation.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>
        </div>
      </LabSection>

      <section className="grafana-recent" aria-labelledby="grafana-recent-heading"><h3 id="grafana-recent-heading">Recent seeded query activity</h3><div className="table-wrap compact-table"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Dashboard</TableHead><TableHead>Data source</TableHead><TableHead>Panel</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{analytics?.recentActivity.map((activity, index) => <TableRow key={`${activity.timestamp}-${index}`}><TableCell>{new Date(activity.timestamp).toLocaleTimeString()}</TableCell><TableCell>{activity.dashboard}</TableCell><TableCell>{activity.dataSource}</TableCell><TableCell>{activity.panelType}</TableCell><TableCell>{activity.durationMilliseconds.toFixed(0)} ms</TableCell><TableCell><Badge variant={activity.status === 'Success' ? 'success' : 'destructive'} className={`pill ${activity.status === 'Success' ? 'completed' : 'failed'}`}>{activity.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div></section>
    </section>
  );
}

function LabSection({ id, eyebrow, title, description, children }: { id: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="grafana-section" id={id}><div className="otel-subheading"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3><p className="muted">{description}</p></div>{children}</section>;
}

function AlertTopic({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const id = `alert-topic-${title.toLowerCase().replace(/ /g, '-')}`;
  return <section className="alert-topic" aria-labelledby={id}><div><h4 id={id}>{title}</h4><p>{description}</p></div>{children}</section>;
}

function AlertingTimeline({ points }: { points: AlertingTimelinePoint[] }) {
  const maximum = Math.max(1, ...points.map(point => Math.max(point.pending, point.firing, point.delivered + point.suppressed)));
  return <div className="alerting-timeline" aria-label="Alert states and notifications over time">{points.map(point => <div key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.pending} pending, ${point.firing} firing, ${point.delivered} delivered, ${point.suppressed} suppressed`}><i className="pending" style={{ height: `${point.pending / maximum * 100}%` }} /><i className="firing" style={{ height: `${point.firing / maximum * 100}%` }} />{point.delivered > 0 && <b style={{ bottom: `${Math.min(90, point.delivered / maximum * 100)}%` }} />}{point.suppressed > 0 && <em />}</div>)}{points.length === 0 && <p className="chart-empty">Waiting for alert evaluations...</p>}</div>;
}

function QueryTimeline({ points }: { points: GrafanaTimelinePoint[] }) {
  const maximum = Math.max(1, ...points.map(point => point.queries));
  return <div className="grafana-timeline" aria-label="Grafana query activity over time">{points.map(point => <div key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.queries} queries, ${point.errors} errors`}><i style={{ height: `${Math.max(4, point.queries / maximum * 100)}%` }} />{point.errors > 0 && <b style={{ height: `${Math.max(3, point.errors / maximum * 100)}%` }} />}{point.annotations > 0 && <em />}</div>)}{points.length === 0 && <p className="chart-empty">Waiting for seeded queries...</p>}</div>;
}

function CorrelationTimeline({ points }: { points: CorrelationTimelinePoint[] }) {
  const maximum = Math.max(1, ...points.map(point => point.operations));
  return <div className="grafana-timeline" aria-label="Correlated operations over time">{points.map(point => <div key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.operations} operations, ${point.failures} failures, ${point.exemplars} exemplars`}><i style={{ height: `${Math.max(4, point.operations / maximum * 100)}%` }} />{point.failures > 0 && <b style={{ height: `${Math.max(3, point.failures / maximum * 100)}%` }} />}{point.exemplars > 0 && <em />}</div>)}{points.length === 0 && <p className="chart-empty">Waiting for correlated operations...</p>}</div>;
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function SignalIcon({ signal }: { signal: string }) {
  const symbol = signal === 'Metrics' ? 'M' : signal === 'Logs' ? 'L' : 'T';
  return <span className={`grafana-signal-icon ${signal.toLowerCase()}`} aria-hidden="true">{symbol}</span>;
}

function Summary({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone?: 'success' | 'warning' | 'error' }) {
  return <Card asChild className={tone ? `grafana-summary--${tone}` : undefined}><article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article></Card>;
}

function Flow({ label, detail }: { label: string; detail: string }) {
  return <div><strong>{label}</strong><span>{detail}</span></div>;
}
