import { useEffect, useMemo, useState } from 'react';
import type { useTracingDashboard } from '@/domains/tracing/hooks/useTracingDashboard';
import type { TraceDetail, TraceSpan } from '@/domains/tracing/types';
import { QueryGrid } from '@/shared/components/QueryGrid';
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
        <div className="section-heading">
          <div>
            <p className="eyebrow">Distributed tracing · Tempo</p>
            <h2 id="tracing-heading">Trace analytics and span explorer</h2>
            <p>
              {data?.available
                ? `${data.indexedTraceCount} seeded traces indexed in the last ${data.windowMinutes} minutes`
                : data?.message ?? 'Connecting to Tempo...'}
            </p>
          </div>
          <div className="tracing-heading-actions">
            <StatusBadge active={Boolean(data?.available)} activeLabel="Tempo connected" inactiveLabel="Tempo warming up" />
            <button type="button" onClick={() => void seedTraces()} disabled={seeding}>
              {seeding ? 'Seeding...' : 'Seed 12 traces'}
            </button>
          </div>
        </div>

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

      <section className="panel learning-panel" aria-labelledby="trace-waterfall-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Trace · root span · parent / child span</p>
            <h2 id="trace-waterfall-heading">Waterfall and span anatomy</h2>
            <p>Select a trace and a span to inspect its identity and telemetry.</p>
          </div>
        </div>

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
        <div className="section-heading">
          <div>
            <p className="eyebrow">Distributed tracing fundamentals</p>
            <h2>Every requested concept, tied to live data</h2>
          </div>
        </div>
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
        <div className="section-heading">
          <div>
            <p className="eyebrow">TraceQL</p>
            <h2>Query cookbook</h2>
            <p>Run these expressions in Grafana Explore against the provisioned Tempo data source.</p>
          </div>
        </div>
        <QueryGrid queries={data?.queries ?? []} />
      </section>
    </>
  );
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

function duration(milliseconds: number): string {
  if (milliseconds >= 1_000) return `${(milliseconds / 1_000).toFixed(2)} s`;
  return `${milliseconds.toFixed(milliseconds < 10 ? 1 : 0)} ms`;
}
