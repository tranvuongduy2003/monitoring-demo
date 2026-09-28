using MonitoringDemo.ApiService.Domain.Entities;

namespace MonitoringDemo.ApiService.Features.Orders;

public sealed record CreateOrderRequest(int ProductId, int Quantity);

public sealed record OrderStatistics(
    int TotalOrders,
    int CompletedOrders,
    int FailedOrders,
    int PendingOrders,
    decimal TotalRevenue,
    decimal AverageOrderValue,
    int OrdersLastHour);

public enum OrderCreationError
{
    None,
    InvalidQuantity,
    ProductNotFound
}

public sealed record OrderCreationResult(
    Order? Order,
    OrderCreationError Error = OrderCreationError.None,
    string? Message = null);
