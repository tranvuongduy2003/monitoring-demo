namespace MonitoringDemo.ApiService.Telemetry;

public static class TelemetryConstants
{
    public const string ServiceName = "MonitoringDemo.ApiService";
    public const string ActivitySourceName = ServiceName;
    public const string MeterName = ServiceName;
    public const int SlowOperationThresholdMilliseconds = 500;
}
