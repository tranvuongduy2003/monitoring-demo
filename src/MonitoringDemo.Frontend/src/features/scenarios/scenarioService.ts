import { getJson, postJson } from '@/shared/services/httpClient';
import type { ScenarioDefinition, ScenarioRunResult } from '@/features/scenarios/types';

export const scenarioService = {
  list(signal?: AbortSignal) {
    return getJson<ScenarioDefinition[]>('/api/scenarios', signal);
  },

  run(id: string, count: number) {
    return postJson<ScenarioRunResult>(`/api/scenarios/${encodeURIComponent(id)}?count=${count}`);
  },
};
