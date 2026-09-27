import type { MetricsAnalytics } from '@/domains/metrics/types';
import { getJson, post } from '@/shared/services/httpClient';

export const metricsService = {
  getAnalytics: (signal?: AbortSignal) =>
    getJson<MetricsAnalytics>('/api/metrics/analytics?minutes=60', signal),
  seedObservations: () => post('/api/metrics/seed?count=120'),
};
