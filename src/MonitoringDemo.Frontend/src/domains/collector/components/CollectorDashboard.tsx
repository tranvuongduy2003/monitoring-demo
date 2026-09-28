import type { useCollectorDashboard } from '@/domains/collector/hooks/useCollectorDashboard';
import type { CollectorComponentDetail, CollectorRecentRun, CollectorTimelinePoint } from '@/domains/collector/types';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CollectorDashboardModel = ReturnType<typeof useCollectorDashboard>;

export function CollectorDashboard({ model }: { model: CollectorDashboardModel }) {
  const { overview, seeding, seedResult, error, seedCollector } = model;
  const data = overview.data;
  const analytics = data?.analytics;

  return (
    <section className="panel learning-panel collector-lab" aria-labelledby="collector-heading">
      <SectionHeading
        eyebrow="OpenTelemetry Collector"
        title="Receive, process, and export every signal"
        headingId="collector-heading"
        description={analytics
          ? `${analytics.receivedRecordCount.toLocaleString()} seeded records crossed ${analytics.ingressRequestCount} receiver requests`
          : 'Loading the Collector pipeline...'}
        actions={(
          <>
          <Badge variant={data?.configured ? 'success' : 'secondary'} className={`status ${data?.configured ? 'online' : ''}`}><span className="status-dot" aria-hidden="true" />{data?.configured ? 'Collector configured' : 'Collector fallback'}</Badge>
          <Button type="button" onClick={() => void seedCollector()} disabled={seeding}>{seeding ? 'Seeding...' : 'Seed 150 pipeline requests'}</Button>
          </>
        )}
      />

      {(overview.error || error) && <p className="error panel-notice" role="alert">{error || 'Collector analytics could not be loaded. The page will keep retrying.'}</p>}
      {seedResult && <p className="notice panel-notice" role="status">Run {seedResult.run} sent {seedResult.seeded} requests; {seedResult.analytics.exportedRecordCount.toLocaleString()} total records are now represented.</p>}

      <div className="collector-summary" aria-label="Collector analytics summary">
        <Summary label="Received" value={analytics?.receivedRecordCount.toLocaleString() ?? '--'} detail="receiver records" />
        <Summary label="Exported" value={analytics?.exportedRecordCount.toLocaleString() ?? '--'} detail="backend records" tone="success" />
        <Summary label="Batches" value={analytics?.batchCount ?? '--'} detail={`${analytics?.averageBatchSize.toFixed(0) ?? 0} average size`} />
        <Summary label="Refused" value={analytics?.refusedRecordCount.toLocaleString() ?? '--'} detail={`${analytics?.retriedRecordCount.toLocaleString() ?? 0} retried`} tone="warning" />
        <Summary label="Dropped" value={analytics?.droppedRecordCount.toLocaleString() ?? '--'} detail="after retry budget" tone="error" />
        <Summary label="p95 pipeline" value={analytics ? duration(analytics.p95DurationMilliseconds) : '--'} detail="receive to export" />
      </div>

      <section className="collector-section" aria-labelledby="collector-architecture-heading">
        <SectionTitle eyebrow="Collector architecture" title="A vendor-neutral telemetry control plane" id="collector-architecture-heading" />
        <p className="muted collector-note">Seed requests emit real application telemetry through the configured SDK exporter and maintain a deterministic pipeline model for repeatable visual testing.</p>
        <div className="collector-flow">
          {data?.architecture.map((component, index) => (
            <div className="collector-flow-step" key={component.stage}>
              <article><span>{component.stage}</span><strong>{component.name}</strong><small>{component.description}</small></article>
              {index < data.architecture.length - 1 && <i aria-hidden="true">→</i>}
            </div>
          ))}
        </div>
        <div className="collector-analytics-grid">
          <div>
            <h3>Records by minute</h3>
            <CollectorTimeline points={analytics?.timeline.slice(-24) ?? []} />
            <div className="collector-legend"><span className="received">Received</span><span className="exported">Exported</span><span className="refused">Refused</span></div>
          </div>
          <div>
            <h3>Signal throughput</h3>
            <div className="collector-signal-grid">
              {analytics?.signals.map(signal => (
                <article key={signal.signal}>
                  <strong>{signal.signal}</strong>
                  <span>{signal.exportedRecords.toLocaleString()} / {signal.receivedRecords.toLocaleString()}</span>
                  <small>exported · {signal.batchCount} batches · {signal.droppedRecords} dropped</small>
                </article>
              ))}
            </div>
          </div>
        </div>
        <RecentRuns runs={analytics?.recentRuns ?? []} />
      </section>

      <section className="collector-section" aria-labelledby="receivers-heading">
        <SectionTitle eyebrow="Receivers" title="Telemetry enters through protocol-specific listeners" id="receivers-heading" />
        <ComponentCards items={data?.receivers ?? []} tone="receiver" />
        <div className="collector-protocol-analytics">
          {analytics?.protocols.map(protocol => (
            <article key={protocol.protocol}>
              <span>{protocol.protocol}</span><strong>{protocol.receivedRecords.toLocaleString()}</strong><small>{protocol.requestCount} requests · {protocol.refusedRecords} refused · {duration(protocol.averageDurationMilliseconds)} average</small>
            </article>
          ))}
        </div>
      </section>

      <section className="collector-section" aria-labelledby="processors-heading">
        <SectionTitle eyebrow="Processors" title="Ordered transformations protect and shape telemetry" id="processors-heading" />
        <ComponentCards items={data?.processors ?? []} tone="processor" />
        <div className="collector-order"><span>1</span><strong>memory_limiter</strong><i>before</i><span>2</span><strong>batch</strong><small>Backpressure happens before records consume batch buffers.</small></div>
      </section>

      <section className="collector-section" aria-labelledby="exporters-heading">
        <SectionTitle eyebrow="Exporters" title="Each signal leaves through a backend-specific client" id="exporters-heading" />
        <ComponentCards items={data?.exporters ?? []} tone="exporter" />
      </section>

      <section className="collector-section" aria-labelledby="pipelines-heading">
        <SectionTitle eyebrow="Pipelines" title="Configuration composes reusable components per signal" id="pipelines-heading" />
        <div className="collector-pipelines">
          {data?.pipelines.map(pipeline => (
            <article key={pipeline.signal}>
              <strong>{pipeline.signal}</strong>
              <PipelineGroup label="Receiver" values={[pipeline.receiver]} />
              <i>→</i>
              <PipelineGroup label="Processors" values={pipeline.processors} />
              <i>→</i>
              <PipelineGroup label="Exporters" values={pipeline.exporters} />
            </article>
          ))}
        </div>
      </section>

      <section className="collector-section collector-otlp-receiver" aria-labelledby="otlp-receiver-heading">
        <SectionTitle eyebrow="OTLP Receiver" title="One receiver exposes gRPC and HTTP for all signals" id="otlp-receiver-heading" />
        <div className="collector-receiver-detail">
          <article><span>OTLP/gRPC</span><strong>:4317</strong><code>TraceService · MetricsService · LogsService</code><p>HTTP/2 unary Export calls share long-lived multiplexed channels.</p></article>
          <article><span>OTLP/HTTP</span><strong>:4318</strong><code>/v1/traces · /v1/metrics · /v1/logs</code><p>Signal-specific POST paths carry protobuf payloads through common HTTP infrastructure.</p></article>
          <article className="collector-endpoint-card"><span>Application target</span><code>{data?.collectorEndpoint ?? 'Loading...'}</code><p>The API uses this gRPC endpoint while the receiver also remains available over HTTP.</p></article>
        </div>
      </section>

      <section className="collector-section" aria-labelledby="batch-processor-heading">
        <SectionTitle eyebrow="Batch Processor" title="Flush by record count or elapsed time" id="batch-processor-heading" />
        <div className="collector-processor-detail">
          <div className="collector-setting-cards">
            <Metric label="Send batch size" value={data?.settings.sendBatchSize ?? '--'} />
            <Metric label="Timeout" value={data?.settings.batchTimeout ?? '--'} />
            <Metric label="Average batch" value={analytics?.averageBatchSize.toFixed(0) ?? '--'} />
            <Metric label="p95 batch" value={analytics?.p95BatchSize.toFixed(0) ?? '--'} />
          </div>
          <div className="collector-batch-triggers">
            {analytics?.batches.map(batch => (
              <article key={batch.trigger}><span>{batch.trigger} trigger</span><strong>{batch.batchCount} batches</strong><div><i style={{ width: `${Math.min(100, batch.averageBatchSize / (data?.settings.sendBatchSize ?? 512) * 100)}%` }} /></div><small>{batch.averageBatchSize.toFixed(0)} average records</small></article>
            ))}
          </div>
        </div>
      </section>

      <section className="collector-section collector-memory" aria-labelledby="memory-limiter-heading">
        <SectionTitle eyebrow="Memory Limiter" title="Apply retryable backpressure before the process runs out of memory" id="memory-limiter-heading" />
        <div className="collector-memory-layout">
          <div className="memory-gauge" aria-label={`Peak modeled memory ${analytics?.peakMemoryMib ?? 0} MiB`}>
            <div className="memory-scale"><i className="soft" style={{ left: `${(data?.settings.memorySoftLimitMib ?? 192) / (data?.settings.memoryHardLimitMib ?? 256) * 100}%` }} /><i className="hard" /><span style={{ width: `${Math.min(100, (analytics?.peakMemoryMib ?? 0) / (data?.settings.memoryHardLimitMib ?? 256) * 100)}%` }} /></div>
            <div className="memory-labels"><span>0 MiB</span><span>soft {data?.settings.memorySoftLimitMib ?? '--'}</span><span>hard {data?.settings.memoryHardLimitMib ?? '--'} MiB</span></div>
          </div>
          <div className="collector-memory-stats">
            <Metric label="Peak modeled memory" value={analytics ? `${analytics.peakMemoryMib.toFixed(0)} MiB` : '--'} />
            <Metric label="Pressure events" value={analytics?.memoryPressureEvents ?? '--'} />
            <Metric label="Retryable records" value={analytics?.retriedRecordCount.toLocaleString() ?? '--'} />
            <Metric label="Check interval" value={data?.settings.memoryCheckInterval ?? '--'} />
            <Metric label="GOMEMLIMIT" value={data?.settings.goMemoryLimit ?? '--'} />
            <Metric label="Dropped" value={analytics?.droppedRecordCount.toLocaleString() ?? '--'} />
          </div>
        </div>
        <p className="muted collector-memory-note">The soft limit is hard limit minus spike allowance. Above soft, the processor refuses data with a retryable error; above hard, it can additionally request garbage collection.</p>
      </section>
    </section>
  );
}

