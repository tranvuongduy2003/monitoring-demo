import { useState } from 'react';
import type { ApplicationMonitoringScenario } from '@/domains/application-monitoring/types';
import { applicationMonitoringService } from '@/domains/application-monitoring/services/applicationMonitoringService';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useApplicationMonitoringDashboard() {
  const analytics = usePollingQuery(applicationMonitoringService.getAnalytics, 5_000);
  const [seeding, setSeeding] = useState<ApplicationMonitoringScenario | null>(null);
  const [message, setMessage] = useState('');

  async function seed(scenario: ApplicationMonitoringScenario) {
    setSeeding(scenario);
    setMessage('');
    try {
      await applicationMonitoringService.seed(scenario);
      setMessage(`Added 240 ${scenario.replace('-', ' ')} transactions across every monitoring signal.`);
      await analytics.refetch();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not seed the application monitoring scenario.');
    } finally {
      setSeeding(null);
    }
  }

  return { analytics, seeding, message, seed };
}
