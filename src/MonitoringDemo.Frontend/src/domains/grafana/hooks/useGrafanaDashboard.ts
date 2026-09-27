import { useState } from 'react';
import { grafanaService } from '@/domains/grafana/services/grafanaService';
import type { GrafanaSeedResult } from '@/domains/grafana/types';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useGrafanaDashboard() {
  const overview = usePollingQuery(grafanaService.getOverview, 10_000);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<GrafanaSeedResult | null>(null);
  const [error, setError] = useState('');

  async function seedGrafana() {
    setSeeding(true);
    setError('');
    try {
      const result = await grafanaService.seed();
      setSeedResult(result);
      await overview.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed Grafana analytics');
    } finally {
      setSeeding(false);
    }
  }

  return { overview, seeding, seedResult, error, seedGrafana };
}
