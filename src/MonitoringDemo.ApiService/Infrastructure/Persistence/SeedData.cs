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

    }
}
