import { MetricsDashboard } from '@/domains/metrics/components/MetricsDashboard';
import { useMetricsDashboard } from '@/domains/metrics/hooks/useMetricsDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function MetricsPage() {
  const model = useMetricsDashboard();
  return <><PageHeader eyebrow="Telemetry signals" title="Application metrics" description="Measure behavior with counters, gauges, histograms, bounded labels, and latency distributions." /><MetricsDashboard model={model} /></>;
}
