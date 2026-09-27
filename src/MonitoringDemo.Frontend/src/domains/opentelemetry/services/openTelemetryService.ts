import type { OpenTelemetryOverview, OpenTelemetrySeedResult } from '@/domains/opentelemetry/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const openTelemetryService = {
  getOverview: (signal?: AbortSignal) =>
    getJson<OpenTelemetryOverview>('/api/opentelemetry/overview?minutes=60', signal),
  seed: () => postJson<OpenTelemetrySeedResult>('/api/opentelemetry/seed?count=100'),
};
