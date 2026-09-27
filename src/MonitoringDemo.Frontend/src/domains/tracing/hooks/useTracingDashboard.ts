import { useEffect, useRef, useState } from 'react';
import { tracingService } from '@/domains/tracing/services/tracingService';
import type { TraceSeedResult } from '@/domains/tracing/types';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useTracingDashboard() {
  const overview = usePollingQuery(tracingService.getOverview, 10_000);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<TraceSeedResult | null>(null);
  const [error, setError] = useState('');
  const refreshTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(refreshTimer.current), []);

  async function seedTraces() {
    setSeeding(true);
    setSeedResult(null);
    setError('');

    try {
      const result = await tracingService.seed();
      setSeedResult(result);
      refreshTimer.current = window.setTimeout(() => void overview.refetch(), 4_000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed traces');
    } finally {
      setSeeding(false);
    }
  }

  return { overview, seeding, seedResult, error, seedTraces };
}
