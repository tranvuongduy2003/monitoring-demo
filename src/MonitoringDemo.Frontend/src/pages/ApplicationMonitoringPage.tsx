import { ApplicationMonitoringDashboard } from '@/domains/application-monitoring/components/ApplicationMonitoringDashboard';
import { useApplicationMonitoringDashboard } from '@/domains/application-monitoring/hooks/useApplicationMonitoringDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function ApplicationMonitoringPage() {
  const model = useApplicationMonitoringDashboard();
  return <><PageHeader eyebrow="Application monitoring" title="See every layer of the request path" description="Correlate HTTP, database, cache, dependency, business, trace, and error telemetry in one seedable lab." /><ApplicationMonitoringDashboard model={model} /></>;
}
