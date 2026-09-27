import type { useOtlpDashboard } from '@/domains/otlp/hooks/useOtlpDashboard';
import type { OtlpProtocolDefinition, OtlpTimelinePoint } from '@/domains/otlp/types';
import { StatusBadge } from '@/shared/components/StatusBadge';

type OtlpDashboardModel = ReturnType<typeof useOtlpDashboard>;

export function OtlpDashboard({ model }: { model: OtlpDashboardModel }) {
  const { overview, seeding, seedResult, error, seedOtlp } = model;
  const data = overview.data;
  const grpc = data?.protocols.find(protocol => protocol.protocol === 'gRPC');
  const http = data?.protocols.find(protocol => protocol.protocol === 'HTTP/protobuf');

  return (
    <section className="panel learning-panel otlp-lab" aria-labelledby="otlp-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OTLP</p>
          <h2 id="otlp-heading">One wire protocol for every telemetry signal</h2>
          <p>
            {data
              ? `${data.analytics.batchCount} export batches and ${data.analytics.recordCount.toLocaleString()} records in the last ${data.windowMinutes} minutes`
              : 'Loading the OTLP transport pipeline...'}
          </p>
        </div>
        <div className="tracing-heading-actions">
          <StatusBadge active={Boolean(data)} activeLabel="Transport configured" inactiveLabel="Connecting" />
          <button type="button" onClick={() => void seedOtlp()} disabled={seeding}>
            {seeding ? 'Seeding...' : 'Seed 120 OTLP batches'}
          </button>
        </div>
      </div>

      {(overview.error || error) && (
        <p className="error panel-notice" role="alert">{error || 'OTLP analytics could not be loaded. The page will keep retrying.'}</p>
      )}
      {seedResult && (
        <p className="notice panel-notice" role="status">
          Run {seedResult.run} generated {seedResult.seeded} batches containing {seedResult.analytics.recordCount.toLocaleString()} records.
        </p>
      )}

      <div className="otlp-summary" aria-label="OTLP export analytics summary">
        <Summary label="Batches" value={data?.analytics.batchCount ?? '--'} detail="export requests" />
        <Summary label="Records" value={data?.analytics.recordCount.toLocaleString() ?? '--'} detail="traces + metrics + logs" />
        <Summary label="Wire size" value={data ? bytes(data.analytics.wireBytes) : '--'} detail="compressed payload" />
        <Summary label="Saved" value={data ? `${data.analytics.compressionSavingsPercent.toFixed(1)}%` : '--'} detail="versus raw payload" />
        <Summary label="Retries" value={data?.analytics.retriedBatchCount ?? '--'} detail={`${data?.analytics.failedBatchCount ?? 0} terminal failures`} tone="warning" />
        <Summary label="p95 latency" value={data ? duration(data.analytics.p95DurationMilliseconds) : '--'} detail="export request" />
      </div>

      <section className="otlp-section" aria-labelledby="otlp-overview-heading">
        <SectionTitle eyebrow="OTLP" title="Signals become resource-scoped protobuf batches" id="otlp-overview-heading" />
        <p className="muted otlp-data-note">Each seed emits real SDK telemetry and also records a deterministic local transport model; payload size, retry, and latency values are teaching data rather than private exporter internals.</p>
        <div className="otlp-flow" aria-label="OTLP export flow">
          <FlowNode label="Application" detail="traces · metrics · logs" />
          <FlowArrow label="record" />
          <FlowNode label="OpenTelemetry SDK" detail="sample · aggregate · batch" />
          <FlowArrow label="export" />
          <FlowNode label="OTLP exporter" detail="protobuf request" />
          <FlowArrow label="send" />
          <FlowNode label="Collector / backend" detail="receive · process · store" />
        </div>

        <div className="otlp-analytics-grid">
          <div>
            <h3>Batch volume by minute</h3>
            <ProtocolTimeline points={data?.analytics.timeline.slice(-24) ?? []} />
            <div className="otlp-legend"><span className="grpc">gRPC</span><span className="http">HTTP/protobuf</span><span className="failure">Failure</span></div>
          </div>
          <div>
            <h3>Signal payloads</h3>
            <div className="otlp-signal-list">
              {data?.analytics.signals.map(signal => {
                const maxRecords = Math.max(1, ...data.analytics.signals.map(item => item.recordCount));
                return (
                  <article key={signal.signal}>
                    <div><strong>{signal.signal}</strong><span>{signal.recordCount.toLocaleString()} records</span></div>
                    <div className="otlp-signal-track"><i style={{ width: `${(signal.recordCount / maxRecords) * 100}%` }} /></div>
                    <small>{signal.batchCount} batches · {bytes(signal.wireBytes)} · {signal.failedBatchCount} failed</small>
                  </article>
                );
              })}
              {!data?.analytics.signals.length && <p className="muted">Waiting for seeded payloads.</p>}
            </div>
          </div>
        </div>

        <div className="table-wrap compact-table otlp-batches">
          <table>
            <thead><tr><th>Batch</th><th>Signal</th><th>Transport</th><th>Destination</th><th>Records</th><th>Size</th><th>Latency</th><th>Status</th></tr></thead>
            <tbody>
              {data?.analytics.recentBatches.map(batch => (
                <tr key={batch.batchId}>
                  <td><code>{batch.batchId}</code></td>
                  <td>{batch.signal}</td>
                  <td><ProtocolPill protocol={batch.protocol} /></td>
                  <td>{batch.destination}</td>
                  <td>{batch.recordCount}</td>
                  <td>{bytes(batch.wireBytes)}</td>
                  <td>{duration(batch.durationMilliseconds)}</td>
                  <td><span className={`otlp-batch-status ${batch.status.toLowerCase()}`}>{batch.status}</span></td>
                </tr>
              ))}
              {!data?.analytics.recentBatches.length && <tr><td colSpan={8} className="empty">Seed OTLP batches to populate export analytics.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <ProtocolSection kind="grpc" protocol={grpc} analytics={data?.analytics.protocols.find(item => item.protocol === 'gRPC')} />
      <ProtocolSection kind="http" protocol={http} analytics={data?.analytics.protocols.find(item => item.protocol === 'HTTP/protobuf')} />

      <section className="otlp-section otlp-endpoints" aria-labelledby="endpoint-configuration-heading">
        <SectionTitle eyebrow="Endpoint configuration" title="Resolve configuration per signal without exposing secrets" id="endpoint-configuration-heading" />
        <p className="muted">This table reports the effective non-secret endpoint settings visible to the API process. Authentication header values are intentionally never returned.</p>

        <div className="table-wrap compact-table">
          <table>
            <thead><tr><th>Destination</th><th>Signals</th><th>Protocol</th><th>Endpoint</th><th>Source</th><th>State</th></tr></thead>
            <tbody>
              {data?.endpoints.map(endpoint => (
                <tr key={`${endpoint.destination}-${endpoint.signals}`} title={endpoint.note}>
                  <td><strong>{endpoint.destination}</strong></td>
                  <td>{endpoint.signals}</td>
                  <td><ProtocolPill protocol={endpoint.protocol} /></td>
                  <td><code className="otlp-endpoint-value">{endpoint.endpoint}</code></td>
                  <td><code>{endpoint.source}</code></td>
                  <td><span className={`otlp-config-state${endpoint.configured ? ' configured' : ''}`}>{endpoint.configured ? 'Configured' : 'Fallback'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="otlp-precedence">
          {data?.endpointPrecedence.map(rule => (
            <article key={rule.priority}>
              <span>{rule.priority}</span>
              <div><strong>{rule.name}</strong><code>{rule.variable}</code><p>{rule.description}</p></div>
            </article>
          ))}
        </div>

        <div className="otlp-config-example">
          <div>
            <span className="eyebrow">Environment example</span>
            <strong>Generic gRPC exporter</strong>
          </div>
          <pre><code>{`OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317\nOTEL_EXPORTER_OTLP_PROTOCOL=grpc`}</code></pre>
          <div>
            <span className="eyebrow">Signal override</span>
            <strong>Trace-only OTLP/HTTP exporter</strong>
          </div>
          <pre><code>{`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://tempo:4318/v1/traces\nOTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf`}</code></pre>
        </div>
      </section>
    </section>
  );
}

function ProtocolSection({ kind, protocol, analytics }: { kind: 'grpc' | 'http'; protocol?: OtlpProtocolDefinition; analytics?: { batchCount: number; recordCount: number; retriedBatchCount: number; failedBatchCount: number; averageDurationMilliseconds: number; p95DurationMilliseconds: number; wireBytes: number } }) {
  const isGrpc = kind === 'grpc';
  const sectionId = isGrpc ? 'otlp-grpc-heading' : 'otlp-http-heading';
  return (
    <section className={`otlp-section otlp-protocol ${isGrpc ? 'grpc' : 'http'}`} aria-labelledby={sectionId}>
      <SectionTitle eyebrow={protocol?.name ?? (isGrpc ? 'OTLP/gRPC' : 'OTLP/HTTP')} title={protocol?.description ?? 'Loading protocol details...'} id={sectionId} />
      <div className="otlp-protocol-layout">
        <article className="otlp-protocol-anatomy">
          <div className="otlp-port"><span>Default port</span><strong>{protocol?.defaultPort ?? '----'}</strong></div>
          <dl>
            <div><dt>Transport</dt><dd>{protocol?.transport ?? '--'}</dd></div>
            <div><dt>Encoding</dt><dd>Protocol Buffers</dd></div>
            <div><dt>Content</dt><dd>Resource → scope → signal records</dd></div>
          </dl>
          <div className="otlp-methods">
            {protocol?.methodsOrPaths.map(method => <code key={method}>{method}</code>)}
          </div>
        </article>

        <article className="otlp-protocol-live">
          <h3>Seeded transport analytics</h3>
          <div className="otlp-live-stats">
            <Metric label="Batches" value={analytics?.batchCount ?? '--'} />
            <Metric label="Records" value={analytics?.recordCount.toLocaleString() ?? '--'} />
            <Metric label="Average" value={analytics ? duration(analytics.averageDurationMilliseconds) : '--'} />
            <Metric label="p95" value={analytics ? duration(analytics.p95DurationMilliseconds) : '--'} />
            <Metric label="Retries" value={analytics?.retriedBatchCount ?? '--'} />
            <Metric label="Failed" value={analytics?.failedBatchCount ?? '--'} />
            <Metric label="Wire size" value={analytics ? bytes(analytics.wireBytes) : '--'} />
          </div>
          <ul>{protocol?.strengths.map(strength => <li key={strength}>{strength}</li>)}</ul>
        </article>
      </div>
    </section>
  );
}

function ProtocolTimeline({ points }: { points: OtlpTimelinePoint[] }) {
  const maximum = Math.max(1, ...points.map(point => point.grpcBatches + point.httpBatches));
  return (
    <div className="otlp-timeline" aria-label="OTLP batches by protocol over time">
      {points.map(point => (
        <div className="otlp-timeline-column" key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.grpcBatches} gRPC, ${point.httpBatches} HTTP, ${point.records} records`}>
          <i className="grpc" style={{ height: `${(point.grpcBatches / maximum) * 100}%` }} />
          <i className="http" style={{ height: `${(point.httpBatches / maximum) * 100}%` }} />
          {point.failures > 0 && <b title={`${point.failures} failures`} />}
        </div>
      ))}
      {!points.length && <p className="chart-empty">Seed batches to populate the transport timeline.</p>}
    </div>
  );
}

function Summary({ label, value, detail, tone = '' }: { label: string; value: string | number; detail: string; tone?: string }) {
  return <article className={tone}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <div className="otel-subheading"><p className="eyebrow">{eyebrow}</p><h3 id={id}>{title}</h3></div>;
}

function FlowNode({ label, detail }: { label: string; detail: string }) {
  return <article><strong>{label}</strong><span>{detail}</span></article>;
}

function FlowArrow({ label }: { label: string }) {
  return <div aria-hidden="true"><span>{label}</span><i>→</i></div>;
}

function ProtocolPill({ protocol }: { protocol: string }) {
  const isGrpc = protocol === 'gRPC';
  return <span className={`otlp-protocol-pill ${isGrpc ? 'grpc' : 'http'}`}>{protocol}</span>;
}

function duration(milliseconds: number): string {
  return `${milliseconds.toFixed(milliseconds < 10 ? 1 : 0)} ms`;
}

function bytes(value: number): string {
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KiB`;
  return `${(value / 1_048_576).toFixed(2)} MiB`;
}
