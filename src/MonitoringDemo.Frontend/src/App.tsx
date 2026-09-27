import { useState } from 'react';
import { useApiData } from './hooks/useApiData';
import type { LogAnalytics, LogDemoResult, Order, OrderStats } from './types';

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
  const [creating, setCreating] = useState(false);
  const [generatingLog, setGeneratingLog] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [logDemo, setLogDemo] = useState<LogDemoResult | null>(null);

  const connected = Boolean(stats.data && orders.data && !stats.error && !orders.error);

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

  const levelEntries = Object.entries(logs.data?.byLevel ?? {})
    .sort(([, first], [, second]) => second - first);
  const maxLevelCount = Math.max(1, ...levelEntries.map(([, count]) => count));

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
      {(stats.error || orders.error) && (
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
          <article><strong>Shape</strong><span>Structured vs. unstructured logs, attributes, and six log levels</span></article>
          <article><strong>Context</strong><span>Scopes carry tenant, order, correlation, request, trace, and span identifiers</span></article>
          <article><strong>Failures</strong><span>Exception objects preserve type, message, and stack trace</span></article>
          <article><strong>Correlation</strong><span>Middleware links every request log; activities link logs to distributed traces</span></article>
          <article><strong>Control</strong><span>Category-level filtering keeps framework noise out while retaining teaching events</span></article>
          <article><strong>Analytics</strong><span>Loki stores logs; LogQL filters streams and turns events into metrics</span></article>
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
