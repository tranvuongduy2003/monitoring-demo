import type { CollectorOverview, CollectorSeedResult } from '@/domains/collector/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const collectorService = {
  getOverview: (signal?: AbortSignal) => getJson<CollectorOverview>('/api/collector/overview?minutes=60', signal),
  seed: () => postJson<CollectorSeedResult>('/api/collector/seed?count=150'),
};
