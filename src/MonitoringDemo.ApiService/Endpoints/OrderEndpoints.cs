using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Models;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Endpoints;

public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/orders");

        group.MapGet("/", async (AppDbContext dbContext, int? limit) =>
        {
            int take = limit ?? 20;
            var orders = await dbContext.Orders
                .Include(o => o.Product)
                .OrderByDescending(o => o.CreatedAt)
                .Take(take)
                .ToListAsync();
            return Results.Ok(orders);
        });

        group.MapPost("/", async (OrderRequest req, AppDbContext dbContext, AppMetrics metrics, AppActivitySource activitySource, ILogger<Order> logger) =>
        {
            using var activity = activitySource.Source.StartActivity("CreateOrder");
            var sw = Stopwatch.StartNew();

            if (req.Quantity is < 1 or > 100)
            {
                logger.LogWarning(
                    new EventId(4001, "OrderValidationFailed"),
                    "Order validation failed for product {product_id}: quantity {quantity} is outside 1-100",
                    req.ProductId,
                    req.Quantity);
                return Results.BadRequest(new { error = "Quantity must be between 1 and 100." });
            }

            var product = await dbContext.Products.FindAsync(req.ProductId);
            if (product == null)
            {
                logger.LogWarning(
                    new EventId(4002, "ProductNotFound"),
                    "Order rejected because product {product_id} was not found",
                    req.ProductId);
                return Results.NotFound();
            }

            using var logScope = logger.BeginScope(new Dictionary<string, object?>
            {
                ["event_name"] = "order_processed",
                ["product_id"] = product.Id,
                ["product_category"] = product.Category
            });

            metrics.ActiveOrders.Add(1);
            try
            {
                bool isFailed = Random.Shared.NextDouble() < 0.05;
                string status = isFailed ? "Failed" : "Completed";

                var order = new Order
                {
                    ProductId = product.Id,
                    Quantity = req.Quantity,
                    Total = product.Price * req.Quantity,
                    Status = status,
                    CreatedAt = DateTime.UtcNow
                };

                dbContext.Orders.Add(order);
                await dbContext.SaveChangesAsync();

                sw.Stop();
                var metricTags = new TagList
                {
                    { "order.status", status },
                    { "product.category", product.Category }
                };
                metrics.OrderProcessingDuration.Record(sw.ElapsedMilliseconds, metricTags);
                metrics.OrdersCreated.Add(1, metricTags);

                activity?.SetTag("product.name", product.Name);
                activity?.SetTag("order.id", order.Id);
                activity?.SetTag("order.status", order.Status);
                activity?.SetTag("order.total", order.Total);

                if (isFailed)
                {
                    metrics.OrdersFailed.Add(1, metricTags);
                    logger.LogError(
                        new EventId(4004, "OrderFailed"),
                        "Order {order_id} failed to process for product {product_name} in {duration_ms} ms",
                        order.Id,
                        product.Name,
                        sw.ElapsedMilliseconds);
                }
                else
                {
                    logger.LogInformation(
                        new EventId(4003, "OrderCompleted"),
                        "Order {order_id} processed successfully for product {product_name} in {duration_ms} ms",
                        order.Id,
                        product.Name,
                        sw.ElapsedMilliseconds);
                }

                return Results.Created($"/api/orders/{order.Id}", order);
            }
            finally
            {
                metrics.ActiveOrders.Add(-1);
            }
        });

        group.MapGet("/stats", async (AppDbContext dbContext) =>
        {
            var totalOrders = await dbContext.Orders.CountAsync();
            var completedOrders = await dbContext.Orders.CountAsync(o => o.Status == "Completed");
            var failedOrders = await dbContext.Orders.CountAsync(o => o.Status == "Failed");
            var pendingOrders = await dbContext.Orders.CountAsync(o => o.Status == "Pending");
            var totalRevenue = await dbContext.Orders.Where(o => o.Status == "Completed").SumAsync(o => o.Total);
            var averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
            
            var oneHourAgo = DateTime.UtcNow.AddHours(-1);
            var ordersLastHour = await dbContext.Orders.CountAsync(o => o.CreatedAt >= oneHourAgo);

            return Results.Ok(new
            {
                totalOrders,
                completedOrders,
                failedOrders,
                pendingOrders,
                totalRevenue,
                averageOrderValue,
                ordersLastHour
            });
        });
    }

    public record OrderRequest(int ProductId, int Quantity);
}
