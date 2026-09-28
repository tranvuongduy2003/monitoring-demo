namespace MonitoringDemo.ApiService.Features.Tracing;

public sealed class TracingSeedWorker : BackgroundService
{
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(3);
    private const int StartupTraceCount = 12;
    private readonly TracingDemoSeeder _seeder;

    public TracingSeedWorker(TracingDemoSeeder seeder) => _seeder = seeder;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
            _seeder.Seed(StartupTraceCount);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown before startup seeding completes.
        }
    }
}
