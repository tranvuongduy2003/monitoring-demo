using MonitoringDemo.ApiService.Services;

namespace MonitoringDemo.ApiService.Endpoints;

public static class OtlpEndpoints
{
    public static void MapOtlpEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/otlp");

        group.MapGet("/overview", (int? minutes, OtlpLabService lab) =>
            Results.Ok(lab.GetOverview(minutes ?? 60)));

        group.MapPost("/seed", (int? count, OtlpLabService lab) =>
            Results.Ok(lab.Seed(count ?? 120)));
    }
}
