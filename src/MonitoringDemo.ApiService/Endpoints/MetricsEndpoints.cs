using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Endpoints;

public static class MetricsEndpoints
{
    public static void MapMetricsEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/metrics");

        group.MapGet("/analytics", (int? minutes, AppMetrics metrics) =>
        {
            int windowMinutes = Math.Clamp(minutes ?? 60, 5, 240);
            var snapshot = metrics.GetSnapshot(windowMinutes);

            return Results.Ok(new
            {
                snapshot.WindowMinutes,
                snapshot.From,
                snapshot.To,
                counter = new
                {
                    name = "orders_created_total",
                    value = snapshot.CounterValue,
                    failedValue = snapshot.FailedCounterValue,
                    description = "Monotonic process-lifetime totals; use rate() to graph change over time."
                },
                gauge = new
                {
                    name = "active_orders",
                    value = snapshot.GaugeValue,
                    description = "A point-in-time value that may move up or down."
                },
                histogram = new
                {
                    name = "order_processing_duration_ms",
                    snapshot.Buckets,
                    snapshot.Summary.Count,
                    snapshot.Summary.Sum
                },
                summary = snapshot.Summary,
                snapshot.TimeSeries,
                snapshot.Cardinality,
                labels = new[]
                {
                    new { name = "order.status", boundedValues = "Completed, Failed" },
                    new { name = "product.category", boundedValues = "5 seeded categories" },
                    new { name = "traffic.source", boundedValues = "api, simulator, seed" }
                },
                queries = QueryCatalog
            });
        });

        group.MapPost("/seed", (int? count, MetricsDemoSeeder seeder) =>
        {
            int observationCount = Math.Clamp(count ?? 120, 1, 1_000);
            var snapshot = seeder.Seed(observationCount);
            return Results.Ok(new
            {
                seeded = observationCount,
                snapshot.CounterValue,
                snapshot.Summary,
                snapshot.Cardinality
            });
        });
    }

    private static readonly object[] QueryCatalog =
    [
        new
        {
            title = "Counter rate",
            query = "sum(rate(orders_created_total[5m])) by (order_status)",
            purpose = "Orders per second, split by a bounded label."
        },
        new
        {
            title = "Gauge",
            query = "active_orders",
            purpose = "Current in-flight work; do not apply rate()."
        },
        new
        {
            title = "Histogram average",
            query = "sum(rate(order_processing_duration_ms_sum[5m])) / sum(rate(order_processing_duration_ms_count[5m]))",
            purpose = "Mean duration derived from histogram sum and count."
        },
        new
        {
            title = "p95 from buckets",
            query = "histogram_quantile(0.95, sum(rate(order_processing_duration_ms_bucket[5m])) by (le))",
            purpose = "Server-side percentile that remains aggregatable across instances."
        },
        new
        {
            title = "Series cardinality",
            query = "count(count by (order_status, product_category, traffic_source) (orders_created_total))",
            purpose = "Count the distinct label combinations for this metric."
        }
    ];
}
