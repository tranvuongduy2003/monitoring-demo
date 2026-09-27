import { OtlpDashboard } from '@/domains/otlp/components/OtlpDashboard';
import { useOtlpDashboard } from '@/domains/otlp/hooks/useOtlpDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function OtlpPage() {
  const model = useOtlpDashboard();
  return <><PageHeader eyebrow="Telemetry transport" title="OTLP" description="Compare OTLP/gRPC and OTLP/HTTP, inspect endpoint resolution, and visualize seeded export batches." /><OtlpDashboard model={model} /></>;
}
