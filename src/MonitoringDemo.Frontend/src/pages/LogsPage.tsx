import { LoggingDashboard } from '@/domains/logging/components/LoggingDashboard';
import { useLoggingDashboard } from '@/domains/logging/hooks/useLoggingDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function LogsPage() {
  const model = useLoggingDashboard();
  return <><PageHeader eyebrow="Telemetry signals" title="Structured logs" description="Investigate searchable events, severity, exceptions, and correlation identifiers in Loki." /><LoggingDashboard model={model} /></>;
}
