namespace MonitoringDemo.ApiService.Features.ApplicationMonitoring;

public sealed class ApplicationMonitoringSeedWorker : BackgroundService
{
    private readonly ApplicationMonitoringSeeder _seeder;

    public ApplicationMonitoringSeedWorker(ApplicationMonitoringSeeder seeder) => _seeder = seeder;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (stoppingToken.IsCancellationRequested) return;

        _seeder.Seed("healthy", 320);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(3));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            _seeder.Seed("healthy", 3, 15, writeLog: false);
        }
    }
}
