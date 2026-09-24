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

            var product = await dbContext.Products.FindAsync(req.ProductId);
            if (product == null) return Results.NotFound();

            metrics.ActiveOrders.Add(1);

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
            metrics.OrderProcessingDuration.Record(sw.ElapsedMilliseconds);
            metrics.OrdersCreated.Add(1);

            activity?.SetTag("product.name", product.Name);
            activity?.SetTag("order.status", order.Status);
            activity?.SetTag("order.total", order.Total);

            if (isFailed)
            {
                metrics.OrdersFailed.Add(1);
                logger.LogError("Order {OrderId} failed to process for product {ProductName}", order.Id, product.Name);
            }
            else
            {
                logger.LogInformation("Order {OrderId} processed successfully for product {ProductName}", order.Id, product.Name);
            }

            metrics.ActiveOrders.Add(-1);

            return Results.Created($"/api/orders/{order.Id}", order);
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
