using System.Diagnostics;
using MonitoringDemo.ApiService.Infrastructure.Observability;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Logging;

public sealed class LoggingSeedWorker : BackgroundService
{
    private const int StartupDelaySeconds = 2;
    private const int SeedEventCount = 24;
    private const int EventsPerCorrelation = 3;
    private const int DurationBaseMilliseconds = 35;
    private const int DurationMultiplier = 47;
    private const int DurationModulo = 970;
    private const int OrderIdBase = 10_000;
    private const int TenantCount = 4;
    private const int ExceptionFrequency = 8;
    private const int PaymentRetryCount = 2;

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

    private readonly ILogger<LoggingSeedWorker> _logger;
    private readonly AppActivitySource _activitySource;

    public LoggingSeedWorker(
        ILogger<LoggingSeedWorker> logger,
        AppActivitySource activitySource)
    {
        _logger = logger;
        _activitySource = activitySource;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(StartupDelaySeconds), stoppingToken);
            EmitSeedLogs();
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal application shutdown; a cancelled demo seed must not fail the host.
        }
        catch (Exception exception)
        {
            _logger.LoggingSeedFailed(exception);
        }
    }

    private void EmitSeedLogs()
    {
        for (var index = 1; index <= SeedEventCount; index++)
        {
            using var activity = _activitySource.Source.StartActivity("SeedLogEvent", ActivityKind.Internal);
            var level = Levels[(index - 1) % Levels.Length];
            var correlationId = $"seed-correlation-{((index - 1) / EventsPerCorrelation) + 1:00}";
            var requestId = $"seed-request-{index:00}";
            var durationMs = DurationBaseMilliseconds + (index * DurationMultiplier % DurationModulo);
            var orderId = OrderIdBase + index;

            activity?.SetTag("demo.seed", true);
            activity?.SetTag("order.id", orderId);
            activity?.SetTag("correlation.id", correlationId);

            using var scope = _logger.BeginApplicationScope(new ApplicationLogScope
            {
                EventName = "seed_order_processed",
                CorrelationId = correlationId,
                RequestId = requestId,
                TraceId = activity?.TraceId.ToString(),
                SpanId = activity?.SpanId.ToString(),
                Region = Regions[index % Regions.Length],
                TenantId = $"tenant-{(index % TenantCount) + 1}",
                SeedData = true
            });

            _logger.SeedOrderProcessed(
                level,
                orderId,
                level >= LogLevel.Error ? "failed" : "completed",
                durationMs);

            if (index % ExceptionFrequency == 0)
            {
                try
                {
                    throw new TimeoutException($"Seeded payment provider timeout for order {orderId}.");
                }
                catch (TimeoutException exception)
                {
                    _logger.SeedPaymentException(exception, orderId, PaymentRetryCount);
                }
            }
        }

        _logger.LoggingSeedComplete(
            SeedEventCount,
            SeedEventCount / ExceptionFrequency);
    }
}
