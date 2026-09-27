import type { QueryExample } from '@/shared/types/query';

export interface LogAnalytics {
  available: boolean;
  windowMinutes: number;
  totalLogs: number;
  byLevel: Record<string, number>;
  queries: QueryExample[];
  message?: string;
}

export interface LogDemoResult {
  message: string;
  level: string;
  correlationId: string;
  requestId: string;
  traceId: string;
  spanId: string;
}
