import type { LogAnalytics, LogDemoResult } from '@/domains/logging/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const loggingService = {
  getAnalytics: (signal?: AbortSignal) =>
    getJson<LogAnalytics>('/api/logging/analytics?minutes=60', signal),
  generate: (includeException: boolean) => {
    const level = includeException ? 'Error' : 'Information';
    return postJson<LogDemoResult>(
      `/api/logging/demo?level=${level}&includeException=${includeException}`,
      { headers: { 'X-Correlation-ID': `frontend-lab-${Date.now()}` } },
    );
  },
};
