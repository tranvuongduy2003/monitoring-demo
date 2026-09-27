using System.Diagnostics;
using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Endpoints;

public static class LoggingEndpoints
{
    public static void MapLoggingEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/logging");

        group.MapGet("/analytics", async (
            int? minutes,
            LokiQueryService loki,
            CancellationToken cancellationToken) =>
            Results.Ok(await loki.GetAnalyticsAsync(minutes ?? 60, cancellationToken)));

        group.MapPost("/demo", (
            HttpContext context,
            string? level,
            bool? includeException,
            ILogger<LoggingDemo> logger,
            AppActivitySource activitySource) =>
        {
            var logLevel = Enum.TryParse<LogLevel>(level, true, out var parsedLevel)
                ? parsedLevel
                : LogLevel.Information;
            var correlationId = context.Response.Headers[Middleware.LogContextMiddleware.CorrelationHeader].ToString();
            var requestId = context.TraceIdentifier;

            using var activity = activitySource.Source.StartActivity("InteractiveLoggingDemo", ActivityKind.Internal);
            using var scope = logger.BeginScope(new Dictionary<string, object?>
            {
                ["correlation_id"] = correlationId,
                ["request_id"] = requestId,
                ["trace_id"] = activity?.TraceId.ToString() ?? Activity.Current?.TraceId.ToString(),
                ["span_id"] = activity?.SpanId.ToString() ?? Activity.Current?.SpanId.ToString(),
                ["event_name"] = "interactive_demo",
                ["tenant_id"] = "learning-lab"
            });

            // Unstructured: readable, but it provides no separately queryable business fields.
            logger.LogInformation("Unstructured demo event: a learner clicked the log generator");

            // Structured: the template and values remain separate attributes in OpenTelemetry/Loki.
            logger.Log(
                logLevel,
                new EventId(3000, "InteractiveDemo"),
                "Interactive {demo_level} event for order {order_id} took {duration_ms} ms",
                logLevel.ToString(),
                42,
                725);

            if (includeException == true)
            {
                try
                {
                    throw new InvalidOperationException("This intentional exception demonstrates stack-trace logging.");
                }
                catch (InvalidOperationException exception)
                {
                    activity?.SetStatus(ActivityStatusCode.Error, exception.Message);
                    logger.LogError(
                        new EventId(3001, "InteractiveException"),
                        exception,
                        "Interactive exception for order {order_id}",
                        42);
                }
            }

            return Results.Ok(new
            {
                message = "Demo logs emitted. Loki ingestion is usually visible within a few seconds.",
                level = logLevel.ToString(),
                correlationId,
                requestId,
                traceId = activity?.TraceId.ToString() ?? Activity.Current?.TraceId.ToString(),
                spanId = activity?.SpanId.ToString() ?? Activity.Current?.SpanId.ToString()
            });
        });
    }

    private sealed class LoggingDemo;
}
