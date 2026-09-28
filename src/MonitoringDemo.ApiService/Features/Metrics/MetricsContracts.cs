namespace MonitoringDemo.ApiService.Features.Metrics;

public sealed record OrderMetricSample(DateTimeOffset Timestamp, double DurationMilliseconds, string Status, string Category, string Source);

public sealed record MetricsAnalyticsSnapshot(int WindowMinutes, DateTimeOffset From, DateTimeOffset To, long CounterValue, long FailedCounterValue, int GaugeValue, MetricSummary Summary, IReadOnlyList<HistogramBucket> Buckets, IReadOnlyList<MetricTimeSeriesPoint> TimeSeries, CardinalitySummary Cardinality);

public sealed record MetricSummary(int Count, double Sum, double Average, double P50, double P95, double P99);
public sealed record HistogramBucket(double? LessThanOrEqual, int Count);
public sealed record MetricTimeSeriesPoint(DateTimeOffset Timestamp, int Count, int FailedCount, double AverageDurationMilliseconds);
public sealed record CardinalitySummary(int ObservedSeries, int MaximumExpectedSeries, IReadOnlyList<MetricSeries> Series);
public sealed record MetricSeries(string Status, string Category, string Source);
