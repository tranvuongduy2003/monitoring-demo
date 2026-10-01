using MonitoringDemo.ApiService.Domain.Entities;

namespace MonitoringDemo.ApiService.Features.Metrics;

public sealed class MetricsDemoSeeder(AppMetrics metrics)
{
    private static readonly string[] Categories = ["Accessories", "Electronics", "Hardware", "Software", "Tools"];
    private int _seedSequence;

    public int Seed(int count)
    {
        count = Math.Clamp(count, 1, 1_000);
        var random = new Random(20260927 + Interlocked.Increment(ref _seedSequence));
        for (int index = 0; index < count; index++)
        {
            string status = random.NextDouble() < 0.1 ? OrderStatuses.Failed : OrderStatuses.Completed;
            metrics.RecordOrderProcessed(CreateDuration(random), status, Categories[random.Next(Categories.Length)], "scenario");
        }
        return count;
    }

    private static double CreateDuration(Random random) => random.NextDouble() switch
    {
        < 0.50 => random.Next(35, 101),
        < 0.85 => random.Next(101, 301),
        < 0.97 => random.Next(301, 901),
        _ => random.Next(901, 2_501)
    };
}
