namespace MonitoringDemo.ApiService.Features.ApplicationMonitoring;

public static class ApplicationMonitoringEndpoints
{
    public static void MapApplicationMonitoringEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/application-monitoring");

        group.MapGet("/analytics", (int? minutes, ApplicationMonitoringMetrics metrics) =>
        {
            int window = Math.Clamp(minutes ?? 60, 5, 240);
            var snapshot = metrics.GetSnapshot(window);
            return Results.Ok(new
            {
                snapshot.WindowMinutes,
                snapshot.From,
                snapshot.To,
                snapshot.Sections,
                snapshot.TimeSeries,
                snapshot.Cache,
                snapshot.Business,
                snapshot.RecentSpans,
                snapshot.RecentErrors,
                scenarios = ApplicationMonitoringSeeder.SupportedScenarios,
                queries = QueryCatalog
            });
        });

        group.MapPost("/seed", (string? scenario, int? count, ApplicationMonitoringSeeder seeder) =>
        {
            int transactions = Math.Clamp(count ?? 240, 10, 2_000);
            string normalized = ApplicationMonitoringSeeder.NormalizeScenario(scenario);
            var snapshot = seeder.Seed(normalized, transactions);
            return Results.Ok(new { scenario = normalized, seededTransactions = transactions, snapshot.Sections, snapshot.Cache, snapshot.Business });
        });
    }

    private static readonly object[] QueryCatalog =
    [
        Query("http", "Request rate", "sum by (http_route) (rate(application_http_requests_total[5m]))"),
        Query("http", "p95 response time", "histogram_quantile(0.95, sum by (le, http_route) (rate(application_http_request_duration_ms_bucket[5m])))"),
        Query("database", "Database latency", "histogram_quantile(0.95, sum by (le, db_operation_name) (rate(application_database_operation_duration_ms_bucket[5m])))"),
        Query("cache", "Cache hit ratio", "sum(rate(application_cache_operations_total{cache_outcome=\"hit\"}[5m])) / clamp_min(sum(rate(application_cache_operations_total{cache_outcome=~\"hit|miss\"}[5m])), 0.001)"),
        Query("dependency", "Dependency failures", "sum by (server_address) (rate(application_dependency_call_errors_total[5m]))"),
        Query("custom-metric", "Business throughput", "sum by (business_event) (rate(application_business_events_total[5m]))"),
        Query("custom-span", "Custom span latency", "histogram_quantile(0.95, sum by (le, span_name) (rate(application_custom_span_duration_ms_bucket[5m])))"),
        Query("error", "Application errors", "sum by (error_source, error_type) (rate(application_errors_total[5m]))")
    ];

    private static object Query(string section, string title, string query) => new { section, title, query, purpose = $"Visualize {title.ToLowerInvariant()} for the selected time range." };
}
