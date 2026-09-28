namespace MonitoringDemo.ApiService.Domain.Entities;

public sealed class Order
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = OrderStatuses.Pending;
    public DateTime CreatedAt { get; set; }
}
