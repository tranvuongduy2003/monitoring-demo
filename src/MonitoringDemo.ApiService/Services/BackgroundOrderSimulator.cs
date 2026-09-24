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
        var product = await dbContext.Products.Skip(skip).FirstOrDefaultAsync(stoppingToken);
        
        if (product == null) return;

        using var activity = _activitySource.Source.StartActivity("SimulateOrder");
        var sw = Stopwatch.StartNew();

        _metrics.ActiveOrders.Add(1);

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
        _metrics.OrderProcessingDuration.Record(sw.ElapsedMilliseconds);
        _metrics.OrdersCreated.Add(1);

        activity?.SetTag("product.name", product.Name);
        activity?.SetTag("order.status", order.Status);
        activity?.SetTag("order.total", order.Total);

        if (isFailed)
        {
            _metrics.OrdersFailed.Add(1);
            _logger.LogError("Simulated order {OrderId} failed to process for product {ProductName}", order.Id, product.Name);
        }
        else if (sw.ElapsedMilliseconds > 500)
        {
            _logger.LogWarning("Simulated order {OrderId} processed slowly ({ElapsedMs}ms) for product {ProductName}", order.Id, sw.ElapsedMilliseconds, product.Name);
        }
        else
        {
            _logger.LogInformation("Simulated order {OrderId} processed successfully for product {ProductName}", order.Id, product.Name);
        }

        _metrics.ActiveOrders.Add(-1);
    }
}
