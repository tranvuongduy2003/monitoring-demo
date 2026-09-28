import type { useDemoReset } from '@/domains/demo/hooks/useDemoReset';
import type { useOrdersDashboard } from '@/domains/orders/hooks/useOrdersDashboard';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { dateTime, money } from '@/shared/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      {message && <Alert variant="success" className="notice" role="status"><AlertDescription>{message}</AlertDescription></Alert>}
      {reset.message && <Alert variant="success" className="notice" role="status"><AlertDescription>{reset.message}</AlertDescription></Alert>}
      {reset.error && <Alert variant="destructive" className="error"><AlertDescription>{reset.error}</AlertDescription></Alert>}
      {(stats.error || orders.error) && (
        <Alert variant="destructive" className="error"><AlertDescription>Order data could not be loaded. The page will keep retrying.</AlertDescription></Alert>
      )}

      <section className="stats" aria-label="Order statistics">
        {cards.map(([label, value]) => (
          <Card className="card" key={label}><CardContent>
            <p>{label}</p>
            <strong>{value}</strong>
          </CardContent></Card>
        ))}
      </section>

      <section className="panel">
        <SectionHeading
          title="Recent orders"
          description="Refreshes every 5 seconds"
          actions={<Button variant="secondary" type="button" onClick={refresh} disabled={reset.clearing}>Refresh</Button>}
        />
        <div className="table-wrap">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Order</TableHead><TableHead>Product</TableHead><TableHead>Status</TableHead><TableHead>Qty</TableHead><TableHead>Total</TableHead><TableHead>Created</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {orders.data?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>{order.product?.name ?? `Product ${order.productId}`}</TableCell>
                  <TableCell><Badge variant={order.status.toLowerCase() === 'completed' ? 'success' : order.status.toLowerCase() === 'failed' ? 'destructive' : 'secondary'}>{order.status}</Badge></TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{money.format(order.total)}</TableCell>
                  <TableCell>{dateTime.format(new Date(order.createdAt))}</TableCell>
                </TableRow>
              ))}
              {!orders.loading && !orders.data?.length && (
                <TableRow><TableCell className="empty" colSpan={6}>No orders yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
