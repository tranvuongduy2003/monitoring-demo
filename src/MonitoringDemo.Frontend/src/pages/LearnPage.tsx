import { LearningMap } from '@/components/LearningMap';
import { MonitoringLinks } from '@/components/MonitoringLinks';
import { PageHeader } from '@/shared/components/PageHeader';

export function LearnPage() {
  return (
    <>
      <PageHeader eyebrow="Reference" title="Learn & tools" description="Review the core observability concepts, then continue the investigation in the monitoring backends." />
      <LearningMap />
      <MonitoringLinks />
    </>
  );
}
