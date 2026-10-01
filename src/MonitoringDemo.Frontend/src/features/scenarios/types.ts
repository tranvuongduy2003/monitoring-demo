export type ScenarioDefinition = {
  id: string;
  name: string;
  description: string;
  signals: string[];
  defaultCount: number;
  dashboardPath: string;
};

export type ScenarioRunResult = {
  scenarioId: string;
  startedAt: string;
  completedAt: string;
  metricObservations: number;
  applicationTransactions: number;
  methodologyRequests: number;
  logEvents: number;
  traceCount: number;
  ordersCreated: number;
  traceIds: string[];
};
