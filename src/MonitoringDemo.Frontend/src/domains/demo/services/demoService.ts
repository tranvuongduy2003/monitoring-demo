import type { ClearDemoDataResult } from '@/domains/demo/types';
import { deleteJson } from '@/shared/services/httpClient';

export const demoService = {
  clearAllData: () => deleteJson<ClearDemoDataResult>('/api/demo/data'),
};
