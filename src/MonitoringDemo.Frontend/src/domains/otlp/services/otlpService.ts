import type { OtlpOverview, OtlpSeedResult } from '@/domains/otlp/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const otlpService = {
  getOverview: (signal?: AbortSignal) => getJson<OtlpOverview>('/api/otlp/overview?minutes=60', signal),
  seed: () => postJson<OtlpSeedResult>('/api/otlp/seed?count=120'),
};
