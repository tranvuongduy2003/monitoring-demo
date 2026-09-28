using MonitoringDemo.ApiService.Domain.Entities;

namespace MonitoringDemo.ApiService.Features.Metrics;

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
            string status = random.NextDouble() < 0.1
                ? OrderStatuses.Failed
                : OrderStatuses.Completed;
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
