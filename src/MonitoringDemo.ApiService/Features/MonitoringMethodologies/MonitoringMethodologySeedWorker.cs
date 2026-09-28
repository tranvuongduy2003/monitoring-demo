namespace MonitoringDemo.ApiService.Features.MonitoringMethodologies;

public sealed class MonitoringMethodologySeedWorker : BackgroundService
{
    private readonly MonitoringMethodologySeeder _seeder;

    public MonitoringMethodologySeedWorker(MonitoringMethodologySeeder seeder) => _seeder = seeder;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (stoppingToken.IsCancellationRequested) return;

        _seeder.Seed("baseline", 720);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            _seeder.Seed(_seeder.GetActiveScenario(), 10, windowMinutes: 1, writeLog: false);
        }
    }
}
