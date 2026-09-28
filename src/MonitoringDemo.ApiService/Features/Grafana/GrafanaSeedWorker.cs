namespace MonitoringDemo.ApiService.Features.Grafana;

public sealed class GrafanaSeedWorker : BackgroundService
{
    private readonly GrafanaLabService _lab;

    public GrafanaSeedWorker(GrafanaLabService lab) => _lab = lab;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(6), stoppingToken);
            _lab.Seed(180);

            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                _lab.Seed(8);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
    }
}
