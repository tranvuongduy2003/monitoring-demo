import { useState } from 'react';
import type { MethodologyScenario } from '@/domains/methodologies/types';
import { methodologiesService } from '@/domains/methodologies/services/methodologiesService';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useMethodologiesDashboard() {
  const analytics = usePollingQuery(methodologiesService.getAnalytics, 5_000);
  const [seeding, setSeeding] = useState<MethodologyScenario | null>(null);
  const [message, setMessage] = useState('');

  async function seedScenario(scenario: MethodologyScenario) {
    setSeeding(scenario);
    setMessage('');
    try {
      await methodologiesService.seedScenario(scenario);
      setMessage(`Added 360 ${scenario.replace('-', ' ')} requests and resource samples`);
      await analytics.refetch();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not seed the monitoring scenario');
    } finally {
      setSeeding(null);
    }
  }

  return { analytics, seeding, message, seedScenario };
}
