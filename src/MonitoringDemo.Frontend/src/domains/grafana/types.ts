export interface GrafanaOverview {
  generatedAt: string;
  windowMinutes: number;
  analytics: GrafanaAnalytics;
  dataSources: GrafanaDataSource[];
  dashboards: GrafanaDashboardDefinition[];
  panels: GrafanaPanelDefinition[];
  queries: GrafanaQueryDefinition[];
  variables: GrafanaVariableDefinition[];
  explore: GrafanaExploreExample[];
  annotations: GrafanaAnnotationDefinition[];
  alerting: GrafanaAlertRuleDefinition[];
  correlations: GrafanaCorrelationDefinition[];
  correlationAnalytics: CorrelationAnalytics;
}

export interface GrafanaAnalytics {
  queryCount: number;
  dashboardViewCount: number;
  errorCount: number;
  annotationCount: number;
  averageQueryDurationMilliseconds: number;
  p95QueryDurationMilliseconds: number;
  activeAlerts: number;
  timeline: GrafanaTimelinePoint[];
  dataSourceUsage: GrafanaDataSourceUsage[];
  panelUsage: GrafanaPanelUsage[];
  recentActivity: GrafanaRecentActivity[];
}

export interface GrafanaTimelinePoint { timestamp: string; queries: number; errors: number; annotations: number }
export interface GrafanaDataSourceUsage { name: string; queryCount: number; errorCount: number; averageDurationMilliseconds: number }
export interface GrafanaPanelUsage { type: string; viewCount: number }
export interface GrafanaRecentActivity { timestamp: string; dashboard: string; dataSource: string; panelType: string; durationMilliseconds: number; status: string }
export interface GrafanaDataSource { name: string; uid: string; signal: string; url: string; isDefault: boolean; queryLanguage: string; purpose: string }
export interface GrafanaDashboardDefinition { uid: string; title: string; source: string; panelCount: number; purpose: string }
export interface GrafanaPanelDefinition { type: string; title: string; useWhen: string; display: string; query: string }
export interface GrafanaQueryDefinition { language: string; title: string; expression: string; queryType: string; explanation: string }
export interface GrafanaVariableDefinition { name: string; type: string; definition: string; current: string; multiValue: boolean; purpose: string }
export interface GrafanaExploreExample { signal: string; dataSource: string; query: string; workflow: string }
export interface GrafanaAnnotationDefinition { name: string; source: string; query: string; tags: string; enabled: boolean }
export interface GrafanaAlertRuleDefinition { uid: string; title: string; group: string; dataSource: string; query: string; condition: string; for: string; noDataState: string; state: string; source: string }
export interface GrafanaCorrelationDefinition { title: string; signals: string; joinKey: string; configuration: string; query: string; workflow: string }
export interface CorrelationAnalytics {
  operationCount: number;
  logCount: number;
  metricPointCount: number;
  exemplarCount: number;
  uniqueTraceIds: number;
  uniqueSpanIds: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
  timeline: CorrelationTimelinePoint[];
  recentOperations: CorrelationRecentOperation[];
}
export interface CorrelationTimelinePoint { timestamp: string; operations: number; failures: number; exemplars: number }
export interface CorrelationRecentOperation { timestamp: string; correlationId: string; traceId: string; rootSpanId: string; metricSpanId: string; durationMilliseconds: number; status: string }
export interface GrafanaSeedResult { seeded: number; run: number; traceCount: number; correlationCount: number; analytics: GrafanaAnalytics; correlationAnalytics: CorrelationAnalytics }
export interface GrafanaCorrelationSeedResult { seeded: number; run: number; analytics: CorrelationAnalytics }
