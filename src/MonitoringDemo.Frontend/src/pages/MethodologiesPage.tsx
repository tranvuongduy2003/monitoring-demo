import { MethodologiesDashboard } from '@/domains/methodologies/components/MethodologiesDashboard';
import { useMethodologiesDashboard } from '@/domains/methodologies/hooks/useMethodologiesDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function MethodologiesPage() {
  const model = useMethodologiesDashboard();
  return (
    <>
      <PageHeader eyebrow="Monitoring methodologies" title="RED, USE & Four Golden Signals" description="Apply complementary service and resource health frameworks to live, seeded telemetry." />
      <MethodologiesDashboard model={model} />
    </>
  );
}
