import type { PrometheusOverview } from '@/domains/prometheus/types';
import { getJson, post } from '@/shared/services/httpClient';

export const prometheusService = {
  getOverview: (signal?: AbortSignal) =>
    getJson<PrometheusOverview>('/api/prometheus/overview?minutes=60', signal),
  seedObservations: () => post('/api/metrics/seed?count=240'),
};
