using System.Diagnostics;

namespace MonitoringDemo.ApiService.Telemetry;

public sealed class AppActivitySource : IDisposable
{
    public ActivitySource Source { get; } = new(TelemetryConstants.ActivitySourceName);

    public void Dispose() => Source.Dispose();
}
