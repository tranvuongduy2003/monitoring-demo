import { useEffect, useMemo, useState } from 'react';
import type { useTracingDashboard } from '@/domains/tracing/hooks/useTracingDashboard';
import type {
  TraceDetail,
  TracePropagationAnalytics,
  TracePropagationHop,
  TraceSpan,
} from '@/domains/tracing/types';
import { QueryGrid } from '@/shared/components/QueryGrid';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { StatusBadge } from '@/shared/components/StatusBadge';

type TracingDashboardModel = ReturnType<typeof useTracingDashboard>;

export function TracingDashboard({ model }: { model: TracingDashboardModel }) {
  const { overview, seeding, seedResult, error, seedTraces } = model;
  const data = overview.data;
  const [selectedTraceId, setSelectedTraceId] = useState('');
  const [selectedSpanId, setSelectedSpanId] = useState('');

  const selectedTrace = useMemo(
    () => data?.traces.find(trace => trace.traceId === selectedTraceId) ?? data?.traces[0],
    [data?.traces, selectedTraceId],
  );
  const selectedSpan = selectedTrace?.spans.find(span => span.spanId === selectedSpanId)
    ?? selectedTrace?.spans[0];

  useEffect(() => {
    if (selectedTrace && selectedTrace.traceId !== selectedTraceId) {
      setSelectedTraceId(selectedTrace.traceId);
      setSelectedSpanId(selectedTrace.spans[0]?.spanId ?? '');
    }
  }, [selectedTrace, selectedTraceId]);

  function selectTrace(trace: TraceDetail) {
    setSelectedTraceId(trace.traceId);
    setSelectedSpanId(trace.spans[0]?.spanId ?? '');
  }

  return (
    <>
      <section className="panel learning-panel" aria-labelledby="tracing-heading">
        <SectionHeading
          eyebrow="Distributed tracing · Tempo"
          title="Trace analytics and span explorer"
          headingId="tracing-heading"
          description={data?.available
            ? `${data.indexedTraceCount} seeded traces indexed in the last ${data.windowMinutes} minutes`
            : data?.message ?? 'Connecting to Tempo...'}
          actions={(
            <>
            <StatusBadge active={Boolean(data?.available)} activeLabel="Tempo connected" inactiveLabel="Tempo warming up" />
            <button type="button" onClick={() => void seedTraces()} disabled={seeding}>
              {seeding ? 'Seeding...' : 'Seed 12 context traces'}
            </button>
            </>
          )}
        />

        {(overview.error || error) && (
          <p className="error panel-notice" role="alert">{error || 'Trace analytics could not be loaded. The page will keep retrying.'}</p>
        )}
        {seedResult && <p className="notice panel-notice" role="status">Exported {seedResult.exported} traces. Tempo will index them shortly.</p>}

        <div className="trace-summary" aria-label="Distributed trace analytics summary">
          <Summary label="Traces" value={data?.analytics.traceCount ?? '--'} detail="Tempo search results" />
          <Summary label="Loaded spans" value={data?.analytics.spanCount ?? '--'} detail="expanded trace bodies" />
          <Summary label="Error traces" value={data?.analytics.errorTraceCount ?? '--'} detail={`${data?.analytics.errorSpanCount ?? 0} error spans`} />
          <Summary label="Average" value={data ? duration(data.analytics.averageDurationMilliseconds) : '--'} detail="trace duration" />
          <Summary label="p95" value={data ? duration(data.analytics.p95DurationMilliseconds) : '--'} detail="trace duration" />
          <Summary label="Window" value={`${data?.windowMinutes ?? 60} min`} detail="TraceQL search range" />
        </div>

        <div className="trace-analytics-grid">
          <DurationChart data={data?.analytics.durationBuckets ?? []} />
          <div>
            <h3>Operations</h3>
            <div className="table-wrap compact-table">
              <table>
                <thead><tr><th>Span</th><th>Calls</th><th>Errors</th><th>Avg</th><th>p95</th></tr></thead>
                <tbody>
                  {data?.analytics.operations.map(operation => (
                    <tr key={operation.name}>
                      <td><code>{operation.name}</code></td>
                      <td>{operation.count}</td>
                      <td>{operation.errorCount}</td>
                      <td>{duration(operation.averageDurationMilliseconds)}</td>
                      <td>{duration(operation.p95DurationMilliseconds)}</td>
                    </tr>
                  ))}
                  {!data?.analytics.operations.length && <tr><td colSpan={5} className="empty">Seed traces to populate operation analytics.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <ContextPropagationLab analytics={data?.propagationAnalytics} trace={selectedTrace} />

      <section className="panel learning-panel" aria-labelledby="trace-waterfall-heading">
        <SectionHeading
          eyebrow="Trace · root span · parent / child span"
          title="Waterfall and span anatomy"
          headingId="trace-waterfall-heading"
          description="Select a trace and a span to inspect its identity and telemetry."
        />

        <div className="trace-browser">
          <div className="trace-list" aria-label="Recent traces">
            {data?.traces.map(trace => (
              <button
                type="button"
                className={`trace-list-item${trace.traceId === selectedTrace?.traceId ? ' selected' : ''}`}
                key={trace.traceId}
                onClick={() => selectTrace(trace)}
              >
                <span><strong>{trace.rootSpanName}</strong><small>{new Date(trace.startedAt).toLocaleTimeString()}</small></span>
                <span><Status status={trace.status} /><small>{duration(trace.durationMilliseconds)}</small></span>
                <code>{trace.traceId}</code>
              </button>
            ))}
            {!data?.traces.length && <p className="muted trace-empty">Tempo trace bodies appear a few seconds after startup seeding.</p>}
          </div>

          <div className="waterfall-panel">
            {selectedTrace ? (
              <>
                <div className="trace-identity">
                  <span>Trace ID</span><code>{selectedTrace.traceId}</code>
                  <span>Root span</span><strong>{selectedTrace.rootSpanName}</strong>
                  <span>Duration</span><strong>{duration(selectedTrace.durationMilliseconds)}</strong>
                </div>
                <div className="waterfall-scale"><span>0 ms</span><span>{duration(selectedTrace.durationMilliseconds)}</span></div>
                <div className="waterfall" aria-label={`Span waterfall for trace ${selectedTrace.traceId}`}>
                  {selectedTrace.spans.map(span => (
                    <SpanRow
                      key={span.spanId}
                      span={span}
                      trace={selectedTrace}
                      selected={span.spanId === selectedSpan?.spanId}
                      onSelect={() => setSelectedSpanId(span.spanId)}
                    />
                  ))}
                </div>
              </>
            ) : <p className="empty">No indexed teaching traces yet.</p>}
          </div>
        </div>

        <SpanInspector trace={selectedTrace} span={selectedSpan} />
      </section>

      <section className="panel learning-panel">
        <SectionHeading
          eyebrow="Distributed tracing fundamentals"
          title="Every requested concept, tied to live data"
        />
        <div className="tracing-concepts">
          <Concept title="Trace" value={selectedTrace ? `${selectedTrace.spans.length} related spans form one request journey.` : 'An end-to-end request journey across operations.'} />
          <Concept title="Trace ID" value={selectedTrace?.traceId ?? 'A shared 128-bit identifier correlates every span.'} code />
          <Concept title="Span" value={selectedSpan?.name ?? 'One timed operation within a trace.'} />
          <Concept title="Span ID" value={selectedSpan?.spanId ?? 'A unique 64-bit identifier inside the trace.'} code />
          <Concept title="Root span" value={selectedTrace?.rootSpanName ?? 'The top-level span with no parent.'} />
          <Concept title="Parent / Child span" value={relationship(selectedTrace, selectedSpan)} />
          <Concept title="Span duration" value={selectedSpan ? duration(selectedSpan.durationMilliseconds) : 'End time minus start time.'} />
          <Concept title="Span attributes" value={selectedSpan ? `${Object.keys(selectedSpan.attributes).length} queryable key/value pairs` : 'Queryable operation metadata.'} />
          <Concept title="Span events" value={selectedSpan ? `${selectedSpan.events.length} timestamped event(s)` : 'Timestamped annotations such as exceptions.'} />
          <Concept title="Span status" value={selectedSpan?.status ?? 'Unset, Ok, or Error outcome.'} />
        </div>
      </section>

      <section className="panel learning-panel">
        <SectionHeading
          eyebrow="TraceQL"
          title="Query cookbook"
          description="Run these expressions in Grafana Explore against the provisioned Tempo data source."
        />
        <QueryGrid queries={data?.queries ?? []} />
      </section>
    </>
  );
}

function ContextPropagationLab({ analytics, trace }: { analytics?: TracePropagationAnalytics; trace?: TraceDetail }) {
  const hops = trace?.propagation?.hops ?? [];
  const example = hops[0];
  const traceParent = parseTraceParent(example?.traceParent ?? trace?.propagation?.traceParent ?? '');

  return (
    <section className="panel learning-panel" aria-labelledby="propagation-heading">
      <SectionHeading
        eyebrow="Distributed context · W3C Trace Context"
        title="Context propagation across HTTP and gRPC"
        headingId="propagation-heading"
        description="Inspect the exact carrier values that preserve causality and selected baggage across process boundaries."
      />

      <div className="propagation-summary" aria-label="Context propagation analytics">
        <Summary label="Distributed traces" value={analytics?.propagatedTraceCount ?? '--'} detail="with remote context" />
        <Summary label="Propagation hops" value={analytics?.totalHops ?? '--'} detail={`${analytics?.successfulHops ?? 0} valid continuities`} />
        <Summary label="Continuity" value={analytics ? `${analytics.contextContinuityPercent.toFixed(0)}%` : '--'} detail="trace + parent IDs match" />
        <Summary label="traceparent" value={analytics?.traceParentHeaderCount ?? '--'} detail="headers / metadata" />
        <Summary label="tracestate" value={analytics?.traceStateHeaderCount ?? '--'} detail="vendor state carriers" />
        <Summary label="Baggage items" value={analytics?.baggageItemCount ?? '--'} detail="received key/value pairs" />
      </div>

      <div className="propagation-content">
        <div>
          <h3>Context propagation</h3>
          <div className="context-flow" aria-label="Inject and extract distributed context flow">
            <FlowNode title="Caller activity" detail="Current trace + client span" />
            <span aria-hidden="true">→</span>
            <FlowNode title="Inject" detail="Write W3C fields to carrier" />
            <span aria-hidden="true">→</span>
            <FlowNode title="HTTP / gRPC" detail="Cross the process boundary" />
            <span aria-hidden="true">→</span>
            <FlowNode title="Extract" detail="Parse a remote parent" />
            <span aria-hidden="true">→</span>
            <FlowNode title="Server activity" detail="Same trace, child span" />
          </div>

          <div className="transport-grid">
            {hops.map(hop => <TransportCard key={hop.receiverSpanId} hop={hop} />)}
            {!hops.length && <p className="muted">Select an indexed seeded trace to inspect its HTTP and gRPC carriers.</p>}
          </div>
        </div>

        <div>
          <h3>Transport analytics</h3>
          <div className="table-wrap compact-table">
            <table>
              <thead><tr><th>Carrier</th><th>Hops</th><th>Valid</th><th>Receiver avg</th></tr></thead>
              <tbody>
                {analytics?.transports.map(transport => (
                  <tr key={transport.transport}>
                    <td><strong>{transportLabel(transport.transport)}</strong></td>
                    <td>{transport.hopCount}</td>
                    <td>{transport.successfulHopCount}</td>
                    <td>{duration(transport.averageReceiverDurationMilliseconds)}</td>
                  </tr>
                ))}
                {!analytics?.transports.length && <tr><td colSpan={4} className="empty">Waiting for propagation spans.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w3c-lab">
        <article className="carrier-card traceparent-card">
          <h3>traceparent</h3>
          <p>The required W3C field carries version, trace identity, immediate parent identity, and sampling flags.</p>
          <code className="carrier-value">{example?.traceParent || '00-<trace-id>-<parent-span-id>-01'}</code>
          <div className="traceparent-parts">
            <CarrierPart label="Version" value={traceParent.version} />
            <CarrierPart label="Trace ID" value={traceParent.traceId} />
            <CarrierPart label="Parent span ID" value={traceParent.parentId} />
            <CarrierPart label="Flags" value={traceParent.flags} />
          </div>
        </article>

        <article className="carrier-card">
          <h3>tracestate</h3>
          <p>The optional W3C field forwards ordered vendor-specific state without changing the trace identity.</p>
          <code className="carrier-value">{example?.traceState || 'demo=seed-N,sample=full'}</code>
          <small>Forward unchanged unless a participating vendor updates its own list member.</small>
        </article>

        <article className="carrier-card baggage-card">
          <h3>Fundamental Baggage</h3>
          <p>Application context travels beside trace context. Baggage is not automatically a span attribute, so this demo copies only selected safe keys for analysis.</p>
          <div className="baggage-chips">
            {(analytics?.baggageKeys ?? []).map(item => (
              <code key={item.key}>{item.key}={item.sampleValue} <small>×{item.occurrences}</small></code>
            ))}
            {!analytics?.baggageKeys.length && <span className="muted">Waiting for baggage analytics.</span>}
          </div>
        </article>
      </div>

      <div className="propagation-concepts">
        <Concept title="Distributed context" value="Trace identity, vendor state, and application baggage that accompany work between services." />
        <Concept title="Context propagation" value="Inject context into a carrier before send; extract it as a remote parent before receive." />
        <Concept title="W3C Trace Context" value="The interoperable traceparent and tracestate formats used by the seeded carriers." />
        <Concept title="HTTP propagation" value="Lowercase W3C fields travel as HTTP request headers to the inventory API." />
        <Concept title="gRPC propagation" value="The same lowercase fields travel as gRPC metadata to the payment API." />
        <Concept title="Fundamental Baggage" value="Small, bounded application key/value pairs propagate separately from span attributes." />
      </div>
    </section>
  );
}

function FlowNode({ title, detail }: { title: string; detail: string }) {
  return <div><strong>{title}</strong><small>{detail}</small></div>;
}

function TransportCard({ hop }: { hop: TracePropagationHop }) {
  return (
    <article className="transport-card">
      <div>
        <strong>{transportLabel(hop.transport)} propagation</strong>
        <Status status={hop.contextValid ? 'Ok' : 'Error'} />
      </div>
      <span>{hop.senderName} → {hop.receiverService} / {hop.receiverName}</span>
      <code>{hop.transport === 'grpc' ? 'metadata' : 'headers'}: traceparent · tracestate · baggage</code>
      <small>Parent {shortId(hop.senderSpanId)} → child {shortId(hop.receiverSpanId)}</small>
    </article>
  );
}

function CarrierPart({ label, value }: { label: string; value: string }) {
  return <span><small>{label}</small><code>{value || '—'}</code></span>;
}

function Summary({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function DurationChart({ data }: { data: { label: string; count: number }[] }) {
  const maximum = Math.max(1, ...data.map(item => item.count));
  return (
    <div>
      <h3>Cumulative span duration</h3>
      {data.map(bucket => (
        <div className="trace-bucket" key={bucket.label}>
          <code>{bucket.label}</code>
          <div className="bar-track"><span style={{ width: `${(bucket.count / maximum) * 100}%` }} /></div>
          <strong>{bucket.count}</strong>
        </div>
      ))}
      {!data.length && <p className="muted">Waiting for expanded spans.</p>}
    </div>
  );
}

function SpanRow({ span, trace, selected, onSelect }: { span: TraceSpan; trace: TraceDetail; selected: boolean; onSelect: () => void }) {
  const start = new Date(span.startedAt).getTime() - new Date(trace.startedAt).getTime();
  const total = Math.max(1, trace.durationMilliseconds);
  const left = Math.max(0, Math.min(99, (start / total) * 100));
  const width = Math.max(1.5, Math.min(100 - left, (span.durationMilliseconds / total) * 100));
  const depth = spanDepth(span, trace.spans);

  return (
    <button type="button" className={`span-row${selected ? ' selected' : ''}`} onClick={onSelect}>
      <span className="span-name" style={{ paddingLeft: `${depth * 14}px` }}>
        <i className={`span-status-dot ${span.status.toLowerCase()}`} />
        <span><strong>{span.name}</strong><small>{span.kind} · {duration(span.durationMilliseconds)}</small></span>
      </span>
      <span className="span-track">
        <i className={span.status.toLowerCase()} style={{ left: `${left}%`, width: `${width}%` }} />
      </span>
    </button>
  );
}

function SpanInspector({ trace, span }: { trace?: TraceDetail; span?: TraceSpan }) {
  if (!trace || !span) return null;
  const children = trace.spans.filter(candidate => candidate.parentSpanId === span.spanId);
  const parent = trace.spans.find(candidate => candidate.spanId === span.parentSpanId);

  return (
    <div className="span-inspector">
      <div>
        <h3>Span identity and status</h3>
        <dl className="identity-grid trace-inspector-identity">
          <dt>Trace ID</dt><dd>{trace.traceId}</dd>
          <dt>Span ID</dt><dd>{span.spanId}</dd>
          <dt>Parent</dt><dd>{parent ? `${parent.name} (${parent.spanId})` : 'None — root span'}</dd>
          <dt>Children</dt><dd>{children.length ? children.map(child => child.name).join(', ') : 'None'}</dd>
          <dt>Duration</dt><dd>{duration(span.durationMilliseconds)}</dd>
          <dt>Status</dt><dd><Status status={span.status} /></dd>
          <dt>Service</dt><dd>{span.serviceName}</dd>
          <dt>Kind</dt><dd>{span.kind}</dd>
        </dl>
      </div>
      <div>
        <h3>Span attributes</h3>
        <dl className="attribute-list">
          {Object.entries(span.attributes).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
        </dl>
        {!Object.keys(span.attributes).length && <p className="muted">This span has no custom attributes.</p>}
      </div>
      <div>
        <h3>Span events</h3>
        <div className="event-list">
          {span.events.map((event, index) => (
            <article key={`${event.name}-${index}`}>
              <strong>{event.name}</strong>
              <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
              {Object.entries(event.attributes).map(([key, value]) => <code key={key}>{key}={value}</code>)}
            </article>
          ))}
        </div>
        {!span.events.length && <p className="muted">This span has no timestamped events.</p>}
      </div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  return <span className={`trace-status ${status.toLowerCase()}`}>{status}</span>;
}

function Concept({ title, value, code = false }: { title: string; value: string; code?: boolean }) {
  return <article><strong>{title}</strong>{code ? <code>{value}</code> : <span>{value}</span>}</article>;
}

function spanDepth(span: TraceSpan, spans: TraceSpan[]): number {
  let depth = 0;
  let parentId = span.parentSpanId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId) && depth < 8) {
    visited.add(parentId);
    const parent = spans.find(candidate => candidate.spanId === parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentSpanId;
  }
  return depth;
}

function relationship(trace?: TraceDetail, span?: TraceSpan): string {
  if (!trace || !span) return 'Spans form a causal tree through parent span IDs.';
  const parent = trace.spans.find(candidate => candidate.spanId === span.parentSpanId);
  const childCount = trace.spans.filter(candidate => candidate.parentSpanId === span.spanId).length;
  return `${parent ? `Parent: ${parent.name}` : 'Root (no parent)'} · ${childCount} direct child${childCount === 1 ? '' : 'ren'}`;
}

function parseTraceParent(value: string) {
  const [version = '', traceId = '', parentId = '', flags = ''] = value.split('-');
  return { version, traceId, parentId, flags };
}

function transportLabel(transport: string): string {
  return transport.toLowerCase() === 'grpc' ? 'gRPC metadata' : 'HTTP headers';
}

function shortId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function duration(milliseconds: number): string {
  if (milliseconds >= 1_000) return `${(milliseconds / 1_000).toFixed(2)} s`;
  return `${milliseconds.toFixed(milliseconds < 10 ? 1 : 0)} ms`;
}
