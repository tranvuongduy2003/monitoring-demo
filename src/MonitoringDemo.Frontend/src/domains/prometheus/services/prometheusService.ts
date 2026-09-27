import type { PrometheusOverview, PromQlFundamentals } from '@/domains/prometheus/types';
import { getJson, post } from '@/shared/services/httpClient';

export const prometheusService = {
  getOverview: (signal?: AbortSignal) =>
    getJson<PrometheusOverview>('/api/prometheus/overview?minutes=60', signal),
  getFundamentals: (signal?: AbortSignal) =>
    getJson<PromQlFundamentals>('/api/prometheus/fundamentals', signal),
  seedObservations: () => post('/api/metrics/seed?count=240'),
};
