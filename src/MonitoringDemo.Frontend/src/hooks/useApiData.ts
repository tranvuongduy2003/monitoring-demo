import { useState, useEffect, useCallback } from 'react';

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useApiData<T>(url: string, refreshInterval: number = 5000): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      const response = await fetch(url, { signal: abortSignal });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const abortController = new AbortController();
    
    setLoading(true);
    fetchData(abortController.signal);

    let intervalId: number | undefined;
    if (refreshInterval > 0) {
      intervalId = window.setInterval(() => {
        fetchData(abortController.signal);
      }, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      abortController.abort();
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: () => fetchData() };
}
