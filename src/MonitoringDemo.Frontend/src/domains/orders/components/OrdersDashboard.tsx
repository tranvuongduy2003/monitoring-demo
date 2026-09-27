import type { useOrdersDashboard } from '@/domains/orders/hooks/useOrdersDashboard';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { dateTime, money } from '@/shared/lib/formatters';

type OrdersDashboardModel = ReturnType<typeof useOrdersDashboard>;

export function OrdersDashboard({ model }: { model: OrdersDashboardModel }) {
  const { stats, orders, creating, message, createTestOrder, refresh } = model;
  const connected = Boolean(stats.data && orders.data && !stats.error && !orders.error);
  const connectionLabel = stats.loading || orders.loading ? 'Connecting' : 'API unavailable';
  const cards = [
    ['Total orders', stats.data?.totalOrders ?? '--'],
    ['Last hour', stats.data?.ordersLastHour ?? '--'],
    ['Revenue', stats.data ? money.format(stats.data.totalRevenue) : '--'],
    ['Failed', stats.data?.failedOrders ?? '--'],
  ];

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">Monitoring demo</p>
          <h1>Order service</h1>
          <p className="subtitle">A small live view of the API. Detailed telemetry stays in the monitoring tools.</p>
        </div>
        <div className="actions">
          <StatusBadge active={connected} activeLabel="API connected" inactiveLabel={connectionLabel} />
          <button type="button" onClick={() => void createTestOrder()} disabled={creating}>
            {creating ? 'Creating...' : 'Create test order'}
          </button>
        </div>
      </header>

      {message && <p className="notice" role="status">{message}</p>}
      {(stats.error || orders.error) && (
        <p className="error" role="alert">Order data could not be loaded. The page will keep retrying.</p>
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
          <button className="secondary" type="button" onClick={refresh}>Refresh</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Order</th><th>Product</th><th>Status</th><th>Qty</th><th>Total</th><th>Created</th></tr>
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
    </>
  );
}
