using MonitoringDemo.ApiService.Services;

namespace MonitoringDemo.ApiService.Endpoints;

public static class OpenTelemetryEndpoints
{
    public static void MapOpenTelemetryEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/opentelemetry");

        group.MapGet("/overview", (int? minutes, OpenTelemetryLabService lab) =>
            Results.Ok(lab.GetOverview(minutes ?? 60)));

        group.MapPost("/seed", (int? count, OpenTelemetryLabService lab) =>
            Results.Ok(lab.Seed(count ?? 100)));
    }
}
