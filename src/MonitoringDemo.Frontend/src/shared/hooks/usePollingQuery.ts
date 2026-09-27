import { useCallback, useEffect, useRef, useState } from 'react';

export interface PollingQuery<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePollingQuery<T>(
  query: (signal?: AbortSignal) => Promise<T>,
  refreshInterval = 5_000,
): PollingQuery<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(false);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await query(signal);
      if (!mounted.current) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (!mounted.current || (caught instanceof Error && caught.name === 'AbortError')) return;
      setError(caught instanceof Error ? caught : new Error('Unknown error occurred'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    setLoading(true);
    void fetchData(controller.signal);

    const intervalId = refreshInterval > 0
      ? window.setInterval(() => void fetchData(controller.signal), refreshInterval)
      : undefined;

    return () => {
      mounted.current = false;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      controller.abort();
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: () => fetchData() };
}
