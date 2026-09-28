using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MonitoringDemo.ApiService.Domain.Entities;

namespace MonitoringDemo.ApiService.Infrastructure.Persistence;

public static class SeedData
{
    public static async Task InitializeAsync(
        IServiceProvider serviceProvider,
        CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var timeProvider = scope.ServiceProvider.GetRequiredService<TimeProvider>();

        await context.Database.EnsureCreatedAsync(cancellationToken);

        if (!await context.Products.AnyAsync(cancellationToken))
        {
            var categories = new[] { "Electronics", "Tools", "Software", "Hardware", "Accessories" };
            var products = new List<Product>();
            var random = new Random(20260924);

            for (int i = 1; i <= 20; i++)
            {
                products.Add(new Product
                {
                    Name = $"Product {i}",
                    Category = categories[i % categories.Length],
                    Price = decimal.Round((decimal)(random.NextDouble() * 100 + 10), 2),
                    Stock = random.Next(10, 100)
                });
            }

            await context.Products.AddRangeAsync(products, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }

        if (!await context.Orders.AnyAsync(cancellationToken))
        {
            var products = await context.Products.ToListAsync(cancellationToken);
            var orders = new List<Order>();
            var random = new Random(20260924);

            for (int i = 0; i < 50; i++)
            {
                var product = products[random.Next(products.Count)];
                var quantity = random.Next(1, 6);
                var statusRand = random.Next(100);
                string status = statusRand < 70
                    ? OrderStatuses.Completed
                    : statusRand < 90 ? OrderStatuses.Pending : OrderStatuses.Failed;

                orders.Add(new Order
                {
                    ProductId = product.Id,
                    Quantity = quantity,
                    Total = product.Price * quantity,
                    Status = status,
                    CreatedAt = timeProvider.GetUtcNow().AddHours(-random.Next(0, 24 * 30)).UtcDateTime
                });
            }

            await context.Orders.AddRangeAsync(orders, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
