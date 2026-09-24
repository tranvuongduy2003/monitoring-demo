import { useState } from 'react';
import { useApiData } from './hooks/useApiData';
import type { Order, OrderStats } from './types';

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
  const [creating, setCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

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

      <nav className="links" aria-label="Monitoring tools">
        <span>Monitoring tools</span>
        <a href="http://localhost:3000" target="_blank" rel="noreferrer">Grafana</a>
        <a href="http://localhost:9090" target="_blank" rel="noreferrer">Prometheus</a>
        <a href="http://localhost:5000/metrics" target="_blank" rel="noreferrer">Raw metrics</a>
      </nav>
    </main>
  );
}

export default App;
