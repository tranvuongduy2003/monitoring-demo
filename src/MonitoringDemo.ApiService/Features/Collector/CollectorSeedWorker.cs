namespace MonitoringDemo.ApiService.Features.Collector;

public sealed class CollectorSeedWorker : BackgroundService
{
    private readonly CollectorLabService _lab;

    public CollectorSeedWorker(CollectorLabService lab) => _lab = lab;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(6), stoppingToken);
            _lab.Seed(150);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown before startup seeding completes.
        }
    }
}