function ComponentCards({ items, tone }: { items: CollectorComponentDetail[]; tone: string }) {
  return <div className="collector-component-grid">{items.map(item => <article className={tone} key={item.id}><div><code>{item.id}</code><span>{item.state}</span></div><h3>{item.name}</h3><strong>{item.endpointOrSetting}</strong><p>{item.type} · {item.signals}</p></article>)}</div>;
}

function CollectorTimeline({ points }: { points: CollectorTimelinePoint[] }) {
  const maximum = Math.max(1, ...points.map(point => point.receivedRecords));
  return <div className="collector-timeline" aria-label="Collector record throughput over time">{points.map(point => <div key={point.timestamp} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.receivedRecords} received, ${point.exportedRecords} exported`}><i className="received" style={{ height: `${point.receivedRecords / maximum * 100}%` }} /><i className="exported" style={{ height: `${point.exportedRecords / maximum * 100}%` }} />{point.refusedRecords > 0 && <b />}</div>)}{!points.length && <p className="chart-empty">Waiting for seeded Collector requests.</p>}</div>;
}

function RecentRuns({ runs }: { runs: CollectorRecentRun[] }) {
  return <div className="table-wrap compact-table collector-runs"><Table><TableHeader><TableRow><TableHead>Signal</TableHead><TableHead>Receiver</TableHead><TableHead>Exporter</TableHead><TableHead>Input</TableHead><TableHead>Output</TableHead><TableHead>Batches</TableHead><TableHead>Trigger</TableHead><TableHead>Memory</TableHead></TableRow></TableHeader><TableBody>{runs.map((run, index) => <TableRow key={`${run.timestamp}-${index}`}><TableCell><strong>{run.signal}</strong></TableCell><TableCell><code>{run.protocol}</code></TableCell><TableCell>{run.exporter}</TableCell><TableCell>{run.receivedRecords}</TableCell><TableCell>{run.exportedRecords}</TableCell><TableCell>{run.batchCount}</TableCell><TableCell>{run.batchTrigger}</TableCell><TableCell><span className={`collector-memory-state ${run.memoryState.toLowerCase().replace(' ', '-')}`}>{run.memoryMib.toFixed(0)} MiB</span></TableCell></TableRow>)}{!runs.length && <TableRow><TableCell colSpan={8} className="empty">Seed requests to populate recent pipeline analytics.</TableCell></TableRow>}</TableBody></Table></div>;
}

function PipelineGroup({ label, values }: { label: string; values: string[] }) {
  return <div><span>{label}</span>{values.map(value => <code key={value}>{value}</code>)}</div>;
}

function Summary({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone?: 'success' | 'warning' | 'error' }) {
  const className = tone ? `collector-summary__item--${tone}` : undefined;
  return <Card asChild className={className}><article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article></Card>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <div className="otel-subheading"><p className="eyebrow">{eyebrow}</p><h3 id={id}>{title}</h3></div>;
}

function duration(milliseconds: number): string {
  return `${milliseconds.toFixed(milliseconds < 10 ? 1 : 0)} ms`;
}
