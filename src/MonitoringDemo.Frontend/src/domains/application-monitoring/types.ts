import type { QueryExample } from '@/shared/types/query';

export type ApplicationMonitoringScenario = 'healthy' | 'cache-pressure' | 'dependency-outage';
export type ApplicationMonitoringCategory = 'http' | 'database' | 'cache' | 'dependency' | 'custom-metric' | 'custom-span' | 'error';

export interface ApplicationMonitoringSection {
  category: ApplicationMonitoringCategory;
  operations: number;
  errors: number;
  errorRatePercent: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
  breakdown: Array<{ name: string; operations: number; errors: number; averageDurationMilliseconds: number }>;
}

export interface ApplicationMonitoringAnalytics {
  windowMinutes: number;
  from: string;
  to: string;
  sections: ApplicationMonitoringSection[];
  timeSeries: Array<{ timestamp: string; category: ApplicationMonitoringCategory; operations: number; errors: number; value: number }>;
  cache: { hits: number; misses: number; errors: number; hitRatePercent: number };
  business: { checkoutsStarted: number; checkoutsCompleted: number; revenue: number; queueDepth: number };
  recentSpans: Array<{ timestamp: string; name: string; traceId: string; durationMilliseconds: number; success: boolean; scenario: string }>;
  recentErrors: Array<{ timestamp: string; source: string; type: string; message: string; scenario: string }>;
  scenarios: ApplicationMonitoringScenario[];
  queries: Array<QueryExample & { section: ApplicationMonitoringCategory }>;
}
