namespace MonitoringDemo.ApiService.Features.Grafana;

public sealed class FundamentalAlertingSeedWorker : BackgroundService
{
    private readonly FundamentalAlertingService _alerting;

    public FundamentalAlertingSeedWorker(FundamentalAlertingService alerting) => _alerting = alerting;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(7), stoppingToken);
            _alerting.Seed("healthy", 72);
            _alerting.Seed("pending", 54);
            _alerting.Seed("firing", 72);
            _alerting.Seed("alert-fatigue", 96);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
    }
}
