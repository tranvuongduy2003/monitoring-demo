namespace MonitoringDemo.ApiService.Features.Otlp;

public sealed class OtlpSeedWorker : BackgroundService
{
    private readonly OtlpLabService _lab;

    public OtlpSeedWorker(OtlpLabService lab) => _lab = lab;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            _lab.Seed(120);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown before the teaching dataset is created.
        }
    }
}
