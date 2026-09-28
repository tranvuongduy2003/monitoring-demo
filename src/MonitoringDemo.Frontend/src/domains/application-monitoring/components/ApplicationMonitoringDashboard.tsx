import type { useApplicationMonitoringDashboard } from '@/domains/application-monitoring/hooks/useApplicationMonitoringDashboard';
import type { ApplicationMonitoringCategory, ApplicationMonitoringScenario, ApplicationMonitoringSection } from '@/domains/application-monitoring/types';
import { QueryGrid } from '@/shared/components/QueryGrid';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { dateTime } from '@/shared/lib/formatters';

type DashboardModel = ReturnType<typeof useApplicationMonitoringDashboard>;

const scenarios: Array<{ value: ApplicationMonitoringScenario; label: string }> = [
  { value: 'healthy', label: 'Seed healthy' },
  { value: 'cache-pressure', label: 'Seed cache pressure' },
  { value: 'dependency-outage', label: 'Seed dependency outage' },
];

const sectionMeta: Array<{ category: ApplicationMonitoringCategory; number: string; label: string; description: string }> = [
  { category: 'http', number: '01', label: 'HTTP metrics', description: 'Request volume, status, errors, and route latency.' },
  { category: 'database', number: '02', label: 'Database metrics', description: 'Query throughput, failures, and operation latency.' },
  { category: 'cache', number: '03', label: 'Cache metrics', description: 'Hit ratio, misses, failures, and lookup latency.' },
  { category: 'dependency', number: '04', label: 'Dependency monitoring', description: 'Downstream availability and call performance.' },
  { category: 'custom-metric', number: '05', label: 'Custom metrics', description: 'Business events, revenue, and queue depth.' },
  { category: 'custom-span', number: '06', label: 'Custom spans', description: 'Traceable application operations and duration.' },
  { category: 'error', number: '07', label: 'Error monitoring', description: 'Typed failures correlated with source and scenario.' },
];

