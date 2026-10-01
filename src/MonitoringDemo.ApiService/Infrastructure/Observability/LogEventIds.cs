namespace MonitoringDemo.ApiService.Infrastructure.Observability;

public static class LogEventIds
{
    public const int RequestStarted = 1000;
    public const int RequestCompleted = 1001;
    public const int RequestUnhandledException = 1002;

    public const int DatabaseSeedFailed = 9000;
}
