import { useState } from 'react';
import { metricsService } from '@/domains/metrics/services/metricsService';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useMetricsDashboard() {
  const analytics = usePollingQuery(metricsService.getAnalytics, 5_000);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  async function seedMetrics() {
    setSeeding(true);
    setMessage('');

    try {
      await metricsService.seedObservations();
      setMessage('Added 120 bounded metric observations');
      await analytics.refetch();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not seed metrics');
    } finally {
      setSeeding(false);
    }
  }

  return { analytics, seeding, message, seedMetrics };
}
