namespace MonitoringDemo.ApiService.Features.Scenarios;

public sealed record ScenarioDefinition(
    string Id,
    string Name,
    string Description,
    string[] Signals,
    int DefaultCount,
    string DashboardPath);

public sealed record ScenarioRunResult(
    string ScenarioId,
    DateTimeOffset StartedAt,
    DateTimeOffset CompletedAt,
    int MetricObservations,
    int ApplicationTransactions,
    int MethodologyRequests,
    int LogEvents,
    int TraceCount,
    int OrdersCreated,
    IReadOnlyList<string> TraceIds);
