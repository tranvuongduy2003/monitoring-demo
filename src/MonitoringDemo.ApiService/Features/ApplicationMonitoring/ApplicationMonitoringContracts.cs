namespace MonitoringDemo.ApiService.Features.ApplicationMonitoring;

public sealed record ApplicationMonitoringSample(DateTimeOffset Timestamp, string Category, string Name, string Dimension, string Scenario, double DurationMilliseconds, bool Success, double Value, string Detail);
public sealed record ApplicationMonitoringSnapshot(int WindowMinutes, DateTimeOffset From, DateTimeOffset To, IReadOnlyList<ApplicationMonitoringSection> Sections, IReadOnlyList<ApplicationMonitoringTimePoint> TimeSeries, CacheAnalytics Cache, BusinessAnalytics Business, IReadOnlyList<RecentApplicationSpan> RecentSpans, IReadOnlyList<RecentApplicationError> RecentErrors);
public sealed record ApplicationMonitoringSection(string Category, int Operations, int Errors, double ErrorRatePercent, double AverageDurationMilliseconds, double P95DurationMilliseconds, IReadOnlyList<ApplicationMonitoringBreakdown> Breakdown);
public sealed record ApplicationMonitoringBreakdown(string Name, int Operations, int Errors, double AverageDurationMilliseconds);
public sealed record ApplicationMonitoringTimePoint(DateTimeOffset Timestamp, string Category, int Operations, int Errors, double Value);
public sealed record CacheAnalytics(int Hits, int Misses, int Errors, double HitRatePercent);
public sealed record BusinessAnalytics(int CheckoutsStarted, int CheckoutsCompleted, double Revenue, double QueueDepth);
public sealed record RecentApplicationSpan(DateTimeOffset Timestamp, string Name, string TraceId, double DurationMilliseconds, bool Success, string Scenario);
public sealed record RecentApplicationError(DateTimeOffset Timestamp, string Source, string Type, string Message, string Scenario);
