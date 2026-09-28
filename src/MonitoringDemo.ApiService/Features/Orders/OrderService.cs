using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Domain.Entities;
using MonitoringDemo.ApiService.Features.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Observability;
using MonitoringDemo.ApiService.Infrastructure.Persistence;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Orders;

public interface IOrderService
{
    Task<IReadOnlyList<Order>> GetRecentAsync(int? limit, CancellationToken cancellationToken);
    Task<OrderCreationResult> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken);
    Task<OrderStatistics> GetStatisticsAsync(CancellationToken cancellationToken);
}

public sealed class OrderService : IOrderService
{
    private const int DefaultOrderLimit = 20;
    private const int MaximumOrderLimit = 100;
    private const int MinimumOrderQuantity = 1;
    private const int MaximumOrderQuantity = 100;
    private const double FailureProbability = 0.05;

    private readonly AppDbContext _dbContext;
    private readonly AppMetrics _metrics;
    private readonly AppActivitySource _activitySource;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        AppDbContext dbContext,
        AppMetrics metrics,
        AppActivitySource activitySource,
        TimeProvider timeProvider,
        ILogger<OrderService> logger)
    {
        _dbContext = dbContext;
        _metrics = metrics;
        _activitySource = activitySource;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<IReadOnlyList<Order>> GetRecentAsync(
        int? limit,
        CancellationToken cancellationToken)
    {
        int take = Math.Clamp(limit ?? DefaultOrderLimit, 1, MaximumOrderLimit);
        return await _dbContext.Orders
            .AsNoTracking()
            .Include(order => order.Product)
            .OrderByDescending(order => order.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<OrderCreationResult> CreateAsync(
        CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        using var activity = _activitySource.Source.StartActivity("CreateOrder");
        var stopwatch = Stopwatch.StartNew();

        if (request.Quantity is < MinimumOrderQuantity or > MaximumOrderQuantity)
        {
            _logger.OrderValidationFailed(
                request.ProductId,
                request.Quantity,
                MinimumOrderQuantity,
                MaximumOrderQuantity);
            return new(
                null,
                OrderCreationError.InvalidQuantity,
                $"Quantity must be between {MinimumOrderQuantity} and {MaximumOrderQuantity}.");
        }

        var product = await _dbContext.Products.FindAsync([request.ProductId], cancellationToken);
        if (product is null)
        {
            _logger.ProductNotFound(request.ProductId);
            return new(null, OrderCreationError.ProductNotFound);
        }

        using var logScope = _logger.BeginApplicationScope(new ApplicationLogScope
        {
            EventName = "order_processed",
            ProductId = product.Id,
            ProductCategory = product.Category
        });

        _metrics.OrderStarted();
        try
        {
            bool failed = Random.Shared.NextDouble() < FailureProbability;
            var order = new Order
            {
                ProductId = product.Id,
                Quantity = request.Quantity,
                Total = product.Price * request.Quantity,
                Status = failed ? OrderStatuses.Failed : OrderStatuses.Completed,
                CreatedAt = _timeProvider.GetUtcNow().UtcDateTime
            };

            _dbContext.Orders.Add(order);
            await _dbContext.SaveChangesAsync(cancellationToken);

            stopwatch.Stop();
            _metrics.RecordOrderProcessed(
                stopwatch.ElapsedMilliseconds,
                order.Status,
                product.Category,
                "api");

            activity?.SetTag("product.name", product.Name);
            activity?.SetTag("order.id", order.Id);
            activity?.SetTag("order.status", order.Status);
            activity?.SetTag("order.total", order.Total);

            if (failed)
            {
                _logger.OrderFailed(order.Id, product.Name, stopwatch.ElapsedMilliseconds);
            }
            else
            {
                _logger.OrderCompleted(order.Id, product.Name, stopwatch.ElapsedMilliseconds);
            }

            return new(order);
        }
        finally
        {
            _metrics.OrderFinished();
        }
    }

    public async Task<OrderStatistics> GetStatisticsAsync(CancellationToken cancellationToken)
    {
        DateTime oneHourAgo = _timeProvider.GetUtcNow().AddHours(-1).UtcDateTime;
        var statistics = await _dbContext.Orders
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalOrders = group.Count(),
                CompletedOrders = group.Count(order => order.Status == OrderStatuses.Completed),
                FailedOrders = group.Count(order => order.Status == OrderStatuses.Failed),
                PendingOrders = group.Count(order => order.Status == OrderStatuses.Pending),
                TotalRevenue = group.Sum(order =>
                    order.Status == OrderStatuses.Completed ? order.Total : 0),
                OrdersLastHour = group.Count(order => order.CreatedAt >= oneHourAgo)
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (statistics is null)
        {
            return new(0, 0, 0, 0, 0, 0, 0);
        }

        return new OrderStatistics(
            statistics.TotalOrders,
            statistics.CompletedOrders,
            statistics.FailedOrders,
            statistics.PendingOrders,
            statistics.TotalRevenue,
            statistics.CompletedOrders == 0
                ? 0
                : statistics.TotalRevenue / statistics.CompletedOrders,
            statistics.OrdersLastHour);
    }
}
