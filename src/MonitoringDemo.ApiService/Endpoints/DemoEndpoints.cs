using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Endpoints;

public static class DemoEndpoints
{
    public static void MapDemoEndpoints(this IEndpointRouteBuilder routes)
    {
        routes.MapDelete("/api/demo/data", async (
            AppDbContext dbContext,
            AppMetrics metrics,
            MetricsDemoSeeder metricsSeeder,
            CancellationToken cancellationToken) =>
        {
            int deletedOrders = await dbContext.Orders.ExecuteDeleteAsync(cancellationToken);
            metrics.ResetAnalytics();
            metricsSeeder.Reset();

            return Results.Ok(new
            {
                deletedOrders,
                clearedMetricAnalytics = true,
                clearedAt = DateTimeOffset.UtcNow
            });
        });
    }
}
