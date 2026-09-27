export interface CollectorOverview {
  generatedAt: string;
  windowMinutes: number;
  configured: boolean;
  collectorEndpoint: string;
  analytics: CollectorAnalytics;
  architecture: CollectorComponent[];
  receivers: CollectorComponentDetail[];
  processors: CollectorComponentDetail[];
  exporters: CollectorComponentDetail[];
  pipelines: CollectorPipeline[];
  settings: CollectorRuntimeSettings;
}

export interface CollectorAnalytics {
  ingressRequestCount: number;
  receivedRecordCount: number;
  acceptedRecordCount: number;
  refusedRecordCount: number;
  retriedRecordCount: number;
  droppedRecordCount: number;
  exportedRecordCount: number;
  batchCount: number;
  averageBatchSize: number;
  p95BatchSize: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
  peakMemoryMib: number;
  memoryPressureEvents: number;
  timeline: CollectorTimelinePoint[];
  signals: CollectorSignalAnalytics[];
  protocols: CollectorProtocolAnalytics[];
  batches: CollectorBatchAnalytics[];
  recentRuns: CollectorRecentRun[];
}

export interface CollectorTimelinePoint {
  timestamp: string;
  receivedRecords: number;
  exportedRecords: number;
  refusedRecords: number;
  memoryMib: number;
}

export interface CollectorSignalAnalytics {
  signal: string;
  receivedRecords: number;
  exportedRecords: number;
  droppedRecords: number;
  batchCount: number;
}

export interface CollectorProtocolAnalytics {
  protocol: string;
  requestCount: number;
  receivedRecords: number;
  refusedRecords: number;
  averageDurationMilliseconds: number;
}

export interface CollectorBatchAnalytics {
  trigger: string;
  batchCount: number;
  averageBatchSize: number;
}

export interface CollectorRecentRun {
  timestamp: string;
  signal: string;
  protocol: string;
  exporter: string;
  receivedRecords: number;
  exportedRecords: number;
  batchCount: number;
  batchTrigger: string;
  memoryMib: number;
  memoryState: string;
}

export interface CollectorComponent {
  stage: string;
  name: string;
  description: string;
}

export interface CollectorComponentDetail {
  id: string;
  name: string;
  type: string;
  endpointOrSetting: string;
  signals: string;
  state: string;
}

export interface CollectorPipeline {
  signal: string;
  receiver: string;
  processors: string[];
  exporters: string[];
}

export interface CollectorRuntimeSettings {
  sendBatchSize: number;
  batchTimeout: string;
  memorySoftLimitMib: number;
  memoryHardLimitMib: number;
  memoryCheckInterval: string;
  goMemoryLimit: string;
}

export interface CollectorSeedResult {
  seeded: number;
  run: number;
  analytics: CollectorAnalytics;
}
