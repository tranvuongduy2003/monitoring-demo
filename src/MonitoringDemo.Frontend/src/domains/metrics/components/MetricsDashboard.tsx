import type { useMetricsDashboard } from '@/domains/metrics/hooks/useMetricsDashboard';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { QueryGrid } from '@/shared/components/QueryGrid';
import { dateTime } from '@/shared/lib/formatters';
import { Button } from '@/components/ui/button';

type MetricsDashboardModel = ReturnType<typeof useMetricsDashboard>;

export function MetricsDashboard({ model }: { model: MetricsDashboardModel }) {
  const { analytics, seeding, message, seedMetrics } = model;
  const data = analytics.data;
  const visibleTimeSeries = data?.timeSeries.slice(-24) ?? [];
  const maxTimeSeriesCount = Math.max(1, ...visibleTimeSeries.map((point) => point.count));
  const maxBucketCount = Math.max(1, ...(data?.histogram.buckets.map((bucket) => bucket.count) ?? []));

  return (
    <section className="panel learning-panel metrics-lab">
      <SectionHeading
        eyebrow="Metrics lab"
        title="Live instruments and distribution analytics"
        description={data ? `${data.summary.count} observations in the last ${data.windowMinutes} minutes` : 'Loading the seeded metrics window...'}
        actions={<Button type="button" onClick={() => void seedMetrics()} disabled={seeding}>{seeding ? 'Seeding...' : 'Seed 120 observations'}</Button>}
      />

      {message && <p className="notice panel-notice" role="status">{message}</p>}
      {analytics.error && <p className="error panel-notice" role="alert">Metric data could not be loaded. The page will keep retrying.</p>}

      <div className="metric-summary" aria-label="Metric analytics summary">
        <article><span>Counter</span><strong>{data?.counter.value ?? '--'}</strong><small>orders_created_total</small></article>
        <article><span>Gauge</span><strong>{data?.gauge.value ?? '--'}</strong><small>active_orders now</small></article>
        <article><span>Count</span><strong>{data?.summary.count ?? '--'}</strong><small>window observations</small></article>
        <article><span>Sum</span><strong>{data ? `${Math.round(data.summary.sum)} ms` : '--'}</strong><small>all durations</small></article>
        <article><span>p50</span><strong>{data ? `${data.summary.p50} ms` : '--'}</strong><small>typical request</small></article>
        <article><span>p95 / p99</span><strong>{data ? `${data.summary.p95} / ${data.summary.p99}` : '--'}</strong><small>tail latency, ms</small></article>
      </div>

      <div className="metrics-visuals">
        <div className="metric-chart">
          <h3>Time series · observations per minute</h3>
          <div className="time-bars" aria-label="Metric observations over time">
            {visibleTimeSeries.map((point) => (
              <div className="time-column" key={point.timestamp} title={`${dateTime.format(new Date(point.timestamp))}: ${point.count} observations, ${point.averageDurationMilliseconds} ms average`}>
                <span style={{ height: `${Math.max(5, (point.count / maxTimeSeriesCount) * 100)}%` }} />
              </div>
            ))}
          </div>
          <p className="muted">Each point is a timestamp plus a value; labels create separate series.</p>
        </div>

        <div className="metric-chart">
          <h3>Histogram · cumulative buckets</h3>
          {data?.histogram.buckets.map((bucket) => (
            <div className="bucket-row" key={bucket.lessThanOrEqual ?? 'infinity'}>
              <code>{bucket.lessThanOrEqual === null ? '+Inf' : `≤ ${bucket.lessThanOrEqual} ms`}</code>
              <div className="bar-track"><span style={{ width: `${(bucket.count / maxBucketCount) * 100}%` }} /></div>
              <strong>{bucket.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="metrics-visuals metrics-details">
        <div>
          <h3>Labels and cardinality</h3>
          <p className="muted">{data?.cardinality.observedSeries ?? '--'} observed series out of a bounded maximum of {data?.cardinality.maximumExpectedSeries ?? 30}. IDs and user input are intentionally excluded.</p>
          <div className="label-list">
            {data?.labels.map((label) => <span key={label.name}><code>{label.name}</code> · {label.boundedValues}</span>)}
          </div>
        </div>
        <div>
          <h3>Histogram vs. summary</h3>
          <p className="muted">The histogram exports buckets, count, and sum. Prometheus derives p50/p95/p99 from buckets and can combine instances. The API also calculates a summary-style rolling snapshot for immediate teaching feedback.</p>
        </div>
      </div>

      <QueryGrid queries={data?.queries ?? []} className="metric-queries" />
    </section>
  );
}
