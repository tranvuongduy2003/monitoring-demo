using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Models;
using MonitoringDemo.ApiService.Observability;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public class BackgroundOrderSimulator : BackgroundService
{
    private const int MinimumLoopDelaySeconds = 2;
    private const int MaximumLoopDelaySecondsExclusive = 6;
    private const int MinimumOrderQuantity = 1;
    private const int MaximumOrderQuantityExclusive = 5;
    private const double OrderFailureProbability = 0.10;
    private const double SlowOrderProbability = 0.20;
    private const int MaximumSlowDelayMillisecondsExclusive = 1500;
    private const int MinimumNormalDelayMilliseconds = 50;
    private const int MaximumNormalDelayMillisecondsExclusive = 200;

    private readonly IServiceProvider _serviceProvider;
    private readonly AppMetrics _metrics;
    private readonly AppActivitySource _activitySource;
    private readonly ILogger<BackgroundOrderSimulator> _logger;

    public BackgroundOrderSimulator(
        IServiceProvider serviceProvider, 
        AppMetrics metrics, 
        AppActivitySource activitySource, 
        ILogger<BackgroundOrderSimulator> logger)
    {
        _serviceProvider = serviceProvider;
        _metrics = metrics;
        _activitySource = activitySource;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var delay = TimeSpan.FromSeconds(Random.Shared.Next(
                    MinimumLoopDelaySeconds,
                    MaximumLoopDelaySecondsExclusive));
                await Task.Delay(delay, stoppingToken);

                await SimulateOrderAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.BackgroundOrderSimulationFailed(exception);
            }
        }
    }

    private async Task SimulateOrderAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var productCount = await dbContext.Products.CountAsync(stoppingToken);
        if (productCount == 0) return;

        var skip = Random.Shared.Next(0, productCount);
        var product = await dbContext.Products
            .OrderBy(item => item.Id)
            .Skip(skip)
            .FirstOrDefaultAsync(stoppingToken);
        
        if (product == null) return;

        using var activity = _activitySource.Source.StartActivity("SimulateOrder");
        var sw = Stopwatch.StartNew();

        using var logScope = _logger.BeginApplicationScope(new ApplicationLogScope
        {
            EventName = "background_order_processed",
            CorrelationId = $"sim-{Guid.NewGuid():N}",
            RequestId = $"background-{Guid.NewGuid():N}",
            TraceId = activity?.TraceId.ToString(),
            SpanId = activity?.SpanId.ToString(),
            ProductId = product.Id,
            ProductCategory = product.Category,
            Worker = nameof(BackgroundOrderSimulator)
        });

        _metrics.OrderStarted();
        try
        {
            var quantity = Random.Shared.Next(
                MinimumOrderQuantity,
                MaximumOrderQuantityExclusive);
            bool isFailed = Random.Shared.NextDouble() < OrderFailureProbability;
            string status = isFailed ? "Failed" : "Completed";

            var order = new Order
            {
                ProductId = product.Id,
                Quantity = quantity,
                Total = product.Price * quantity,
                Status = status,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.Orders.Add(order);
            var processingDelay = Random.Shared.NextDouble() < SlowOrderProbability
                ? Random.Shared.Next(
                    TelemetryConstants.SlowOperationThresholdMilliseconds,
                    MaximumSlowDelayMillisecondsExclusive)
                : Random.Shared.Next(
                    MinimumNormalDelayMilliseconds,
                    MaximumNormalDelayMillisecondsExclusive);
            await Task.Delay(processingDelay, stoppingToken);

            await dbContext.SaveChangesAsync(stoppingToken);

            sw.Stop();
            _metrics.RecordOrderProcessed(
                sw.ElapsedMilliseconds,
                status,
                product.Category,
                "simulator");

            activity?.SetTag("product.name", product.Name);
            activity?.SetTag("order.id", order.Id);
            activity?.SetTag("order.status", order.Status);
            activity?.SetTag("order.total", order.Total);

            if (isFailed)
            {
                _logger.SimulatedOrderFailed(order.Id, product.Name, sw.ElapsedMilliseconds);
            }
            else if (sw.ElapsedMilliseconds > TelemetryConstants.SlowOperationThresholdMilliseconds)
            {
                _logger.SimulatedOrderSlow(order.Id, sw.ElapsedMilliseconds, product.Name);
            }
            else
            {
                _logger.SimulatedOrderCompleted(order.Id, product.Name, sw.ElapsedMilliseconds);
            }
        }
        finally
        {
            _metrics.OrderFinished();
        }
    }
}
