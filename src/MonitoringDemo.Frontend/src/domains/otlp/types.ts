export interface OtlpOverview {
  generatedAt: string;
  windowMinutes: number;
  analytics: OtlpAnalytics;
  protocols: OtlpProtocolDefinition[];
  endpoints: OtlpEndpointConfiguration[];
  endpointPrecedence: OtlpEndpointRule[];
}

export interface OtlpAnalytics {
  batchCount: number;
  recordCount: number;
  retriedBatchCount: number;
  failedBatchCount: number;
  wireBytes: number;
  compressionSavingsPercent: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
  timeline: OtlpTimelinePoint[];
  protocols: OtlpProtocolAnalytics[];
  signals: OtlpSignalAnalytics[];
  recentBatches: OtlpBatch[];
}

export interface OtlpTimelinePoint {
  timestamp: string;
  grpcBatches: number;
  httpBatches: number;
  records: number;
  failures: number;
}

export interface OtlpProtocolAnalytics {
  protocol: string;
  batchCount: number;
  recordCount: number;
  retriedBatchCount: number;
  failedBatchCount: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
  wireBytes: number;
}

export interface OtlpSignalAnalytics {
  signal: string;
  batchCount: number;
  recordCount: number;
  wireBytes: number;
  failedBatchCount: number;
}

export interface OtlpBatch {
  batchId: string;
  timestamp: string;
  protocol: string;
  signal: string;
  destination: string;
  recordCount: number;
  wireBytes: number;
  durationMilliseconds: number;
  status: string;
  attempts: number;
}

export interface OtlpProtocolDefinition {
  name: string;
  protocol: string;
  defaultPort: number;
  transport: string;
  description: string;
  methodsOrPaths: string[];
  strengths: string[];
}

export interface OtlpEndpointConfiguration {
  destination: string;
  signals: string;
  protocol: string;
  endpoint: string;
  source: string;
  configured: boolean;
  note: string;
}

export interface OtlpEndpointRule {
  priority: number;
  name: string;
  variable: string;
  description: string;
}

export interface OtlpSeedResult {
  seeded: number;
  run: number;
  analytics: OtlpAnalytics;
}
