namespace MonitoringDemo.ApiService.Features.Scenarios;

public static class ScenarioEndpoints
{
    public static void MapScenarioEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/scenarios").WithTags("Observability scenarios");
        group.MapGet("", () => Results.Ok(ScenarioService.Catalog));
        group.MapPost("/{scenarioId}", async (
            string scenarioId,
            int? count,
            ScenarioService scenarios,
            CancellationToken cancellationToken) =>
        {
            var result = await scenarios.RunAsync(scenarioId, count, cancellationToken);
            return result is null
                ? Results.NotFound(new { error = $"Unknown scenario '{scenarioId}'." })
                : Results.Ok(result);
        });

        routes.MapPost("/api/grafana/alerting/notifications", (LearningTelemetry telemetry) =>
        {
            telemetry.RecordNotification();
            return Results.Accepted();
        });
    }
}
