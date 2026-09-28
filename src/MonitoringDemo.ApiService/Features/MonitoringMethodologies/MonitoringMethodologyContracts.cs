namespace MonitoringDemo.ApiService.Features.MonitoringMethodologies;

public sealed record MethodologyRequestSample(DateTimeOffset Timestamp, string Operation, string Outcome, string Scenario, double DurationMilliseconds);
public sealed record ResourceMetricSample(DateTimeOffset Timestamp, string Resource, double UtilizationRatio, double SaturationRatio, int ErrorCount, string Scenario);
public sealed record MonitoringMethodologySnapshot(int WindowMinutes, DateTimeOffset From, DateTimeOffset To, RedMethodAnalytics Red, IReadOnlyList<UseResourceAnalytics> Use, GoldenSignalsAnalytics GoldenSignals, IReadOnlyList<MethodologyTimePoint> TimeSeries, IReadOnlyList<ScenarioBreakdown> Scenarios);
public sealed record RedMethodAnalytics(int Requests, double RatePerMinute, int Errors, double ErrorRatePercent, double AverageDurationMilliseconds, double P95DurationMilliseconds);
public sealed record UseResourceAnalytics(string Resource, double CurrentUtilizationPercent, double AverageUtilizationPercent, double CurrentSaturationPercent, double PeakSaturationPercent, int Errors);
public sealed record GoldenSignalsAnalytics(double TrafficPerMinute, double ErrorRatePercent, double LatencyP95Milliseconds, double SaturationPercent, int Requests, int Errors);
public sealed record MethodologyTimePoint(DateTimeOffset Timestamp, int Requests, int Errors, double AverageDurationMilliseconds, double PeakSaturationPercent);
public sealed record ScenarioBreakdown(string Scenario, int Requests, int Errors, double AverageDurationMilliseconds);
