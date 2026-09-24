using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MonitoringDemo.ApiService.Models;

namespace MonitoringDemo.ApiService.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await context.Database.EnsureCreatedAsync();

        if (!await context.Products.AnyAsync())
        {
            var categories = new[] { "Electronics", "Tools", "Software", "Hardware", "Accessories" };
            var products = new List<Product>();
            
            for (int i = 1; i <= 20; i++)
            {
                products.Add(new Product
                {
                    Name = $"Product {i}",
                    Category = categories[i % categories.Length],
                    Price = (decimal)(Random.Shared.NextDouble() * 100 + 10),
                    Stock = Random.Shared.Next(10, 100)
                });
            }
            
            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();
        }

        if (!await context.Orders.AnyAsync())
        {
            var products = await context.Products.ToListAsync();
            var orders = new List<Order>();
            
            for (int i = 0; i < 50; i++)
            {
                var product = products[Random.Shared.Next(products.Count)];
                var quantity = Random.Shared.Next(1, 6);
                var statusRand = Random.Shared.Next(100);
                string status = statusRand < 70 ? "Completed" : (statusRand < 90 ? "Pending" : "Failed");
                
                orders.Add(new Order
                {
                    ProductId = product.Id,
                    Quantity = quantity,
                    Total = product.Price * quantity,
                    Status = status,
                    CreatedAt = DateTime.UtcNow.AddDays(-Random.Shared.Next(0, 30)).AddHours(-Random.Shared.Next(0, 24))
                });
            }
            
            await context.Orders.AddRangeAsync(orders);
            await context.SaveChangesAsync();
        }
    }
}
