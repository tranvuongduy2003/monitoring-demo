import { useState } from 'react';
import { collectorService } from '@/domains/collector/services/collectorService';
import type { CollectorSeedResult } from '@/domains/collector/types';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useCollectorDashboard() {
  const overview = usePollingQuery(collectorService.getOverview, 10_000);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<CollectorSeedResult | null>(null);
  const [error, setError] = useState('');

  async function seedCollector() {
    setSeeding(true);
    setError('');
    try {
      const result = await collectorService.seed();
      setSeedResult(result);
      await overview.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed Collector telemetry');
    } finally {
      setSeeding(false);
    }
  }

  return { overview, seeding, seedResult, error, seedCollector };
}
