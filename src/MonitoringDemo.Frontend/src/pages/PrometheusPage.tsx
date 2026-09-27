import { PrometheusDashboard } from '@/domains/prometheus/components/PrometheusDashboard';
import { usePrometheusDashboard } from '@/domains/prometheus/hooks/usePrometheusDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function PrometheusPage() {
  const model = usePrometheusDashboard();
  return <><PageHeader eyebrow="Metrics backend" title="Prometheus" description="Inspect pull-based collection, PromQL analytics, rules, targets, and time-series storage." /><PrometheusDashboard model={model} /></>;
}