export function ApplicationMonitoringDashboard({ model }: { model: DashboardModel }) {
  const { analytics, seeding, message, seed } = model;
  const data = analytics.data;
  const section = (category: ApplicationMonitoringCategory) => data?.sections.find(item => item.category === category);

  return (
    <section className="panel learning-panel application-monitoring-lab">
      <SectionHeading
        eyebrow="Application signal lab"
        title="Instrument the complete request path"
        description={data ? `${data.sections.reduce((sum, item) => sum + item.operations, 0).toLocaleString()} observations analyzed over ${data.windowMinutes} minutes` : 'Loading application telemetry...'}
        actions={scenarios.map(({ value, label }, index) => (
          <button className={index === 0 ? undefined : 'secondary'} type="button" disabled={seeding !== null} onClick={() => void seed(value)} key={value}>
            {seeding === value ? 'Seeding...' : label}
          </button>
        ))}
      />

      {message && <p className="notice panel-notice" role="status">{message}</p>}
      {analytics.error && <p className="error panel-notice" role="alert">Application analytics could not be loaded. The page will keep retrying.</p>}

      <nav className="application-signal-nav" aria-label="Application monitoring sections">
        {sectionMeta.map(item => <a href={`#application-${item.category}`} key={item.category}><span>{item.number}</span><strong>{item.label}</strong><small>{item.description}</small></a>)}
      </nav>

      <SignalTimeline data={data?.timeSeries ?? []} />

      <MonitoringSection id="http" label="HTTP metrics" description="Track every request by stable route, method, status code, latency, and outcome.">
        <SectionSummary section={section('http')} />
        <BreakdownTable section={section('http')} firstColumn="Route" />
        <Queries data={data} category="http" />
      </MonitoringSection>

      <MonitoringSection id="database" label="Database metrics" description="Measure PostgreSQL operations separately from HTTP time so query bottlenecks are visible.">
        <SectionSummary section={section('database')} />
        <BreakdownTable section={section('database')} firstColumn="Operation" />
        <Queries data={data} category="database" />
      </MonitoringSection>

      <MonitoringSection id="cache" label="Cache metrics" description="Watch efficiency and latency together: a healthy cache needs a high hit rate and fast lookups.">
        <SectionSummary section={section('cache')} extra={{ label: 'Hit rate', value: `${data?.cache.hitRatePercent ?? 0}%`, detail: `${data?.cache.hits ?? 0} hits / ${data?.cache.misses ?? 0} misses` }} />
        <BreakdownTable section={section('cache')} firstColumn="Operation" />
        <Queries data={data} category="cache" />
      </MonitoringSection>

      <MonitoringSection id="dependency" label="Dependency monitoring" description="Isolate slow and unavailable downstream services before they cascade into user-facing errors.">
        <SectionSummary section={section('dependency')} />
        <BreakdownTable section={section('dependency')} firstColumn="Service" />
        <Queries data={data} category="dependency" />
      </MonitoringSection>

      <MonitoringSection id="custom-metric" label="Custom metrics" description="Pair technical signals with business outcomes that framework instrumentation cannot infer.">
        <div className="application-stat-grid four">
          <Stat label="Checkout started" value={data?.business.checkoutsStarted ?? 0} detail="attempted" />
          <Stat label="Checkout completed" value={data?.business.checkoutsCompleted ?? 0} detail="successful" />
          <Stat label="Revenue" value={`$${(data?.business.revenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} detail="seeded order value" />
          <Stat label="Queue depth" value={data?.business.queueDepth ?? 0} detail="current items" />
        </div>
        <Queries data={data} category="custom-metric" />
      </MonitoringSection>

      <MonitoringSection id="custom-span" label="Custom spans" description="Add domain-level trace boundaries around checkout, database, cache, and dependency work.">
        <SectionSummary section={section('custom-span')} />
        <div className="application-table-wrap"><table><thead><tr><th>Span</th><th>Trace ID</th><th>Duration</th><th>Outcome</th><th>Observed</th></tr></thead><tbody>
          {data?.recentSpans.map((span, index) => <tr key={`${span.traceId}-${index}`}><td>{span.name}</td><td><code>{span.traceId.slice(0, 16)}…</code></td><td>{span.durationMilliseconds} ms</td><td><span className={`signal-outcome ${span.success ? 'ok' : 'failed'}`}>{span.success ? 'ok' : 'error'}</span></td><td>{dateTime.format(new Date(span.timestamp))}</td></tr>)}
        </tbody></table></div>
        <Queries data={data} category="custom-span" />
      </MonitoringSection>

      <MonitoringSection id="error" label="Error monitoring" description="Aggregate typed errors while retaining the source, scenario, message, and trace correlation context.">
        <SectionSummary section={section('error')} />
        <div className="application-error-list">
          {data?.recentErrors.map((error, index) => <article key={`${error.timestamp}-${index}`}><span>{error.source}</span><div><strong>{error.type}</strong><p>{error.message}</p></div><small>{error.scenario}<br />{dateTime.format(new Date(error.timestamp))}</small></article>)}
          {!data?.recentErrors.length && <p className="muted">No errors in this window.</p>}
        </div>
        <Queries data={data} category="error" />
      </MonitoringSection>
    </section>
  );
}

function MonitoringSection({ id, label, description, children }: { id: ApplicationMonitoringCategory; label: string; description: string; children: React.ReactNode }) {
  const number = sectionMeta.find(item => item.category === id)?.number;
  return <section className="application-signal-section" id={`application-${id}`}><header><span>{number}</span><div><h2>{label}</h2><p>{description}</p></div></header>{children}</section>;
}

function SectionSummary({ section, extra }: { section?: ApplicationMonitoringSection; extra?: { label: string; value: string; detail: string } }) {
  return <div className={`application-stat-grid ${extra ? 'four' : ''}`}>
    <Stat label="Operations" value={section?.operations ?? 0} detail="in selected window" />
    <Stat label="Error rate" value={`${section?.errorRatePercent ?? 0}%`} detail={`${section?.errors ?? 0} failed`} danger={(section?.errors ?? 0) > 0} />
    <Stat label="p95 latency" value={`${section?.p95DurationMilliseconds ?? 0} ms`} detail={`${section?.averageDurationMilliseconds ?? 0} ms average`} />
    {extra && <Stat label={extra.label} value={extra.value} detail={extra.detail} />}
  </div>;
}

function Stat({ label, value, detail, danger = false }: { label: string; value: string | number; detail: string; danger?: boolean }) {
  return <article className={danger ? 'danger' : ''}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function BreakdownTable({ section, firstColumn }: { section?: ApplicationMonitoringSection; firstColumn: string }) {
  return <div className="application-table-wrap"><table><thead><tr><th>{firstColumn}</th><th>Operations</th><th>Errors</th><th>Average latency</th></tr></thead><tbody>
    {section?.breakdown.map(item => <tr key={item.name}><td>{item.name}</td><td>{item.operations}</td><td>{item.errors}</td><td>{item.averageDurationMilliseconds} ms</td></tr>)}
  </tbody></table></div>;
}

function Queries({ data, category }: { data?: DashboardModel['analytics']['data']; category: ApplicationMonitoringCategory }) {
  return <QueryGrid queries={data?.queries.filter(query => query.section === category) ?? []} className="application-queries" />;
}

function SignalTimeline({ data }: { data: NonNullable<DashboardModel['analytics']['data']>['timeSeries'] }) {
  const recent = data.slice(-70);
  const max = Math.max(1, ...recent.map(point => point.operations));
  return <section className="application-timeline"><div><h2>Cross-signal activity</h2><span>Last {Math.min(70, recent.length)} minute/category points</span></div><div className="application-bars">
    {recent.map((point, index) => <i className={`bar-${point.category}`} style={{ height: `${Math.max(5, point.operations / max * 100)}%` }} title={`${point.category}: ${point.operations} operations, ${point.errors} errors`} key={`${point.timestamp}-${point.category}-${index}`} />)}
  </div><div className="application-legend">{sectionMeta.map(item => <span key={item.category}><i className={`bar-${item.category}`} />{item.label}</span>)}</div></section>;
}
