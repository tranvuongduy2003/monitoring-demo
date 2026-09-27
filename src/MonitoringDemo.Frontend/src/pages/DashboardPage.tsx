import { LearningMap } from '@/components/LearningMap';
import { MonitoringLinks } from '@/components/MonitoringLinks';
import { LoggingDashboard } from '@/domains/logging/components/LoggingDashboard';
import { useLoggingDashboard } from '@/domains/logging/hooks/useLoggingDashboard';
import { MetricsDashboard } from '@/domains/metrics/components/MetricsDashboard';
import { useMetricsDashboard } from '@/domains/metrics/hooks/useMetricsDashboard';
import { OrdersDashboard } from '@/domains/orders/components/OrdersDashboard';
import { useOrdersDashboard } from '@/domains/orders/hooks/useOrdersDashboard';

export function DashboardPage() {
  const orders = useOrdersDashboard();
  const metrics = useMetricsDashboard();
  const logging = useLoggingDashboard();

  return (
    <main className="page">
      <OrdersDashboard model={orders} />
      <MetricsDashboard model={metrics} />
      <LoggingDashboard model={logging} />
      <LearningMap />
      <MonitoringLinks />
    </main>
  );
}
