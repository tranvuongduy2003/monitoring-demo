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

        group.MapPost("/alerting/seed", (
            string? scenario,
            int? count,
            FundamentalAlertingService alerting) =>
            Results.Ok(alerting.Seed(scenario, count ?? 90)));

        group.MapPost("/alerting/notifications", async (
            HttpRequest request,
            FundamentalAlertingService alerting) =>
        {
            using var reader = new StreamReader(request.Body);
            string payload = await reader.ReadToEndAsync();
            string summary = payload.Length > 160 ? $"{payload[..160]}…" : payload;
            alerting.RecordWebhookNotification(summary);
            return Results.Accepted();
        });
    }
}
