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

    [LoggerMessage(EventId = LogEventIds.SeedOrderProcessed, Message = "Seed order {order_id} finished with {order_status} in {duration_ms} ms", EventName = "SeedOrderProcessed")]
    public static partial void SeedOrderProcessed(
        this ILogger logger,
        LogLevel level,
        int order_id,
        string order_status,
        long duration_ms);

    [LoggerMessage(LogEventIds.SeedPaymentException, LogLevel.Error, "Payment exception captured for order {order_id}; retry {retry_count}", EventName = "SeedPaymentException")]
    public static partial void SeedPaymentException(
        this ILogger logger,
        Exception exception,
        int order_id,
        int retry_count);

    [LoggerMessage(LogEventIds.LoggingSeedComplete, LogLevel.Information, "Logging seed completed with {seed_event_count} base events and {exception_event_count} exception events", EventName = "LoggingSeedComplete")]
    public static partial void LoggingSeedComplete(
        this ILogger logger,
        int seed_event_count,
        int exception_event_count);

    [LoggerMessage(LogEventIds.LoggingSeedFailed, LogLevel.Error, "Logging seed failed; the application will continue running", EventName = "LoggingSeedFailed")]
    public static partial void LoggingSeedFailed(this ILogger logger, Exception exception);

    [LoggerMessage(EventId = LogEventIds.InteractiveDemo, Message = "Interactive {demo_level} event for order {order_id} took {duration_ms} ms", EventName = "InteractiveDemo")]
    public static partial void InteractiveDemo(
        this ILogger logger,
        LogLevel level,
        string demo_level,
        int order_id,
        long duration_ms);

    [LoggerMessage(LogEventIds.InteractiveException, LogLevel.Error, "Interactive exception for order {order_id}", EventName = "InteractiveException")]
    public static partial void InteractiveException(
        this ILogger logger,
        Exception exception,
        int order_id);

    [LoggerMessage(LogEventIds.InteractiveDemoRequested, LogLevel.Information, "A learner requested an interactive logging demonstration", EventName = "InteractiveDemoRequested")]
    public static partial void InteractiveDemoRequested(this ILogger logger);

    [LoggerMessage(LogEventIds.OrderValidationFailed, LogLevel.Warning, "Order validation failed for product {product_id}: quantity {quantity} is outside {minimum_quantity}-{maximum_quantity}", EventName = "OrderValidationFailed")]
    public static partial void OrderValidationFailed(
        this ILogger logger,
        int product_id,
        int quantity,
        int minimum_quantity,
        int maximum_quantity);

    [LoggerMessage(LogEventIds.ProductNotFound, LogLevel.Warning, "Order rejected because product {product_id} was not found", EventName = "ProductNotFound")]
    public static partial void ProductNotFound(this ILogger logger, int product_id);

    [LoggerMessage(LogEventIds.OrderCompleted, LogLevel.Information, "Order {order_id} processed successfully for product {product_name} in {duration_ms} ms", EventName = "OrderCompleted")]
    public static partial void OrderCompleted(
        this ILogger logger,
        int order_id,
        string product_name,
        long duration_ms);

    [LoggerMessage(LogEventIds.OrderFailed, LogLevel.Error, "Order {order_id} failed to process for product {product_name} in {duration_ms} ms", EventName = "OrderFailed")]
    public static partial void OrderFailed(
        this ILogger logger,
        int order_id,
        string product_name,
        long duration_ms);

    [LoggerMessage(LogEventIds.SimulatedOrderCompleted, LogLevel.Information, "Simulated order {order_id} processed successfully for product {product_name} in {duration_ms} ms", EventName = "SimulatedOrderCompleted")]
    public static partial void SimulatedOrderCompleted(
        this ILogger logger,
        int order_id,
        string product_name,
        long duration_ms);

    [LoggerMessage(LogEventIds.SimulatedOrderSlow, LogLevel.Warning, "Simulated order {order_id} processed slowly in {duration_ms} ms for product {product_name}", EventName = "SimulatedOrderSlow")]
    public static partial void SimulatedOrderSlow(
        this ILogger logger,
        int order_id,
        long duration_ms,
        string product_name);

    [LoggerMessage(LogEventIds.SimulatedOrderFailed, LogLevel.Error, "Simulated order {order_id} failed for product {product_name} in {duration_ms} ms", EventName = "SimulatedOrderFailed")]
    public static partial void SimulatedOrderFailed(
        this ILogger logger,
        int order_id,
        string product_name,
        long duration_ms);

    [LoggerMessage(LogEventIds.BackgroundOrderSimulationFailed, LogLevel.Error, "Background order simulation failed", EventName = "BackgroundOrderSimulationFailed")]
    public static partial void BackgroundOrderSimulationFailed(this ILogger logger, Exception exception);

    [LoggerMessage(LogEventIds.LokiQueryFailed, LogLevel.Warning, "Loki query failed for a {window_minutes}-minute analytics window", EventName = "LokiQueryFailed")]
    public static partial void LokiQueryFailed(this ILogger logger, Exception exception, int window_minutes);

    [LoggerMessage(LogEventIds.DatabaseSeedFailed, LogLevel.Error, "Database seeding failed during application startup", EventName = "DatabaseSeedFailed")]
    public static partial void DatabaseSeedFailed(this ILogger logger, Exception exception);
}
