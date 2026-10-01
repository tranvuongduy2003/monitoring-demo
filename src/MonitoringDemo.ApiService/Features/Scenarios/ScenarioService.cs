using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Domain.Entities;
using MonitoringDemo.ApiService.Features.ApplicationMonitoring;
using MonitoringDemo.ApiService.Features.Metrics;
using MonitoringDemo.ApiService.Features.MonitoringMethodologies;
using MonitoringDemo.ApiService.Features.Tracing;
using MonitoringDemo.ApiService.Infrastructure.Observability;
using MonitoringDemo.ApiService.Infrastructure.Persistence;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Scenarios;

public sealed class ScenarioService(
    AppDbContext dbContext,
    AppMetrics appMetrics,
    MetricsDemoSeeder metricsSeeder,
    ApplicationMonitoringSeeder applicationSeeder,
    MonitoringMethodologySeeder methodologySeeder,
    TracingDemoSeeder tracingSeeder,
    LearningTelemetry learningTelemetry,
    AppActivitySource activitySource,
    ILogger<ScenarioService> logger)
{
    public static IReadOnlyList<ScenarioDefinition> Catalog { get; } =
    [
        new("steady-orders", "Steady order traffic", "Create realistic order records with healthy metrics, structured logs, and request traces.", ["Metrics", "Logs", "Traces", "Database"], 60, "/d/aspnet-dashboard"),
        new("traffic-spike", "Traffic spike", "Generate a short burst with elevated utilization, saturation, and latency.", ["Metrics", "Logs", "Traces"], 300, "/d/monitoring-methodologies"),
        new("dependency-outage", "Dependency outage", "Emit failed dependency calls, server errors, slow traces, and error logs.", ["Metrics", "Logs", "Traces"], 240, "/d/application-monitoring"),
        new("cache-pressure", "Cache pressure", "Lower the cache hit ratio and raise request latency and queue depth.", ["Metrics", "Logs", "Traces"], 240, "/d/application-monitoring"),
        new("trace-storm", "Trace storm", "Export dense multi-hop traces for propagation and waterfall investigations.", ["Traces", "Logs"], 30, "/a/grafana-exploretraces-app/explore?var-ds=tempo")
    ];

    public async Task<ScenarioRunResult?> RunAsync(string scenarioId, int? requestedCount, CancellationToken cancellationToken)
    {
        var definition = Catalog.FirstOrDefault(item => item.Id == scenarioId);
        if (definition is null) return null;

        int count = Math.Clamp(requestedCount ?? definition.DefaultCount, 1, 1_000);
        var startedAt = DateTimeOffset.UtcNow;
        var totals = new RunTotals();

        using var activity = activitySource.Source.StartActivity("RunObservabilityScenario", ActivityKind.Internal);
        activity?.SetTag("scenario.id", scenarioId);
        activity?.SetTag("scenario.requested_count", count);

        switch (scenarioId)
        {
            case "steady-orders":
                totals.OrdersCreated = await CreateOrdersAsync(count, 0.04, scenarioId, cancellationToken);
                totals.MetricObservations = metricsSeeder.Seed(count);
                totals.ApplicationTransactions = applicationSeeder.Seed("healthy", count);
                totals.TraceIds = tracingSeeder.Seed(Math.Clamp(count / 6, 3, 30)).TraceIds;
                totals.LogEvents = EmitLogs(scenarioId, Math.Clamp(count / 3, 8, 80), 0.04);
                break;
            case "traffic-spike":
                totals.OrdersCreated = await CreateOrdersAsync(Math.Clamp(count / 5, 10, 100), 0.08, scenarioId, cancellationToken);
                totals.MetricObservations = metricsSeeder.Seed(count);
                totals.ApplicationTransactions = applicationSeeder.Seed("healthy", count);
                totals.MethodologyRequests = methodologySeeder.Seed("traffic-spike", count);
                totals.TraceIds = tracingSeeder.Seed(Math.Clamp(count / 20, 5, 40)).TraceIds;
                totals.LogEvents = EmitLogs(scenarioId, Math.Clamp(count / 5, 12, 100), 0.08);
                break;
            case "dependency-outage":
                totals.MetricObservations = metricsSeeder.Seed(count);
                totals.ApplicationTransactions = applicationSeeder.Seed("dependency-outage", count);
                totals.MethodologyRequests = methodologySeeder.Seed("failure-burst", count);
                totals.TraceIds = tracingSeeder.Seed(Math.Clamp(count / 12, 8, 50)).TraceIds;
                totals.LogEvents = EmitLogs(scenarioId, Math.Clamp(count / 3, 20, 120), 0.45);
                break;
            case "cache-pressure":
                totals.MetricObservations = metricsSeeder.Seed(count);
                totals.ApplicationTransactions = applicationSeeder.Seed("cache-pressure", count);
                totals.MethodologyRequests = methodologySeeder.Seed("traffic-spike", count);
                totals.TraceIds = tracingSeeder.Seed(Math.Clamp(count / 18, 5, 40)).TraceIds;
                totals.LogEvents = EmitLogs(scenarioId, Math.Clamp(count / 4, 15, 100), 0.18);
                break;
            case "trace-storm":
                totals.TraceIds = tracingSeeder.Seed(Math.Clamp(count, 1, 50)).TraceIds;
                totals.LogEvents = EmitLogs(scenarioId, Math.Clamp(count * 2, 10, 100), 0.12);
                break;
        }

        learningTelemetry.SeedForScenario(scenarioId, Math.Clamp(count / 2, 12, 120));

        logger.LogInformation(
            "Observability scenario {ScenarioId} completed with {MetricCount} metric observations, {LogCount} logs, and {TraceCount} traces",
            scenarioId, totals.MetricObservations + totals.ApplicationTransactions + totals.MethodologyRequests, totals.LogEvents, totals.TraceIds.Count);

        return new(
            scenarioId,
            startedAt,
            DateTimeOffset.UtcNow,
            totals.MetricObservations,
            totals.ApplicationTransactions,
            totals.MethodologyRequests,
            totals.LogEvents,
            totals.TraceIds.Count,
            totals.OrdersCreated,
            totals.TraceIds);
    }

    private async Task<int> CreateOrdersAsync(int count, double failureRate, string scenarioId, CancellationToken cancellationToken)
    {
        var products = await dbContext.Products.AsNoTracking().ToArrayAsync(cancellationToken);
        if (products.Length == 0) return 0;

        var random = new Random(HashCode.Combine(DateTime.UtcNow.Ticks, scenarioId));
        var orders = new List<Order>(count);
        for (int index = 0; index < count; index++)
        {
            var product = products[random.Next(products.Length)];
            bool failed = random.NextDouble() < failureRate;
            double duration = failed ? random.Next(500, 1_800) : random.Next(25, 280);
            string status = failed ? OrderStatuses.Failed : OrderStatuses.Completed;

            using var span = activitySource.Source.StartActivity("ScenarioOrder", ActivityKind.Internal);
            span?.SetTag("scenario.id", scenarioId);
            span?.SetTag("product.category", product.Category);
            span?.SetTag("order.status", status);
            span?.SetStatus(failed ? ActivityStatusCode.Error : ActivityStatusCode.Ok);

            int quantity = random.Next(1, 5);
            orders.Add(new Order
            {
                ProductId = product.Id,
                Quantity = quantity,
                Total = product.Price * quantity,
                Status = status,
                CreatedAt = DateTime.UtcNow
            });
            appMetrics.RecordOrderProcessed(duration, status, product.Category, "scenario");
        }

        dbContext.Orders.AddRange(orders);
        await dbContext.SaveChangesAsync(cancellationToken);
        return orders.Count;
    }

    private int EmitLogs(string scenarioId, int count, double errorRate)
    {
        var random = new Random(HashCode.Combine(Environment.TickCount64, scenarioId));
        for (int index = 0; index < count; index++)
        {
            using var span = activitySource.Source.StartActivity("ScenarioLogEvent", ActivityKind.Internal);
            string correlationId = $"{scenarioId}-{Guid.NewGuid():N}";
            bool failed = random.NextDouble() < errorRate;
            using var scope = logger.BeginApplicationScope(new ApplicationLogScope
            {
                EventName = failed ? "scenario_failure" : "scenario_activity",
                CorrelationId = correlationId,
                TraceId = span?.TraceId.ToString(),
                SpanId = span?.SpanId.ToString(),
                Scenario = scenarioId,
                SeedData = true
            });
            if (failed)
            {
                span?.SetStatus(ActivityStatusCode.Error, "Synthetic scenario failure");
                logger.LogError("Scenario {ScenarioId} emitted a synthetic failure for operation {Operation}", scenarioId, index + 1);
            }
            else
            {
                logger.LogInformation("Scenario {ScenarioId} completed synthetic operation {Operation}", scenarioId, index + 1);
            }
        }
        return count;
    }

    private sealed class RunTotals
    {
        public int MetricObservations { get; set; }
        public int ApplicationTransactions { get; set; }
        public int MethodologyRequests { get; set; }
        public int LogEvents { get; set; }
        public int OrdersCreated { get; set; }
        public IReadOnlyList<string> TraceIds { get; set; } = [];
    }
}
