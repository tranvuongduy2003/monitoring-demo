using System.Diagnostics;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public sealed class LoggingSeedService : BackgroundService
{
    private static readonly string[] Regions = ["ap-southeast", "eu-west", "us-east"];
    private static readonly LogLevel[] Levels =
    [
        LogLevel.Trace,
        LogLevel.Debug,
        LogLevel.Information,
        LogLevel.Information,
        LogLevel.Information,
        LogLevel.Warning,
        LogLevel.Error,
        LogLevel.Critical
    ];

    private readonly ILogger<LoggingSeedService> _logger;
    private readonly AppActivitySource _activitySource;

    public LoggingSeedService(
        ILogger<LoggingSeedService> logger,
        AppActivitySource activitySource)
    {
        _logger = logger;
        _activitySource = activitySource;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            EmitSeedLogs();
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal application shutdown; a cancelled demo seed must not fail the host.
        }
        catch (Exception exception)
        {
            _logger.LogError(
                new EventId(2101, "LoggingSeedFailed"),
                exception,
                "Logging seed failed; the application will continue running");
        }
    }

    private void EmitSeedLogs()
    {
        for (var index = 1; index <= 24; index++)
        {
            using var activity = _activitySource.Source.StartActivity("SeedLogEvent", ActivityKind.Internal);
            var level = Levels[(index - 1) % Levels.Length];
            var correlationId = $"seed-correlation-{((index - 1) / 3) + 1:00}";
            var requestId = $"seed-request-{index:00}";
            var durationMs = 35 + (index * 47 % 970);
            var orderId = 10_000 + index;

            activity?.SetTag("demo.seed", true);
            activity?.SetTag("order.id", orderId);
            activity?.SetTag("correlation.id", correlationId);

            using var scope = _logger.BeginScope(new Dictionary<string, object?>
            {
                ["correlation_id"] = correlationId,
                ["request_id"] = requestId,
                ["trace_id"] = activity?.TraceId.ToString(),
                ["span_id"] = activity?.SpanId.ToString(),
                ["region"] = Regions[index % Regions.Length],
                ["tenant_id"] = $"tenant-{(index % 4) + 1}",
                ["event_name"] = "seed_order_processed",
                ["seed_data"] = true
            });

            _logger.Log(
                level,
                new EventId(2000 + index, "SeedOrderProcessed"),
                "Seed order {order_id} finished with {order_status} in {duration_ms} ms",
                orderId,
                level >= LogLevel.Error ? "failed" : "completed",
                durationMs);

            if (index % 8 == 0)
            {
                try
                {
                    throw new TimeoutException($"Seeded payment provider timeout for order {orderId}.");
                }
                catch (TimeoutException exception)
                {
                    _logger.LogError(
                        new EventId(2099, "SeedPaymentException"),
                        exception,
                        "Payment exception captured for order {order_id}; retry {retry_count}",
                        orderId,
                        2);
                }
            }
        }

        _logger.LogInformation(
            new EventId(2100, "LoggingSeedComplete"),
            "Logging seed completed with {seed_event_count} base events and {exception_event_count} exception events",
            24,
            3);
    }
}
