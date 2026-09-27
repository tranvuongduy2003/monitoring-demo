import type { QueryExample } from '@/shared/types/query';

export interface MetricsAnalytics {
  windowMinutes: number;
  from: string;
  to: string;
  counter: { name: string; value: number; failedValue: number; description: string };
  gauge: { name: string; value: number; description: string };
  histogram: {
    name: string;
    buckets: Array<{ lessThanOrEqual: number | null; count: number }>;
    count: number;
    sum: number;
  };
  summary: { count: number; sum: number; average: number; p50: number; p95: number; p99: number };
  timeSeries: Array<{
    timestamp: string;
    count: number;
    failedCount: number;
    averageDurationMilliseconds: number;
  }>;
  cardinality: {
    observedSeries: number;
    maximumExpectedSeries: number;
    series: Array<{ status: string; category: string; source: string }>;
  };
  labels: Array<{ name: string; boundedValues: string }>;
  queries: QueryExample[];
}
