using System.Diagnostics;

namespace MonitoringDemo.ApiService.Telemetry;

public class AppActivitySource
{
    public ActivitySource Source { get; } = new ActivitySource("MonitoringDemo.ApiService");
}
