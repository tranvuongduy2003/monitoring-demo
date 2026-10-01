using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Domain.Entities;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Metrics;

public sealed class AppMetrics
{
    private readonly Counter<long> _ordersCreated;
    private readonly Counter<long> _ordersFailed;
    private readonly Histogram<double> _orderProcessingDuration;
    private int _activeOrders;

    public AppMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _ordersCreated = meter.CreateCounter<long>("orders_created_total", "{order}", "Total processed orders");
        _ordersFailed = meter.CreateCounter<long>("orders_failed_total", "{order}", "Total failed orders");
        _orderProcessingDuration = meter.CreateHistogram<double>("order_processing_duration_ms", "ms", "Order processing duration");
        meter.CreateObservableGauge("active_orders", () => Volatile.Read(ref _activeOrders), "{order}", "Orders currently being processed");
    }

    public void OrderStarted() => Interlocked.Increment(ref _activeOrders);

    public void OrderFinished() => Interlocked.Decrement(ref _activeOrders);

    public void RecordOrderProcessed(
        double durationMilliseconds,
        string status,
        string category,
        string source,
        DateTimeOffset? observedAt = null)
    {
        var tags = new TagList
        {
            { "order.status", status },
            { "product.category", category },
            { "traffic.source", source }
        };
        _ordersCreated.Add(1, tags);
        _orderProcessingDuration.Record(durationMilliseconds, tags);
        if (string.Equals(status, OrderStatuses.Failed, StringComparison.OrdinalIgnoreCase))
        {
            _ordersFailed.Add(1, tags);
        }
    }
}
