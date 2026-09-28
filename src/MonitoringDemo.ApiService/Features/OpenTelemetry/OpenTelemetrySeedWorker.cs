namespace MonitoringDemo.ApiService.Features.OpenTelemetry;

public sealed class OpenTelemetrySeedWorker : BackgroundService
{
    private readonly OpenTelemetryLabService _lab;

    public OpenTelemetrySeedWorker(OpenTelemetryLabService lab) => _lab = lab;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(4), stoppingToken);
            _lab.Seed(80);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown before the teaching dataset is created.
        }
    }
}
