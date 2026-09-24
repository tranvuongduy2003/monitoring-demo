using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Endpoints;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/products");

        group.MapGet("/", async (AppDbContext dbContext, AppActivitySource activitySource) =>
        {
            using var activity = activitySource.Source.StartActivity("GetProducts");
            var products = await dbContext.Products.ToListAsync();
            activity?.SetTag("products.count", products.Count);
            return Results.Ok(products);
        });

        group.MapGet("/{id}", async (int id, AppDbContext dbContext) =>
        {
            var product = await dbContext.Products.FindAsync(id);
            return product is not null ? Results.Ok(product) : Results.NotFound();
        });
    }
}
