using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace MonitoringDemo.ApiService.Telemetry;

public sealed class AppMetrics
{
    public static readonly double[] DurationBucketBoundaries = [50, 100, 200, 500, 1_000, 2_000];

    private const int MaximumRetainedSamples = 10_000;

    private readonly Counter<long> _ordersCreated;
    private readonly Counter<long> _ordersFailed;
    private readonly Histogram<double> _orderProcessingDuration;
    private readonly ConcurrentQueue<OrderMetricSample> _samples = new();
    private readonly ConcurrentDictionary<MetricLabelSet, byte> _labelSets = new();
    private long _ordersCreatedValue;
    private long _ordersFailedValue;
    private int _activeOrders;
    private int _sampleCount;

    public AppMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(TelemetryConstants.MeterName);

        _ordersCreated = meter.CreateCounter<long>(
            "orders_created_total",
            unit: "{order}",
            description: "Total number of processed orders");
        _ordersFailed = meter.CreateCounter<long>(
            "orders_failed_total",
            unit: "{order}",
            description: "Total number of failed orders");
        _orderProcessingDuration = meter.CreateHistogram<double>(
            "order_processing_duration_ms",
            description: "Distribution of order processing duration");

        meter.CreateObservableGauge(
            "active_orders",
            () => Volatile.Read(ref _activeOrders),
            unit: "{order}",
            description: "Orders currently being processed");
    }

    public void OrderStarted() => Interlocked.Increment(ref _activeOrders);

    public void OrderFinished() => Interlocked.Decrement(ref _activeOrders);

    public void RecordOrderProcessed(
        double durationMilliseconds,
        string status,
        string category,
        string source,
        DateTimeOffset? observedAt = null)
    {
        var tags = new TagList
        {
            { "order.status", status },
            { "product.category", category },
            { "traffic.source", source }
        };

        _ordersCreated.Add(1, tags);
        _orderProcessingDuration.Record(durationMilliseconds, tags);
        Interlocked.Increment(ref _ordersCreatedValue);

        if (string.Equals(status, "Failed", StringComparison.OrdinalIgnoreCase))
        {
            _ordersFailed.Add(1, tags);
            Interlocked.Increment(ref _ordersFailedValue);
        }

        _labelSets.TryAdd(new MetricLabelSet(status, category, source), 0);
        _samples.Enqueue(new OrderMetricSample(
            observedAt ?? DateTimeOffset.UtcNow,
            durationMilliseconds,
            status,
            category,
            source));

        int count = Interlocked.Increment(ref _sampleCount);
        while (count > MaximumRetainedSamples && _samples.TryDequeue(out _))
        {
            count = Interlocked.Decrement(ref _sampleCount);
        }
    }

    public MetricsAnalyticsSnapshot GetSnapshot(int windowMinutes)
    {
        var now = DateTimeOffset.UtcNow;
        var from = now.AddMinutes(-windowMinutes);
        var samples = _samples
            .Where(sample => sample.Timestamp >= from && sample.Timestamp <= now)
            .OrderBy(sample => sample.Timestamp)
            .ToArray();
        var durations = samples.Select(sample => sample.DurationMilliseconds).Order().ToArray();

        var buckets = DurationBucketBoundaries
            .Select(boundary => new HistogramBucket(boundary, durations.Count(value => value <= boundary)))
            .Append(new HistogramBucket(null, durations.Length))
            .ToArray();

        var timeSeries = samples
            .GroupBy(sample => new DateTimeOffset(
                sample.Timestamp.Year,
                sample.Timestamp.Month,
                sample.Timestamp.Day,
                sample.Timestamp.Hour,
                sample.Timestamp.Minute,
                0,
                TimeSpan.Zero))
            .Select(group => new MetricTimeSeriesPoint(
                group.Key,
                group.Count(),
                group.Count(sample => string.Equals(sample.Status, "Failed", StringComparison.OrdinalIgnoreCase)),
                Math.Round(group.Average(sample => sample.DurationMilliseconds), 2)))
            .ToArray();

        var series = _labelSets.Keys
            .OrderBy(item => item.Status)
            .ThenBy(item => item.Category)
            .ThenBy(item => item.Source)
            .Select(item => new MetricSeries(item.Status, item.Category, item.Source))
            .ToArray();

        return new MetricsAnalyticsSnapshot(
            windowMinutes,
            from,
            now,
            Interlocked.Read(ref _ordersCreatedValue),
            Interlocked.Read(ref _ordersFailedValue),
            Volatile.Read(ref _activeOrders),
            new MetricSummary(
                durations.Length,
                Math.Round(durations.Sum(), 2),
                durations.Length == 0 ? 0 : Math.Round(durations.Average(), 2),
                Percentile(durations, 0.50),
                Percentile(durations, 0.95),
                Percentile(durations, 0.99)),
            buckets,
            timeSeries,
            new CardinalitySummary(series.Length, 30, series));
    }

    private static double Percentile(double[] sortedValues, double percentile)
    {
        if (sortedValues.Length == 0) return 0;
        if (sortedValues.Length == 1) return Math.Round(sortedValues[0], 2);

        double position = (sortedValues.Length - 1) * percentile;
        int lower = (int)Math.Floor(position);
        int upper = (int)Math.Ceiling(position);
        double value = sortedValues[lower] + ((sortedValues[upper] - sortedValues[lower]) * (position - lower));
        return Math.Round(value, 2);
    }

    private sealed record MetricLabelSet(string Status, string Category, string Source);
}

public sealed record OrderMetricSample(
    DateTimeOffset Timestamp,
    double DurationMilliseconds,
    string Status,
    string Category,
    string Source);

public sealed record MetricsAnalyticsSnapshot(
    int WindowMinutes,
    DateTimeOffset From,
    DateTimeOffset To,
    long CounterValue,
    long FailedCounterValue,
    int GaugeValue,
    MetricSummary Summary,
    IReadOnlyList<HistogramBucket> Buckets,
    IReadOnlyList<MetricTimeSeriesPoint> TimeSeries,
    CardinalitySummary Cardinality);

public sealed record MetricSummary(
    int Count,
    double Sum,
    double Average,
    double P50,
    double P95,
    double P99);

public sealed record HistogramBucket(double? LessThanOrEqual, int Count);

public sealed record MetricTimeSeriesPoint(
    DateTimeOffset Timestamp,
    int Count,
    int FailedCount,
    double AverageDurationMilliseconds);

public sealed record CardinalitySummary(
    int ObservedSeries,
    int MaximumExpectedSeries,
    IReadOnlyList<MetricSeries> Series);

public sealed record MetricSeries(string Status, string Category, string Source);
