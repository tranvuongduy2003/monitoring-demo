using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Models;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public class BackgroundOrderSimulator : BackgroundService
{
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
                var delay = TimeSpan.FromSeconds(Random.Shared.Next(2, 6));
                await Task.Delay(delay, stoppingToken);

                await SimulateOrderAsync(stoppingToken);
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in background order simulator");
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

        using var logScope = _logger.BeginScope(new Dictionary<string, object?>
        {
            ["correlation_id"] = $"sim-{Guid.NewGuid():N}",
            ["request_id"] = $"background-{Guid.NewGuid():N}",
            ["trace_id"] = activity?.TraceId.ToString(),
            ["span_id"] = activity?.SpanId.ToString(),
            ["event_name"] = "background_order_processed",
            ["product_id"] = product.Id,
            ["product_category"] = product.Category,
            ["worker"] = nameof(BackgroundOrderSimulator)
        });

        _metrics.ActiveOrders.Add(1);
        try
        {
            var quantity = Random.Shared.Next(1, 5);
            bool isFailed = Random.Shared.NextDouble() < 0.10;
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
            var processingDelay = Random.Shared.NextDouble() < 0.20 ? Random.Shared.Next(500, 1500) : Random.Shared.Next(50, 200);
            await Task.Delay(processingDelay, stoppingToken);

            await dbContext.SaveChangesAsync(stoppingToken);

            sw.Stop();
            var metricTags = new TagList
            {
                { "order.status", status },
                { "product.category", product.Category }
            };
            _metrics.OrderProcessingDuration.Record(sw.ElapsedMilliseconds, metricTags);
            _metrics.OrdersCreated.Add(1, metricTags);

            activity?.SetTag("product.name", product.Name);
            activity?.SetTag("order.id", order.Id);
            activity?.SetTag("order.status", order.Status);
            activity?.SetTag("order.total", order.Total);

            if (isFailed)
            {
                _metrics.OrdersFailed.Add(1, metricTags);
                _logger.LogError(
                    new EventId(5002, "SimulatedOrderFailed"),
                    "Simulated order {order_id} failed for product {product_name} in {duration_ms} ms",
                    order.Id,
                    product.Name,
                    sw.ElapsedMilliseconds);
            }
            else if (sw.ElapsedMilliseconds > 500)
            {
                _logger.LogWarning(
                    new EventId(5001, "SimulatedOrderSlow"),
                    "Simulated order {order_id} processed slowly in {duration_ms} ms for product {product_name}",
                    order.Id,
                    sw.ElapsedMilliseconds,
                    product.Name);
            }
            else
            {
                _logger.LogInformation(
                    new EventId(5000, "SimulatedOrderCompleted"),
                    "Simulated order {order_id} processed successfully for product {product_name} in {duration_ms} ms",
                    order.Id,
                    product.Name,
                    sw.ElapsedMilliseconds);
            }
        }
        finally
        {
            _metrics.ActiveOrders.Add(-1);
        }
    }
}
