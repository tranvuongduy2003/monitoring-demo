using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.MonitoringMethodologies;

public sealed class MonitoringMethodologyMetrics
{
    private const int MaximumRetainedRequests = 20_000;
    private const int MaximumRetainedResourceSamples = 5_000;

    private readonly Counter<long> _requests;
    private readonly Counter<long> _requestErrors;
    private readonly Histogram<double> _requestDuration;
    private readonly Counter<long> _resourceErrors;
    private readonly ConcurrentQueue<MethodologyRequestSample> _requestSamples = new();
    private readonly ConcurrentQueue<ResourceMetricSample> _resourceSamples = new();
    private readonly ConcurrentDictionary<string, ResourceMetricSample> _latestResources = new();
    private int _requestSampleCount;
    private int _resourceSampleCount;

    public MonitoringMethodologyMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(TelemetryConstants.MeterName);

        _requests = meter.CreateCounter<long>(
            "methodology_service_requests_total",
            unit: "{request}",
            description: "Service requests used by RED and Golden Signals");
        _requestErrors = meter.CreateCounter<long>(
            "methodology_service_request_errors_total",
            unit: "{request}",
            description: "Failed service requests used by RED and Golden Signals");
        _requestDuration = meter.CreateHistogram<double>(
            "methodology_service_request_duration_ms",
            unit: "ms",
            description: "Service request latency used by RED and Golden Signals");
        _resourceErrors = meter.CreateCounter<long>(
            "methodology_resource_errors_total",
            unit: "{error}",
            description: "Resource errors used by USE");

