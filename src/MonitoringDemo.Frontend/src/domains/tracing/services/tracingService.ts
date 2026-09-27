import type { TraceOverview, TraceSeedResult } from '@/domains/tracing/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const tracingService = {
  getOverview: (signal?: AbortSignal) =>
    getJson<TraceOverview>('/api/tracing/overview?minutes=60', signal),
  seed: () => postJson<TraceSeedResult>('/api/tracing/seed?count=12'),
};
