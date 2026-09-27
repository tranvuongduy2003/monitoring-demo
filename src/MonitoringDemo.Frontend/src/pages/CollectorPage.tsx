import { CollectorDashboard } from '@/domains/collector/components/CollectorDashboard';
import { useCollectorDashboard } from '@/domains/collector/hooks/useCollectorDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function CollectorPage() {
  const model = useCollectorDashboard();
  return <><PageHeader eyebrow="Telemetry control plane" title="OpenTelemetry Collector" description="Inspect receivers, processors, exporters, pipelines, batching, and memory protection with seeded multi-signal analytics." /><CollectorDashboard model={model} /></>;
}
