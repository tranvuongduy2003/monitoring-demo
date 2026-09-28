namespace MonitoringDemo.ApiService.Features.Tracing;

public static class TracingEndpoints
{
    private const int DefaultAnalyticsWindowMinutes = 60;
    private const int DefaultSeedCount = 12;

    public static void MapTracingEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/tracing");

        group.MapGet("/overview", async (
            int? minutes,
            ITempoQueryService tempo,
            CancellationToken cancellationToken) =>
            Results.Ok(await tempo.GetOverviewAsync(
                minutes ?? DefaultAnalyticsWindowMinutes,
                cancellationToken)));

        group.MapPost("/seed", (int? count, TracingDemoSeeder seeder) =>
        {
            var result = seeder.Seed(count ?? DefaultSeedCount);
            return Results.Ok(new
            {
                seeded = result.Requested,
                exported = result.TraceIds.Count,
                traceIds = result.TraceIds,
                message = "Context-propagation traces were exported through OpenTelemetry. Tempo search usually indexes them within a few seconds."
            });
        });
    }
}
