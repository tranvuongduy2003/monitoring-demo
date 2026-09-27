using System.Diagnostics;
using MonitoringDemo.ApiService.Observability;
using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Endpoints;

public static class LoggingEndpoints
{
    private const int DefaultAnalyticsWindowMinutes = 60;
    private const int DemoOrderId = 42;
    private const long DemoDurationMilliseconds = 725;

    public static void MapLoggingEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/logging");

        group.MapGet("/analytics", async (
            int? minutes,
            LokiQueryService loki,
            CancellationToken cancellationToken) =>
            Results.Ok(await loki.GetAnalyticsAsync(
                minutes ?? DefaultAnalyticsWindowMinutes,
                cancellationToken)));

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
            using var scope = logger.BeginApplicationScope(new ApplicationLogScope
            {
                EventName = "interactive_demo",
                CorrelationId = correlationId,
                RequestId = requestId,
                TraceId = activity?.TraceId.ToString() ?? Activity.Current?.TraceId.ToString(),
                SpanId = activity?.SpanId.ToString() ?? Activity.Current?.SpanId.ToString(),
                TenantId = "learning-lab"
            });

            // Narrative-only: readable, but it provides no separately queryable business fields.
            logger.InteractiveDemoRequested();

            // Structured: the template and values remain separate attributes in OpenTelemetry/Loki.
            logger.InteractiveDemo(
                logLevel,
                logLevel.ToString(),
                DemoOrderId,
                DemoDurationMilliseconds);

            if (includeException == true)
            {
                try
                {
                    throw new InvalidOperationException("This intentional exception demonstrates stack-trace logging.");
                }
                catch (InvalidOperationException exception)
                {
                    activity?.SetStatus(ActivityStatusCode.Error, exception.Message);
                    logger.InteractiveException(exception, DemoOrderId);
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
