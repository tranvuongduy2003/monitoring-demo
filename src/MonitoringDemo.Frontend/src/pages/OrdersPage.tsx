import { useDemoReset } from '@/domains/demo/hooks/useDemoReset';
import { OrdersDashboard } from '@/domains/orders/components/OrdersDashboard';
import { useOrdersDashboard } from '@/domains/orders/hooks/useOrdersDashboard';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OrdersPage() {
  const orders = useOrdersDashboard();
  const reset = useDemoReset(async () => {
    await Promise.allSettled([orders.stats.refetch(), orders.orders.refetch()]);
  });
  const connected = Boolean(orders.stats.data && orders.orders.data && !orders.stats.error && !orders.orders.error);
  const connectionLabel = orders.stats.loading || orders.orders.loading ? 'Connecting' : 'API unavailable';

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Order service"
        description="Track live business activity and create test traffic for the observability pipeline."
        actions={
          <>
            <Badge variant={connected ? 'success' : 'secondary'} className={`status ${connected ? 'online' : ''}`}><span className="status-dot" aria-hidden="true" />{connected ? 'API connected' : connectionLabel}</Badge>
            <Button
              variant="destructive"
              type="button"
              onClick={() => {
                const confirmed = window.confirm(
                  'Delete every order and clear the in-app metric analytics?\n\n' +
                  'Prometheus and Loki keep telemetry they have already ingested. The background simulator also remains active.',
                );
                if (confirmed) void reset.clearAllData();
              }}
              disabled={orders.creating || reset.clearing}
            >
              {reset.clearing ? 'Clearing...' : 'Clear data'}
            </Button>
            <Button type="button" onClick={() => void orders.createTestOrder()} disabled={orders.creating || reset.clearing}>
              {orders.creating ? 'Creating...' : 'Create test order'}
            </Button>
          </>
        }
      />
      <OrdersDashboard model={orders} reset={reset} />
    </>
  );
}
