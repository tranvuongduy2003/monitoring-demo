import { LearningMap } from '@/components/LearningMap';
import { MonitoringLinks } from '@/components/MonitoringLinks';
import { useDemoReset } from '@/domains/demo/hooks/useDemoReset';
import { LoggingDashboard } from '@/domains/logging/components/LoggingDashboard';
import { useLoggingDashboard } from '@/domains/logging/hooks/useLoggingDashboard';
import { MetricsDashboard } from '@/domains/metrics/components/MetricsDashboard';
import { useMetricsDashboard } from '@/domains/metrics/hooks/useMetricsDashboard';
import { OpenTelemetryDashboard } from '@/domains/opentelemetry/components/OpenTelemetryDashboard';
import { useOpenTelemetryDashboard } from '@/domains/opentelemetry/hooks/useOpenTelemetryDashboard';
import { OrdersDashboard } from '@/domains/orders/components/OrdersDashboard';
import { useOrdersDashboard } from '@/domains/orders/hooks/useOrdersDashboard';
import { PrometheusDashboard } from '@/domains/prometheus/components/PrometheusDashboard';
import { usePrometheusDashboard } from '@/domains/prometheus/hooks/usePrometheusDashboard';
import { TracingDashboard } from '@/domains/tracing/components/TracingDashboard';
import { useTracingDashboard } from '@/domains/tracing/hooks/useTracingDashboard';

export function DashboardPage() {
  const orders = useOrdersDashboard();
  const metrics = useMetricsDashboard();
  const openTelemetry = useOpenTelemetryDashboard();
  const prometheus = usePrometheusDashboard();
  const logging = useLoggingDashboard();
  const tracing = useTracingDashboard();
  const reset = useDemoReset(async () => {
    await Promise.allSettled([
      orders.stats.refetch(),
      orders.orders.refetch(),
      metrics.analytics.refetch(),
      openTelemetry.overview.refetch(),
      prometheus.overview.refetch(),
      prometheus.fundamentals.refetch(),
      logging.analytics.refetch(),
      tracing.overview.refetch(),
    ]);
  });

  return (
    <main className="page">
      <OrdersDashboard model={orders} reset={reset} />
      <OpenTelemetryDashboard model={openTelemetry} />
      <MetricsDashboard model={metrics} />
      <PrometheusDashboard model={prometheus} />
      <LoggingDashboard model={logging} />
      <TracingDashboard model={tracing} />
      <LearningMap />
      <MonitoringLinks />
    </main>
  );
}
