using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public sealed class MetricsDemoSeeder
{
    private static readonly string[] Categories =
        ["Accessories", "Electronics", "Hardware", "Software", "Tools"];

    private readonly AppMetrics _metrics;
    private readonly ILogger<MetricsDemoSeeder> _logger;
    private int _seedSequence;

    public MetricsDemoSeeder(AppMetrics metrics, ILogger<MetricsDemoSeeder> logger)
    {
        _metrics = metrics;
        _logger = logger;
    }

    public MetricsAnalyticsSnapshot Seed(int count, int windowMinutes = 60, bool writeLog = true)
    {
        int sequence = Interlocked.Increment(ref _seedSequence);
        var random = new Random(20260927 + sequence);
        var now = DateTimeOffset.UtcNow;

        for (int index = 0; index < count; index++)
        {
            string category = Categories[random.Next(Categories.Length)];
            string status = random.NextDouble() < 0.1 ? "Failed" : "Completed";
            double duration = CreateDuration(random);
            var timestamp = now.AddSeconds(-random.Next(0, windowMinutes * 60));

            _metrics.RecordOrderProcessed(duration, status, category, "seed", timestamp);
        }

        if (writeLog)
        {
            _logger.LogInformation(
                "Seeded {MetricObservationCount} metric observations for the metrics lab",
                count);
        }

        return _metrics.GetSnapshot(windowMinutes);
    }

    public void Reset() => Interlocked.Exchange(ref _seedSequence, 0);

    private static double CreateDuration(Random random)
    {
        double roll = random.NextDouble();
        return roll switch
        {
            < 0.50 => random.Next(35, 101),
            < 0.85 => random.Next(101, 301),
            < 0.97 => random.Next(301, 901),
            _ => random.Next(901, 2_501)
        };
    }
}

public sealed class MetricsSeedService : BackgroundService
{
    private const int StartupObservationCount = 240;
    private const int ContinuousObservationCount = 4;
    private static readonly TimeSpan SeedInterval = TimeSpan.FromSeconds(2);
    private readonly MetricsDemoSeeder _seeder;

    public MetricsSeedService(MetricsDemoSeeder seeder)
    {
        _seeder = seeder;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        _seeder.Seed(StartupObservationCount);

        using var timer = new PeriodicTimer(SeedInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            // Counters must change between Prometheus scrapes for rate() and increase()
            // examples to remain useful even when no one is using the orders API.
            _seeder.Seed(ContinuousObservationCount, windowMinutes: 15, writeLog: false);
        }
    }
}
