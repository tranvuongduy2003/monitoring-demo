namespace MonitoringDemo.ApiService.Observability;

public static class LogEventIds
{
    public const int RequestStarted = 1000;
    public const int RequestCompleted = 1001;
    public const int RequestUnhandledException = 1002;

    public const int SeedOrderProcessed = 2000;
    public const int SeedPaymentException = 2099;
    public const int LoggingSeedComplete = 2100;
    public const int LoggingSeedFailed = 2101;

    public const int InteractiveDemo = 3000;
    public const int InteractiveException = 3001;
    public const int InteractiveDemoRequested = 3002;

    public const int OrderValidationFailed = 4001;
    public const int ProductNotFound = 4002;
    public const int OrderCompleted = 4003;
    public const int OrderFailed = 4004;

    public const int SimulatedOrderCompleted = 5000;
    public const int SimulatedOrderSlow = 5001;
    public const int SimulatedOrderFailed = 5002;
    public const int BackgroundOrderSimulationFailed = 5003;

    public const int LokiQueryFailed = 6000;

    public const int DatabaseSeedFailed = 9000;
}
