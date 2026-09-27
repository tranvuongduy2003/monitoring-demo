import type { GrafanaOverview, GrafanaSeedResult } from '@/domains/grafana/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const grafanaService = {
  getOverview: (signal?: AbortSignal) => getJson<GrafanaOverview>('/api/grafana/overview?minutes=60', signal),
  seed: () => postJson<GrafanaSeedResult>('/api/grafana/seed?count=180'),
};
