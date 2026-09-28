namespace MonitoringDemo.ApiService.Features.Collector;

public static class CollectorEndpoints
{
    public static void MapCollectorEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/collector");
        group.MapGet("/overview", (int? minutes, CollectorLabService lab) => Results.Ok(lab.GetOverview(minutes ?? 60)));
        group.MapPost("/seed", (int? count, CollectorLabService lab) => Results.Ok(lab.Seed(count ?? 150)));
    }
}
