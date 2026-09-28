import type { ApplicationMonitoringAnalytics, ApplicationMonitoringScenario } from '@/domains/application-monitoring/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const applicationMonitoringService = {
  getAnalytics: (signal?: AbortSignal) => getJson<ApplicationMonitoringAnalytics>('/api/application-monitoring/analytics?minutes=60', signal),
  seed: (scenario: ApplicationMonitoringScenario) => postJson(`/api/application-monitoring/seed?scenario=${scenario}&count=240`),
};
