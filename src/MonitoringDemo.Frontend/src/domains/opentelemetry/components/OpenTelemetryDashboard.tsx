import type { useOpenTelemetryDashboard } from '@/domains/opentelemetry/hooks/useOpenTelemetryDashboard';
import type { OpenTelemetryTimelinePoint } from '@/domains/opentelemetry/types';
import { StatusBadge } from '@/shared/components/StatusBadge';

type OpenTelemetryDashboardModel = ReturnType<typeof useOpenTelemetryDashboard>;

export function OpenTelemetryDashboard({ model }: { model: OpenTelemetryDashboardModel }) {
  const { overview, seeding, seedResult, error, seedTelemetry } = model;
  const data = overview.data;

  return (
    <section className="panel learning-panel otel-lab" aria-labelledby="otel-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OpenTelemetry</p>
          <h2 id="otel-heading">One SDK pipeline, three correlated signals</h2>
          <p>
            {data
              ? `${data.analytics.operationCount} seeded operations in the last ${data.windowMinutes} minutes`
              : 'Loading the OpenTelemetry pipeline...'}
          </p>
        </div>
        <div className="tracing-heading-actions">
          <StatusBadge active={Boolean(data)} activeLabel="SDK configured" inactiveLabel="Connecting" />
          <button type="button" onClick={() => void seedTelemetry()} disabled={seeding}>
            {seeding ? 'Seeding...' : 'Seed 100 multi-signal operations'}
          </button>
        </div>
      </div>

      {(overview.error || error) && (
        <p className="error panel-notice" role="alert">{error || 'OpenTelemetry analytics could not be loaded. The page will keep retrying.'}</p>
      )}
      {seedResult && (
        <p className="notice panel-notice" role="status">
          Run {seedResult.run} emitted {seedResult.seeded} correlated operations
          {seedResult.firstTraceId ? `; first trace ${seedResult.firstTraceId}.` : '.'}
        </p>
      )}

      <div className="otel-summary" aria-label="OpenTelemetry signal analytics">
        <Summary label="Operations" value={data?.analytics.operationCount ?? '--'} detail="seeded workflows" />
        <Summary label="Spans" value={data?.analytics.spanCount ?? '--'} detail="Tracer output" tone="trace" />
        <Summary label="Metric points" value={data?.analytics.metricPointCount ?? '--'} detail="Meter output" tone="metric" />
        <Summary label="Log records" value={data?.analytics.logRecordCount ?? '--'} detail="Logger output" tone="log" />
        <Summary label="Errors" value={data?.analytics.errorCount ?? '--'} detail="seeded failures" tone="error" />
        <Summary label="p95" value={data ? duration(data.analytics.p95DurationMilliseconds) : '--'} detail="operation latency" />
      </div>

      <div className="otel-section">
        <SectionTitle eyebrow="OpenTelemetry architecture" title="From application code to observability backends" />
        <div className="otel-architecture">
          {data?.architecture.map((stage, index) => (
            <div className="otel-architecture-step" key={stage.name}>
              <article>
                <span>{stage.role}</span>
                <strong>{stage.name}</strong>
                <small>{stage.description}</small>
              </article>
              {index < data.architecture.length - 1 && <i aria-hidden="true">→</i>}
            </div>
          ))}
        </div>
      </div>

      <div className="otel-analytics">
        <div>
          <h3>Signal volume by minute</h3>
          <SignalTimeline points={data?.analytics.timeline.slice(-20) ?? []} />
          <div className="otel-legend"><span className="trace">Spans</span><span className="metric">Metrics</span><span className="log">Logs</span></div>
        </div>
        <div>
          <h3>Operation analytics</h3>
          <div className="table-wrap compact-table">
            <table>
              <thead><tr><th>Operation</th><th>Runs</th><th>Errors</th><th>Average</th></tr></thead>
              <tbody>
                {data?.analytics.operations.map(operation => (
                  <tr key={operation.operation}>
                    <td><code>{operation.operation}</code></td>
                    <td>{operation.count}</td>
                    <td>{operation.errorCount}</td>
                    <td>{duration(operation.averageDurationMilliseconds)}</td>
                  </tr>
                ))}
                {!data?.analytics.operations.length && <tr><td colSpan={4} className="empty">Waiting for seed data.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="otel-section otel-api-sdk">
        <SectionTitle eyebrow="API and SDK" title="Separate instrumentation from configuration" />
        <div className="otel-card-grid two-column">
          {data?.apiAndSdk.map(item => (
            <article className="otel-concept-card" key={item.name}>
              <div><strong>{item.name}</strong><span>{item.role}</span></div>
              <code>{item.example}</code>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="otel-section">
        <SectionTitle eyebrow="Automatic and manual instrumentation" title="What creates telemetry in this application" />
        <div className="otel-instrumentation-grid">
          {['Automatic', 'Manual'].map(type => (
            <div key={type}>
              <h3>{type} instrumentation</h3>
              <p className="muted">{type === 'Automatic' ? 'Instrumentation packages observe framework activity.' : 'Application code records domain-specific telemetry.'}</p>
              {data?.instrumentation.filter(item => item.type === type).map(item => (
                <article className="otel-instrument-row" key={item.library}>
                  <span className={`otel-enabled${item.enabled ? ' active' : ''}`} aria-label={item.enabled ? 'enabled' : 'disabled'} />
                  <div><strong>{item.library}</strong><small>{item.produces}</small></div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="otel-resource-conventions">
        <div className="otel-section">
          <SectionTitle eyebrow="Resource" title="Who produced this telemetry?" />
          <dl className="otel-definition-list">
            {data?.resource.map(attribute => (
              <div key={attribute.key}>
                <dt><code>{attribute.key}</code><small>{attribute.source}</small></dt>
                <dd>{attribute.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="otel-section">
          <SectionTitle eyebrow="Semantic Conventions" title="Portable names and meanings" />
          <dl className="otel-definition-list">
            {data?.semanticConventions.map(attribute => (
              <div key={attribute.example}>
                <dt><code>{attribute.role}</code><small>{attribute.name}</small></dt>
                <dd><strong>{attribute.example}</strong><span>{attribute.description}</span></dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="otel-section">
        <SectionTitle eyebrow="Tracer · Meter · Logger" title="The three signal APIs in this demo" />
        <div className="otel-card-grid three-column">
          {data?.signals.map(signal => (
            <article className={`otel-signal-card ${signal.name.toLowerCase()}`} key={signal.name}>
              <span>{signal.output}</span>
              <h3>{signal.name}</h3>
              <code>{signal.api}</code>
              <p>{signal.description}</p>
              <small>Exported to <strong>{signal.exportedTo}</strong></small>
            </article>
          ))}
        </div>
      </div>

      <div className="otel-section otel-propagators">
        <SectionTitle eyebrow="Propagators" title="Context crosses process and transport boundaries" />
        <p className="muted">The W3C propagators inject fields into a carrier before send and extract them to create the remote parent on receive.</p>
        <div className="otel-propagation-flow" aria-label="Context propagation flow">
          <strong>Active span</strong><span>inject</span><code>HTTP headers / gRPC metadata</code><span>extract</span><strong>Remote child span</strong>
        </div>
        <div className="otel-card-grid three-column">
          {data?.propagators.map(propagator => (
            <article className="otel-propagator-card" key={propagator.field}>
              <div><code>{propagator.field}</code><span className={`otel-enabled${propagator.enabled ? ' active' : ''}`} /></div>
              <strong>{propagator.name}</strong>
              <p>{propagator.purpose}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value, detail, tone = '' }: { label: string; value: string | number; detail: string; tone?: string }) {
  return <article className={tone}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="otel-subheading"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>;
}

function SignalTimeline({ points }: { points: OpenTelemetryTimelinePoint[] }) {
  const maximum = Math.max(1, ...points.map(point => point.spans + point.metrics + point.logs));
  return (
    <div className="otel-timeline" aria-label="Seeded OpenTelemetry signals over time">
      {points.map(point => {
        const total = point.spans + point.metrics + point.logs;
        return (
          <div className="otel-timeline-column" key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.spans} spans, ${point.metrics} metric points, ${point.logs} logs`}>
            <i className="trace" style={{ height: `${(point.spans / maximum) * 100}%` }} />
            <i className="metric" style={{ height: `${(point.metrics / maximum) * 100}%` }} />
            <i className="log" style={{ height: `${(point.logs / maximum) * 100}%` }} />
            {point.errors > 0 && <b title={`${point.errors} errors`} />}
            <span className="sr-only">{total} signal records</span>
          </div>
        );
      })}
      {!points.length && <p className="chart-empty">Seed operations to populate the timeline.</p>}
    </div>
  );
}

function duration(milliseconds: number): string {
  return milliseconds >= 1_000 ? `${(milliseconds / 1_000).toFixed(2)} s` : `${Math.round(milliseconds)} ms`;
}
