import { TracingDashboard } from '@/domains/tracing/components/TracingDashboard';
import { useTracingDashboard } from '@/domains/tracing/hooks/useTracingDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function TracesPage() {
  const model = useTracingDashboard();
  return <><PageHeader eyebrow="Telemetry signals" title="Distributed traces" description="Explore request waterfalls, parent-child spans, W3C context, baggage, and TraceQL." /><TracingDashboard model={model} /></>;
}
