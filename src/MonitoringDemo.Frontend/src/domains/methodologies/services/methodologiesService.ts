import type { MethodologyScenario, MonitoringMethodologyAnalytics } from '@/domains/methodologies/types';
import { getJson, postJson } from '@/shared/services/httpClient';

export const methodologiesService = {
  getAnalytics: (signal?: AbortSignal) =>
    getJson<MonitoringMethodologyAnalytics>('/api/methodologies/analytics?minutes=60', signal),
  seedScenario: (scenario: MethodologyScenario) =>
    postJson(`/api/methodologies/seed?scenario=${scenario}&count=360`),
};
