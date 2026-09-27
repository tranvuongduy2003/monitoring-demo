import { useState } from 'react';
import { openTelemetryService } from '@/domains/opentelemetry/services/openTelemetryService';
import type { OpenTelemetrySeedResult } from '@/domains/opentelemetry/types';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useOpenTelemetryDashboard() {
  const overview = usePollingQuery(openTelemetryService.getOverview, 10_000);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<OpenTelemetrySeedResult | null>(null);
  const [error, setError] = useState('');

  async function seedTelemetry() {
    setSeeding(true);
    setError('');
    try {
      const result = await openTelemetryService.seed();
      setSeedResult(result);
      await overview.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed OpenTelemetry signals');
    } finally {
      setSeeding(false);
    }
  }

  return { overview, seeding, seedResult, error, seedTelemetry };
}
