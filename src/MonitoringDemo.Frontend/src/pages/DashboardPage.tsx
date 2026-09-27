import { LearningMap } from '@/components/LearningMap';
import { MonitoringLinks } from '@/components/MonitoringLinks';
import { useDemoReset } from '@/domains/demo/hooks/useDemoReset';
import { LoggingDashboard } from '@/domains/logging/components/LoggingDashboard';
import { useLoggingDashboard } from '@/domains/logging/hooks/useLoggingDashboard';
import { MetricsDashboard } from '@/domains/metrics/components/MetricsDashboard';
import { useMetricsDashboard } from '@/domains/metrics/hooks/useMetricsDashboard';
import { OrdersDashboard } from '@/domains/orders/components/OrdersDashboard';
import { useOrdersDashboard } from '@/domains/orders/hooks/useOrdersDashboard';
import { PrometheusDashboard } from '@/domains/prometheus/components/PrometheusDashboard';
import { usePrometheusDashboard } from '@/domains/prometheus/hooks/usePrometheusDashboard';

export function DashboardPage() {
  const orders = useOrdersDashboard();
  const metrics = useMetricsDashboard();
  const prometheus = usePrometheusDashboard();
  const logging = useLoggingDashboard();
  const reset = useDemoReset(async () => {
    await Promise.allSettled([
      orders.stats.refetch(),
      orders.orders.refetch(),
      metrics.analytics.refetch(),
      prometheus.overview.refetch(),
      prometheus.fundamentals.refetch(),
      logging.analytics.refetch(),
    ]);
  });

  return (
    <main className="page">
      <OrdersDashboard model={orders} reset={reset} />
      <MetricsDashboard model={metrics} />
      <PrometheusDashboard model={prometheus} />
      <LoggingDashboard model={logging} />
      <LearningMap />
      <MonitoringLinks />
    </main>
  );
}
