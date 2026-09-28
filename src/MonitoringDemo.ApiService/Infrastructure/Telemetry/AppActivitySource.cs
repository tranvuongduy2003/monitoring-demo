using System.Diagnostics;

namespace MonitoringDemo.ApiService.Infrastructure.Telemetry;

public sealed class AppActivitySource : IDisposable
{
    public ActivitySource Source { get; } = new(TelemetryConstants.ActivitySourceName);

    public void Dispose() => Source.Dispose();
}
