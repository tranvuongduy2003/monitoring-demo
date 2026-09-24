using System.Diagnostics.Metrics;

namespace MonitoringDemo.ApiService.Telemetry;

public class AppMetrics
{
    public Counter<long> OrdersCreated { get; }
    public Counter<long> OrdersFailed { get; }
    public Histogram<double> OrderProcessingDuration { get; }
    public UpDownCounter<int> ActiveOrders { get; }

    public AppMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("MonitoringDemo.ApiService");
        
        OrdersCreated = meter.CreateCounter<long>("orders_created_total", description: "Total orders created");
        OrdersFailed = meter.CreateCounter<long>("orders_failed_total", description: "Total failed orders");
        OrderProcessingDuration = meter.CreateHistogram<double>("order_processing_duration_ms", description: "Order processing time in ms");
        ActiveOrders = meter.CreateUpDownCounter<int>("active_orders_count", description: "Currently active/pending orders");
    }
}
