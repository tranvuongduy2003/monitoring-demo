import { useEffect, useRef, useState } from 'react';
import { loggingService } from '@/domains/logging/services/loggingService';
import type { LogDemoResult } from '@/domains/logging/types';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useLoggingDashboard() {
  const analytics = usePollingQuery(loggingService.getAnalytics, 10_000);
  const [generating, setGenerating] = useState(false);
  const [demo, setDemo] = useState<LogDemoResult | null>(null);
  const [error, setError] = useState('');
  const refreshTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(refreshTimer.current), []);

  async function generateLog(includeException: boolean) {
    setGenerating(true);
    setDemo(null);
    setError('');

    try {
      setDemo(await loggingService.generate(includeException));
      refreshTimer.current = window.setTimeout(() => void analytics.refetch(), 2_000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not generate log');
    } finally {
      setGenerating(false);
    }
  }

  return { analytics, generating, demo, error, generateLog };
}
