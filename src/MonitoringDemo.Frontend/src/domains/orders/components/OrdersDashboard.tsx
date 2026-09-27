import type { useDemoReset } from '@/domains/demo/hooks/useDemoReset';
import type { useOrdersDashboard } from '@/domains/orders/hooks/useOrdersDashboard';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { dateTime, money } from '@/shared/lib/formatters';

type OrdersDashboardModel = ReturnType<typeof useOrdersDashboard>;
type DemoResetModel = ReturnType<typeof useDemoReset>;

export function OrdersDashboard({ model, reset }: { model: OrdersDashboardModel; reset: DemoResetModel }) {
  const { stats, orders, message, refresh } = model;
  const cards = [
    ['Total orders', stats.data?.totalOrders ?? '--'],
    ['Last hour', stats.data?.ordersLastHour ?? '--'],
    ['Revenue', stats.data ? money.format(stats.data.totalRevenue) : '--'],
    ['Failed', stats.data?.failedOrders ?? '--'],
  ];

  return (
    <>
      {message && <p className="notice" role="status">{message}</p>}
      {reset.message && <p className="notice" role="status">{reset.message}</p>}
      {reset.error && <p className="error" role="alert">{reset.error}</p>}
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
        <SectionHeading
          title="Recent orders"
          description="Refreshes every 5 seconds"
          actions={<button className="secondary" type="button" onClick={refresh} disabled={reset.clearing}>Refresh</button>}
        />
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
