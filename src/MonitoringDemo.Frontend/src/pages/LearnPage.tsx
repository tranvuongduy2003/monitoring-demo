import { LearningTabs } from '@/components/LearningTabs';
import { PageHeader } from '@/shared/components/PageHeader';

export function LearnPage() {
  return (
    <>
      <PageHeader eyebrow="Reference" title="Learn & tools" description="Build a clear mental model for observability, then continue the investigation in the monitoring backends." />
      <LearningTabs />
    </>
  );
}
