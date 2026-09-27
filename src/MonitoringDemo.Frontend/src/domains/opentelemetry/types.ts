export interface OpenTelemetryOverview {
  generatedAt: string;
  windowMinutes: number;
  analytics: OpenTelemetryAnalytics;
  architecture: OpenTelemetryArchitectureStage[];
  apiAndSdk: OpenTelemetryConceptItem[];
  instrumentation: OpenTelemetryInstrumentationItem[];
  resource: TelemetryResourceAttribute[];
  semanticConventions: OpenTelemetryConceptItem[];
  signals: OpenTelemetrySignalComponent[];
  propagators: OpenTelemetryPropagatorItem[];
}

export interface OpenTelemetryAnalytics {
  operationCount: number;
  spanCount: number;
  metricPointCount: number;
  logRecordCount: number;
  errorCount: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
  timeline: OpenTelemetryTimelinePoint[];
  operations: OpenTelemetryOperationAnalytics[];
}

export interface OpenTelemetryTimelinePoint {
  timestamp: string;
  spans: number;
  metrics: number;
  logs: number;
  errors: number;
}

export interface OpenTelemetryOperationAnalytics {
  operation: string;
  count: number;
  errorCount: number;
  averageDurationMilliseconds: number;
}

export interface OpenTelemetryArchitectureStage {
  name: string;
  role: string;
  description: string;
}

export interface OpenTelemetryConceptItem {
  name: string;
  role: string;
  example: string;
  description: string;
}

export interface OpenTelemetryInstrumentationItem {
  type: string;
  library: string;
  produces: string;
  enabled: boolean;
}

export interface TelemetryResourceAttribute {
  key: string;
  value: string;
  source: string;
}

export interface OpenTelemetrySignalComponent {
  name: string;
  api: string;
  output: string;
  exportedTo: string;
  description: string;
}

export interface OpenTelemetryPropagatorItem {
  name: string;
  field: string;
  purpose: string;
  enabled: boolean;
}

export interface OpenTelemetrySeedResult {
  seeded: number;
  run: number;
  firstTraceId?: string;
  analytics: OpenTelemetryAnalytics;
}
