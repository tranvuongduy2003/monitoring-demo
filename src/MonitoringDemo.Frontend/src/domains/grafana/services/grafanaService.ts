import type { AlertingSeedResult, GrafanaCorrelationSeedResult, GrafanaOverview, GrafanaSeedResult } from '@/domains/grafana/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const grafanaService = {
  getOverview: (signal?: AbortSignal) => getJson<GrafanaOverview>('/api/grafana/overview?minutes=60', signal),
  seed: () => postJson<GrafanaSeedResult>('/api/grafana/seed?count=180'),
  seedCorrelations: () => postJson<GrafanaCorrelationSeedResult>('/api/grafana/correlation/seed?count=24'),
  seedAlerting: (scenario: string) => postJson<AlertingSeedResult>(`/api/grafana/alerting/seed?scenario=${encodeURIComponent(scenario)}&count=90`),
};