        meter.CreateObservableGauge(
            "methodology_resource_utilization_ratio",
            ObserveUtilization,
            unit: "1",
            description: "Current resource utilization from zero to one");
        meter.CreateObservableGauge(
            "methodology_resource_saturation_ratio",
            ObserveSaturation,
            unit: "1",
            description: "Current resource saturation from zero to one");
    }

    public void RecordRequest(
        double durationMilliseconds,
        bool failed,
        string operation,
        string scenario,
        DateTimeOffset? observedAt = null)
    {
        string outcome = failed ? "error" : "success";
        var tags = new TagList
        {
            { "operation", operation },
            { "outcome", outcome },
            { "scenario", scenario }
        };

        _requests.Add(1, tags);
        _requestDuration.Record(durationMilliseconds, tags);
        if (failed)
        {
            _requestErrors.Add(1, tags);
        }

        _requestSamples.Enqueue(new MethodologyRequestSample(
            observedAt ?? DateTimeOffset.UtcNow,
            operation,
            outcome,
            scenario,
            durationMilliseconds));
        TrimQueue(_requestSamples, ref _requestSampleCount, MaximumRetainedRequests);
    }

    public void RecordResource(
        string resource,
        double utilizationRatio,
        double saturationRatio,
        int errorCount,
        string scenario,
        DateTimeOffset? observedAt = null)
    {
        var sample = new ResourceMetricSample(
            observedAt ?? DateTimeOffset.UtcNow,
            resource,
            Math.Clamp(utilizationRatio, 0, 1),
            Math.Clamp(saturationRatio, 0, 1),
            Math.Max(0, errorCount),
            scenario);

        _latestResources[resource] = sample;
        _resourceSamples.Enqueue(sample);
        TrimQueue(_resourceSamples, ref _resourceSampleCount, MaximumRetainedResourceSamples);

        if (sample.ErrorCount > 0)
        {
            _resourceErrors.Add(sample.ErrorCount,
                new TagList { { "resource", resource }, { "scenario", scenario } });
        }
    }

    public MonitoringMethodologySnapshot GetSnapshot(int windowMinutes)
    {
        var to = DateTimeOffset.UtcNow;
        var from = to.AddMinutes(-windowMinutes);
        var requests = _requestSamples
            .Where(sample => sample.Timestamp >= from && sample.Timestamp <= to)
            .OrderBy(sample => sample.Timestamp)
            .ToArray();
        var resources = _resourceSamples
            .Where(sample => sample.Timestamp >= from && sample.Timestamp <= to)
            .OrderBy(sample => sample.Timestamp)
            .ToArray();

        var durations = requests.Select(sample => sample.DurationMilliseconds).Order().ToArray();
        int errors = requests.Count(sample => sample.Outcome == "error");
        double observedMinutes = Math.Max(1, windowMinutes);
        var red = new RedMethodAnalytics(
            requests.Length,
            Math.Round(requests.Length / observedMinutes, 2),
            errors,
            Percentage(errors, requests.Length),
            durations.Length == 0 ? 0 : Math.Round(durations.Average(), 2),
            Percentile(durations, 0.95));

        var use = resources
            .GroupBy(sample => sample.Resource)
            .OrderBy(group => group.Key)
            .Select(group =>
            {
                var latest = group.MaxBy(sample => sample.Timestamp)!;
                return new UseResourceAnalytics(
                    group.Key,
                    Math.Round(latest.UtilizationRatio * 100, 1),
                    Math.Round(group.Average(sample => sample.UtilizationRatio) * 100, 1),
                    Math.Round(latest.SaturationRatio * 100, 1),
                    Math.Round(group.Max(sample => sample.SaturationRatio) * 100, 1),
                    group.Sum(sample => sample.ErrorCount));
            })
            .ToArray();

        var timeline = requests
            .GroupBy(sample => Minute(sample.Timestamp))
            .Select(group => new MethodologyTimePoint(
                group.Key,
                group.Count(),
                group.Count(sample => sample.Outcome == "error"),
                Math.Round(group.Average(sample => sample.DurationMilliseconds), 2),
                Math.Round(resources
                    .Where(sample => Minute(sample.Timestamp) == group.Key)
                    .Select(sample => sample.SaturationRatio * 100)
                    .DefaultIfEmpty(0)
                    .Max(), 1)))
            .OrderBy(point => point.Timestamp)
            .ToArray();

        var golden = new GoldenSignalsAnalytics(
            red.RatePerMinute,
            red.ErrorRatePercent,
            red.P95DurationMilliseconds,
            use.Select(resource => resource.CurrentSaturationPercent).DefaultIfEmpty(0).Max(),
            requests.Length,
            errors);

        var scenarios = requests
            .GroupBy(sample => sample.Scenario)
            .OrderByDescending(group => group.Count())
            .Select(group => new ScenarioBreakdown(
                group.Key,
                group.Count(),
                group.Count(sample => sample.Outcome == "error"),
                Math.Round(group.Average(sample => sample.DurationMilliseconds), 2)))
            .ToArray();

        return new MonitoringMethodologySnapshot(
            windowMinutes,
            from,
            to,
            red,
            use,
            golden,
            timeline,
            scenarios);
    }

    private IEnumerable<Measurement<double>> ObserveUtilization() =>
        _latestResources.Values.Select(sample => new Measurement<double>(
            sample.UtilizationRatio,
            new KeyValuePair<string, object?>("resource", sample.Resource),
            new KeyValuePair<string, object?>("scenario", sample.Scenario)));

    private IEnumerable<Measurement<double>> ObserveSaturation() =>
        _latestResources.Values.Select(sample => new Measurement<double>(
            sample.SaturationRatio,
            new KeyValuePair<string, object?>("resource", sample.Resource),
            new KeyValuePair<string, object?>("scenario", sample.Scenario)));

    private static DateTimeOffset Minute(DateTimeOffset value) => new(
        value.Year, value.Month, value.Day, value.Hour, value.Minute, 0, TimeSpan.Zero);

    private static double Percentage(int numerator, int denominator) =>
        denominator == 0 ? 0 : Math.Round(numerator * 100d / denominator, 2);

    private static double Percentile(double[] values, double percentile)
    {
        if (values.Length == 0) return 0;
        if (values.Length == 1) return Math.Round(values[0], 2);

        double position = (values.Length - 1) * percentile;
        int lower = (int)Math.Floor(position);
        int upper = (int)Math.Ceiling(position);
        return Math.Round(values[lower] + ((values[upper] - values[lower]) * (position - lower)), 2);
    }

    private static void TrimQueue<T>(ConcurrentQueue<T> queue, ref int count, int maximum)
    {
        int current = Interlocked.Increment(ref count);
        while (current > maximum && queue.TryDequeue(out _))
        {
            current = Interlocked.Decrement(ref count);
        }
    }
}
