import { OpenTelemetryDashboard } from '@/domains/opentelemetry/components/OpenTelemetryDashboard';
import { useOpenTelemetryDashboard } from '@/domains/opentelemetry/hooks/useOpenTelemetryDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function OpenTelemetryPage() {
  const model = useOpenTelemetryDashboard();
  return <><PageHeader eyebrow="Telemetry foundation" title="OpenTelemetry" description="Follow one vendor-neutral pipeline across traces, metrics, logs, resources, and propagation." /><OpenTelemetryDashboard model={model} /></>;
}
