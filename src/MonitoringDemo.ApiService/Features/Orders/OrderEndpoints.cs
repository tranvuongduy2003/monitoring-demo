namespace MonitoringDemo.ApiService.Features.Orders;

public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/orders").WithTags("Orders");

        group.MapGet("/", async (
            int? limit,
            IOrderService orders,
            CancellationToken cancellationToken) =>
            Results.Ok(await orders.GetRecentAsync(limit, cancellationToken)));

        group.MapPost("/", async (
            CreateOrderRequest request,
            IOrderService orders,
            CancellationToken cancellationToken) =>
        {
            var result = await orders.CreateAsync(request, cancellationToken);
            return result.Error switch
            {
                OrderCreationError.InvalidQuantity => Results.BadRequest(new { error = result.Message }),
                OrderCreationError.ProductNotFound => Results.NotFound(),
                _ => Results.Created($"/api/orders/{result.Order!.Id}", result.Order)
            };
        });

        group.MapGet("/stats", async (
            IOrderService orders,
            CancellationToken cancellationToken) =>
            Results.Ok(await orders.GetStatisticsAsync(cancellationToken)));
    }
}
