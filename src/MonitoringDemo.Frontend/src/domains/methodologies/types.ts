import type { QueryExample } from '@/shared/types/query';

export type MethodologyScenario = 'baseline' | 'traffic-spike' | 'failure-burst';

export interface MonitoringMethodologyAnalytics {
  windowMinutes: number;
  from: string;
  to: string;
  red: {
    requests: number;
    ratePerMinute: number;
    errors: number;
    errorRatePercent: number;
    averageDurationMilliseconds: number;
    p95DurationMilliseconds: number;
  };
  use: Array<{
    resource: string;
    currentUtilizationPercent: number;
    averageUtilizationPercent: number;
    currentSaturationPercent: number;
    peakSaturationPercent: number;
    errors: number;
  }>;
  goldenSignals: {
    trafficPerMinute: number;
    errorRatePercent: number;
    latencyP95Milliseconds: number;
    saturationPercent: number;
    requests: number;
    errors: number;
  };
  timeSeries: Array<{
    timestamp: string;
    requests: number;
    errors: number;
    averageDurationMilliseconds: number;
    peakSaturationPercent: number;
  }>;
  scenarios: Array<{
    scenario: string;
    requests: number;
    errors: number;
    averageDurationMilliseconds: number;
  }>;
  queries: Array<QueryExample & { methodology: string }>;
}
