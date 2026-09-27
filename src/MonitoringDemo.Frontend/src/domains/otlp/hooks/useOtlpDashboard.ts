import { useState } from 'react';
import { otlpService } from '@/domains/otlp/services/otlpService';
import type { OtlpSeedResult } from '@/domains/otlp/types';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useOtlpDashboard() {
  const overview = usePollingQuery(otlpService.getOverview, 10_000);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<OtlpSeedResult | null>(null);
  const [error, setError] = useState('');

  async function seedOtlp() {
    setSeeding(true);
    setError('');
    try {
      const result = await otlpService.seed();
      setSeedResult(result);
      await overview.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed OTLP export batches');
    } finally {
      setSeeding(false);
    }
  }

  return { overview, seeding, seedResult, error, seedOtlp };
}
