namespace MonitoringDemo.ApiService.Features.Products;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/products").WithTags("Products");

        group.MapGet("/", async (
            IProductService products,
            CancellationToken cancellationToken) =>
            Results.Ok(await products.GetAllAsync(cancellationToken)));

        group.MapGet("/{id:int}", async (
            int id,
            IProductService products,
            CancellationToken cancellationToken) =>
        {
            var product = await products.FindAsync(id, cancellationToken);
            return product is null ? Results.NotFound() : Results.Ok(product);
        });
    }
}
