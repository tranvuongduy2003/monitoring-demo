import { useState } from 'react';
import { grafanaService } from '@/domains/grafana/services/grafanaService';
import type { GrafanaCorrelationSeedResult, GrafanaSeedResult } from '@/domains/grafana/types';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useGrafanaDashboard() {
  const overview = usePollingQuery(grafanaService.getOverview, 10_000);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<GrafanaSeedResult | null>(null);
  const [correlationSeeding, setCorrelationSeeding] = useState(false);
  const [correlationSeedResult, setCorrelationSeedResult] = useState<GrafanaCorrelationSeedResult | null>(null);
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

  async function seedCorrelations() {
    setCorrelationSeeding(true);
    setError('');
    try {
      const result = await grafanaService.seedCorrelations();
      setCorrelationSeedResult(result);
      await overview.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed correlated telemetry');
    } finally {
      setCorrelationSeeding(false);
    }
  }

  return { overview, seeding, seedResult, correlationSeeding, correlationSeedResult, error, seedGrafana, seedCorrelations };
}
