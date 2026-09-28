using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Endpoints;

public static class MonitoringMethodologyEndpoints
{
    public static void MapMonitoringMethodologyEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/methodologies");

        group.MapGet("/analytics", (int? minutes, MonitoringMethodologyMetrics metrics) =>
        {
            int windowMinutes = Math.Clamp(minutes ?? 60, 5, 240);
            var snapshot = metrics.GetSnapshot(windowMinutes);
            return Results.Ok(new
            {
                snapshot.WindowMinutes,
                snapshot.From,
                snapshot.To,
                snapshot.Red,
                snapshot.Use,
                snapshot.GoldenSignals,
                snapshot.TimeSeries,
                snapshot.Scenarios,
                queries = QueryCatalog
            });
        });

        group.MapPost("/seed", (
            string? scenario,
            int? count,
            MonitoringMethodologySeeder seeder) =>
        {
            string normalizedScenario = MonitoringMethodologySeeder.NormalizeScenario(scenario);
            int requestCount = Math.Clamp(count ?? 360, 10, 2_000);
            var snapshot = seeder.Seed(normalizedScenario, requestCount);
            return Results.Ok(new
            {
                scenario = normalizedScenario,
                seededRequests = requestCount,
                snapshot.Red,
                snapshot.GoldenSignals
            });
        });
    }

    private static readonly object[] QueryCatalog =
    [
        new
        {
            methodology = "RED",
            title = "Rate",
            query = "sum(rate(methodology_service_requests_total[5m]))",
            purpose = "Requests per second across service operations."
        },
        new
        {
            methodology = "RED",
            title = "Errors",
            query = "sum(rate(methodology_service_request_errors_total[5m])) / clamp_min(sum(rate(methodology_service_requests_total[5m])), 0.001)",
            purpose = "The fraction of requests ending in error."
        },
        new
        {
            methodology = "RED",
            title = "Duration",
            query = "histogram_quantile(0.95, sum by (le) (rate(methodology_service_request_duration_ms_bucket[5m])))",
            purpose = "The p95 service latency from histogram buckets."
        },
        new
        {
            methodology = "USE",
            title = "Utilization",
            query = "methodology_resource_utilization_ratio * 100",
            purpose = "The percentage of each resource actively in use."
        },
        new
        {
            methodology = "USE",
            title = "Saturation",
            query = "methodology_resource_saturation_ratio * 100",
            purpose = "Queued or constrained work for each resource."
        },
        new
        {
            methodology = "USE",
            title = "Errors",
            query = "sum by (resource) (increase(methodology_resource_errors_total[5m]))",
            purpose = "Resource-level failures during the selected interval."
        },
        new
        {
            methodology = "Golden Signals",
            title = "Most saturated resource",
            query = "max(methodology_resource_saturation_ratio) * 100",
            purpose = "Pair this capacity-pressure signal with the RED traffic, error, and latency queries above."
        }
    ];
}
