namespace MonitoringDemo.ApiService.Features.Metrics;

public sealed class MetricsSeedWorker : BackgroundService
{
    private const int StartupObservationCount = 240;
    private const int ContinuousObservationCount = 4;
    private static readonly TimeSpan SeedInterval = TimeSpan.FromSeconds(2);
    private readonly MetricsDemoSeeder _seeder;

    public MetricsSeedWorker(MetricsDemoSeeder seeder) => _seeder = seeder;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (stoppingToken.IsCancellationRequested) return;

        _seeder.Seed(StartupObservationCount);
        using var timer = new PeriodicTimer(SeedInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            // Keep counters moving so rate() and increase() remain demonstrable.
            _seeder.Seed(ContinuousObservationCount, windowMinutes: 15, writeLog: false);
        }
    }
}
