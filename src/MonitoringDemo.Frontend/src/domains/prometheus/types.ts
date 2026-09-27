export interface PrometheusOverview {
  connected: boolean;
  error: string | null;
  checkedAt: string;
  baseUrl: string;
  settings: {
    globalScrapeInterval: string;
    apiScrapeInterval: string;
    evaluationInterval: string;
    retention: string;
    metricsPath: string;
    discoveryMechanism: string;
    discoveryRefreshInterval: string;
  };
  targets: PrometheusTarget[];
  jobs: Array<{
    name: string;
    targetCount: number;
    healthyTargetCount: number;
    instanceCount: number;
  }>;
  rules: PrometheusRule[];
  storage: {
    retention: string;
    headSeries: number;
    headChunks: number;
    minTime: string | null;
    maxTime: string | null;
    topMetrics: Array<{ name: string; count: number }>;
  };
  analytics: {
    targetsUp: number;
    ordersPerSecond: number;
    p95DurationMilliseconds: number;
    firingAlerts: number;
    throughput: Array<{ timestamp: string; value: number }>;
  };
}

export interface PrometheusTarget {
  job: string;
  instance: string;
  scrapeUrl: string;
  health: string;
  lastError: string;
  lastScrape: string | null;
  lastScrapeDurationSeconds: number;
  scrapeInterval: string;
  labels: Record<string, string>;
  discoveredLabels: Record<string, string>;
}

export interface PrometheusRule {
  name: string;
  kind: string;
  group: string;
  query: string;
  health: string;
  state: string;
  lastError: string;
  lastEvaluation: string | null;
  evaluationTimeSeconds: number;
}
