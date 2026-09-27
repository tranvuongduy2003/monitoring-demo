import { useState } from 'react';
import { prometheusService } from '@/domains/prometheus/services/prometheusService';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function usePrometheusDashboard() {
  const overview = usePollingQuery(prometheusService.getOverview, 5_000);
  const fundamentals = usePollingQuery(prometheusService.getFundamentals, 10_000);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  async function seedPrometheus() {
    setSeeding(true);
    setMessage('');

    try {
      await prometheusService.seedObservations();
      setMessage('Added 240 observations. Prometheus will capture the new totals on its next 5s scrape.');
      await Promise.all([overview.refetch(), fundamentals.refetch()]);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not seed Prometheus metrics');
    } finally {
      setSeeding(false);
    }
  }

  return { overview, fundamentals, seeding, message, seedPrometheus };
}
