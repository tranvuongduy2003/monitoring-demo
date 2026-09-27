using MonitoringDemo.ApiService.Services;

namespace MonitoringDemo.ApiService.Endpoints;

public static class PrometheusEndpoints
{
    public static void MapPrometheusEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/prometheus");

        group.MapGet("/overview", async (
            int? minutes,
            PrometheusQueryService prometheus,
            CancellationToken cancellationToken) =>
        {
            int windowMinutes = Math.Clamp(minutes ?? 60, 5, 360);
            return Results.Ok(await prometheus.GetOverviewAsync(windowMinutes, cancellationToken));
        });

        group.MapGet("/fundamentals", async (
            PrometheusQueryService prometheus,
            CancellationToken cancellationToken) =>
            Results.Ok(await prometheus.GetFundamentalsAsync(cancellationToken)));
    }
}
