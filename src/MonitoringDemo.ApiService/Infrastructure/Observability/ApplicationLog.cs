namespace MonitoringDemo.ApiService.Infrastructure.Observability;

public static partial class ApplicationLog
{
    [LoggerMessage(LogEventIds.RequestStarted, LogLevel.Information, "HTTP {http_method} {http_path} started", EventName = "RequestStarted")]
    public static partial void RequestStarted(this ILogger logger, string http_method, string http_path);

    [LoggerMessage(EventId = LogEventIds.RequestCompleted, Message = "HTTP {http_method} {http_path} completed with {status_code} in {duration_ms:F1} ms", EventName = "RequestCompleted")]
    public static partial void RequestCompleted(
        this ILogger logger,
        LogLevel level,
        string http_method,
        string http_path,
        int status_code,
        double duration_ms);

    [LoggerMessage(LogEventIds.RequestUnhandledException, LogLevel.Error, "HTTP {http_method} {http_path} failed with an unhandled exception", EventName = "RequestUnhandledException")]
    public static partial void RequestUnhandledException(
        this ILogger logger,
        Exception exception,
        string http_method,
        string http_path);

    [LoggerMessage(LogEventIds.DatabaseSeedFailed, LogLevel.Error, "Database initialization failed during application startup", EventName = "DatabaseSeedFailed")]
    public static partial void DatabaseSeedFailed(this ILogger logger, Exception exception);
}
