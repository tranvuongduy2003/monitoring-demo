import { useState } from 'react';
import { useApiData } from './hooks/useApiData';
import type { LogAnalytics, LogDemoResult, MetricsAnalytics, Order, OrderStats } from './types';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function App() {
  const stats = useApiData<OrderStats>('/api/orders/stats', 5_000);
  const orders = useApiData<Order[]>('/api/orders?limit=8', 5_000);
  const logs = useApiData<LogAnalytics>('/api/logging/analytics?minutes=60', 10_000);
  const metrics = useApiData<MetricsAnalytics>('/api/metrics/analytics?minutes=60', 5_000);
  const [creating, setCreating] = useState(false);
  const [seedingMetrics, setSeedingMetrics] = useState(false);
  const [generatingLog, setGeneratingLog] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [logDemo, setLogDemo] = useState<LogDemoResult | null>(null);

  const connected = Boolean(stats.data && orders.data && metrics.data && !stats.error && !orders.error && !metrics.error);

  async function createTestOrder() {
    setCreating(true);
    setActionMessage('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 1, quantity: 1 }),
      });

      if (!response.ok) throw new Error(`Request failed (${response.status})`);

      setActionMessage('Order created');
      stats.refetch();
      orders.refetch();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Could not create order');
    } finally {
      setCreating(false);
    }
  }

  async function generateLog(includeException: boolean) {
    setGeneratingLog(true);
    setLogDemo(null);

    try {
      const level = includeException ? 'Error' : 'Information';
      const response = await fetch(`/api/logging/demo?level=${level}&includeException=${includeException}`, {
        method: 'POST',
        headers: { 'X-Correlation-ID': `frontend-lab-${Date.now()}` },
      });

      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setLogDemo(await response.json());
      window.setTimeout(logs.refetch, 2_000);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Could not generate log');
    } finally {
      setGeneratingLog(false);
    }
  }

  async function seedMetrics() {
    setSeedingMetrics(true);
    setActionMessage('');

    try {
      const response = await fetch('/api/metrics/seed?count=120', { method: 'POST' });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setActionMessage('Added 120 bounded metric observations');
      metrics.refetch();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Could not seed metrics');
    } finally {
      setSeedingMetrics(false);
    }
  }

  const levelEntries = Object.entries(logs.data?.byLevel ?? {})
    .sort(([, first], [, second]) => second - first);
  const maxLevelCount = Math.max(1, ...levelEntries.map(([, count]) => count));
  const maxBucketCount = Math.max(1, ...(metrics.data?.histogram.buckets.map((bucket) => bucket.count) ?? []));
  const visibleTimeSeries = metrics.data?.timeSeries.slice(-24) ?? [];
  const maxTimeSeriesCount = Math.max(1, ...visibleTimeSeries.map((point) => point.count));

  const cards = [
    ['Total orders', stats.data?.totalOrders ?? '--'],
    ['Last hour', stats.data?.ordersLastHour ?? '--'],
    ['Revenue', stats.data ? money.format(stats.data.totalRevenue) : '--'],
    ['Failed', stats.data?.failedOrders ?? '--'],
  ];

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Monitoring demo</p>
          <h1>Order service</h1>
          <p className="subtitle">A small live view of the API. Detailed telemetry stays in the monitoring tools.</p>
        </div>

        <div className="actions">
          <span className={`status ${connected ? 'online' : ''}`}>
            <span className="status-dot" aria-hidden="true" />
            {connected ? 'API connected' : stats.loading || orders.loading ? 'Connecting' : 'API unavailable'}
          </span>
          <button type="button" onClick={createTestOrder} disabled={creating}>
            {creating ? 'Creating...' : 'Create test order'}
          </button>
        </div>
      </header>

      {actionMessage && <p className="notice" role="status">{actionMessage}</p>}
      {(stats.error || orders.error || metrics.error) && (
        <p className="error" role="alert">Live data could not be loaded. The page will keep retrying.</p>
      )}

      <section className="stats" aria-label="Order statistics">
        {cards.map(([label, value]) => (
          <article className="card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Refreshes every 5 seconds</p>
          </div>
          <button className="secondary" type="button" onClick={() => { stats.refetch(); orders.refetch(); }}>
            Refresh
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.data?.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.product?.name ?? `Product ${order.productId}`}</td>
                  <td><span className={`pill ${order.status.toLowerCase()}`}>{order.status}</span></td>
                  <td>{order.quantity}</td>
                  <td>{money.format(order.total)}</td>
                  <td>{dateTime.format(new Date(order.createdAt))}</td>
                </tr>
              ))}
              {!orders.loading && !orders.data?.length && (
                <tr><td className="empty" colSpan={6}>No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel learning-panel metrics-lab">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Metrics lab</p>
            <h2>Live instruments and distribution analytics</h2>
            <p>{metrics.data ? `${metrics.data.summary.count} observations in the last ${metrics.data.windowMinutes} minutes` : 'Loading the seeded metrics window...'}</p>
          </div>
          <button type="button" onClick={seedMetrics} disabled={seedingMetrics}>
            {seedingMetrics ? 'Seeding...' : 'Seed 120 observations'}
          </button>
        </div>

        <div className="metric-summary" aria-label="Metric analytics summary">
          <article><span>Counter</span><strong>{metrics.data?.counter.value ?? '--'}</strong><small>orders_created_total</small></article>
          <article><span>Gauge</span><strong>{metrics.data?.gauge.value ?? '--'}</strong><small>active_orders now</small></article>
          <article><span>Count</span><strong>{metrics.data?.summary.count ?? '--'}</strong><small>window observations</small></article>
          <article><span>Sum</span><strong>{metrics.data ? `${Math.round(metrics.data.summary.sum)} ms` : '--'}</strong><small>all durations</small></article>
          <article><span>p50</span><strong>{metrics.data ? `${metrics.data.summary.p50} ms` : '--'}</strong><small>typical request</small></article>
          <article><span>p95 / p99</span><strong>{metrics.data ? `${metrics.data.summary.p95} / ${metrics.data.summary.p99}` : '--'}</strong><small>tail latency, ms</small></article>
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
            {metrics.data?.histogram.buckets.map((bucket) => (
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
            <p className="muted">{metrics.data?.cardinality.observedSeries ?? '--'} observed series out of a bounded maximum of {metrics.data?.cardinality.maximumExpectedSeries ?? 30}. IDs and user input are intentionally excluded.</p>
            <div className="label-list">
              {metrics.data?.labels.map((label) => (
                <span key={label.name}><code>{label.name}</code> · {label.boundedValues}</span>
              ))}
            </div>
          </div>
          <div>
            <h3>Histogram vs. summary</h3>
            <p className="muted">The histogram exports buckets, count, and sum. Prometheus derives p50/p95/p99 from buckets and can combine instances. The API also calculates a summary-style rolling snapshot for immediate teaching feedback.</p>
          </div>
        </div>

        <div className="query-grid metric-queries">
          {metrics.data?.queries.map((item) => (
            <article className="query-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.purpose}</p>
              <code>{item.query}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="panel learning-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live Loki analytics</p>
            <h2>Logs in the last {logs.data?.windowMinutes ?? 60} minutes</h2>
            <p>{logs.data?.available ? `${logs.data.totalLogs} events indexed` : logs.data?.message ?? 'Connecting to Loki...'}</p>
          </div>
          <span className={`status ${logs.data?.available ? 'online' : ''}`}>
            <span className="status-dot" aria-hidden="true" />
            {logs.data?.available ? 'Loki connected' : 'Loki warming up'}
          </span>
        </div>

        <div className="log-lab">
          <div className="level-chart" aria-label="Log count by level">
            <h3>Volume by level</h3>
            {levelEntries.map(([level, count]) => (
              <div className="level-row" key={level}>
                <span>{level || 'unknown'}</span>
                <div className="bar-track"><span style={{ width: `${(count / maxLevelCount) * 100}%` }} /></div>
                <strong>{count}</strong>
              </div>
            ))}
            {!levelEntries.length && <p className="muted">Seed logs appear a few seconds after startup.</p>}
          </div>

          <div className="generator">
            <h3>Correlation lab</h3>
            <p>Generate an event, then query Loki using the returned correlation or trace ID.</p>
            <div className="button-row">
              <button type="button" onClick={() => generateLog(false)} disabled={generatingLog}>Generate info</button>
              <button className="danger" type="button" onClick={() => generateLog(true)} disabled={generatingLog}>Generate exception</button>
            </div>
            {logDemo && (
              <dl className="identity-grid">
                <dt>Correlation</dt><dd>{logDemo.correlationId}</dd>
                <dt>Request</dt><dd>{logDemo.requestId}</dd>
                <dt>Trace</dt><dd>{logDemo.traceId}</dd>
                <dt>Span</dt><dd>{logDemo.spanId}</dd>
              </dl>
            )}
          </div>
        </div>
      </section>

      <section className="panel learning-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Basic LogQL</p>
            <h2>Query cookbook</h2>
            <p>Copy these into Grafana Explore and change the sample values.</p>
          </div>
        </div>
        <div className="query-grid">
          {logs.data?.queries.map((item) => (
            <article className="query-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.purpose}</p>
              <code>{item.query}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="concepts" aria-labelledby="concept-heading">
        <div>
          <p className="eyebrow">Learning map</p>
          <h2 id="concept-heading">What this demo implements</h2>
        </div>
        <div className="concept-grid">
          <article><strong>Time series</strong><span>A metric name and one label set produce timestamped values</span></article>
          <article><strong>Counter</strong><span>Monotonic totals become throughput with PromQL rate()</span></article>
          <article><strong>Gauge</strong><span>Current state can move up and down, such as active work</span></article>
          <article><strong>Histogram</strong><span>Buckets retain an aggregatable latency distribution plus count and sum</span></article>
          <article><strong>Summary</strong><span>Direct client-side quantiles are convenient but generally cannot combine instances</span></article>
          <article><strong>Cardinality</strong><span>Bounded labels control the number and cost of time series</span></article>
        </div>
      </section>

      <nav className="links" aria-label="Monitoring tools">
        <span>Monitoring tools</span>
        <a href="http://localhost:3000" target="_blank" rel="noreferrer">Grafana</a>
        <a href="http://localhost:3000/explore" target="_blank" rel="noreferrer">Loki Explore</a>
        <a href="http://localhost:9090" target="_blank" rel="noreferrer">Prometheus</a>
        <a href="http://localhost:5000/metrics" target="_blank" rel="noreferrer">Raw metrics</a>
      </nav>
    </main>
  );
}

export default App;
