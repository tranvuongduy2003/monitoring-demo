using MonitoringDemo.ApiService.Services;

namespace MonitoringDemo.ApiService.Endpoints;

public static class GrafanaEndpoints
{
    public static void MapGrafanaEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/grafana");

        group.MapGet("/overview", (int? minutes, GrafanaLabService lab) =>
            Results.Ok(lab.GetOverview(minutes ?? 60)));

        group.MapPost("/seed", (int? count, GrafanaLabService lab) =>
            Results.Ok(lab.Seed(count ?? 180)));

        group.MapPost("/correlation/seed", (int? count, GrafanaLabService lab) =>
            Results.Ok(lab.SeedCorrelations(count ?? 24)));
    }
}
