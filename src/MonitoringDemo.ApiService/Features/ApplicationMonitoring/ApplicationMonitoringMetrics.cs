using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.ApplicationMonitoring;

public sealed class ApplicationMonitoringMetrics
{
    private const int MaximumRetainedSamples = 40_000;
    private readonly ConcurrentQueue<ApplicationMonitoringSample> _samples = new();
    private readonly Counter<long> _httpRequests;
    private readonly Counter<long> _httpErrors;
    private readonly Histogram<double> _httpDuration;
    private readonly Counter<long> _databaseOperations;
    private readonly Counter<long> _databaseErrors;
    private readonly Histogram<double> _databaseDuration;
    private readonly Counter<long> _cacheOperations;
    private readonly Histogram<double> _cacheDuration;
    private readonly Counter<long> _dependencyCalls;
    private readonly Counter<long> _dependencyErrors;
    private readonly Histogram<double> _dependencyDuration;
    private readonly Counter<long> _customEvents;
    private readonly Histogram<double> _orderValue;
    private readonly Counter<long> _customSpans;
    private readonly Histogram<double> _customSpanDuration;
    private readonly Counter<long> _errors;
    private int _sampleCount;
    private double _queueDepth;

    public ApplicationMonitoringMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _httpRequests = meter.CreateCounter<long>("application_http_requests_total", "{request}");
        _httpErrors = meter.CreateCounter<long>("application_http_request_errors_total", "{request}");
        _httpDuration = meter.CreateHistogram<double>("application_http_request_duration_ms", "ms");
        _databaseOperations = meter.CreateCounter<long>("application_database_operations_total", "{operation}");
        _databaseErrors = meter.CreateCounter<long>("application_database_operation_errors_total", "{operation}");
        _databaseDuration = meter.CreateHistogram<double>("application_database_operation_duration_ms", "ms");
        _cacheOperations = meter.CreateCounter<long>("application_cache_operations_total", "{operation}");
        _cacheDuration = meter.CreateHistogram<double>("application_cache_operation_duration_ms", "ms");
        _dependencyCalls = meter.CreateCounter<long>("application_dependency_calls_total", "{call}");
        _dependencyErrors = meter.CreateCounter<long>("application_dependency_call_errors_total", "{call}");
        _dependencyDuration = meter.CreateHistogram<double>("application_dependency_call_duration_ms", "ms");
        _customEvents = meter.CreateCounter<long>("application_business_events_total", "{event}");
        _orderValue = meter.CreateHistogram<double>("application_order_value", "USD");
        _customSpans = meter.CreateCounter<long>("application_custom_spans_total", "{span}");
        _customSpanDuration = meter.CreateHistogram<double>("application_custom_span_duration_ms", "ms");
        _errors = meter.CreateCounter<long>("application_errors_total", "{error}");
        meter.CreateObservableGauge("application_queue_depth", () => Volatile.Read(ref _queueDepth), "{item}");
    }

    public void RecordHttp(string route, string method, int statusCode, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        bool failed = statusCode >= 500;
        var tags = new TagList { { "http.route", route }, { "http.request.method", method }, { "http.response.status_code", statusCode }, { "scenario", scenario } };
        _httpRequests.Add(1, tags);
        _httpDuration.Record(durationMs, tags);
        if (failed) _httpErrors.Add(1, tags);
        AddSample(new(timestamp, "http", route, method, scenario, durationMs, !failed, statusCode, statusCode.ToString()));
    }

    public void RecordDatabase(string operation, string table, bool success, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        var tags = new TagList { { "db.operation.name", operation }, { "db.collection.name", table }, { "outcome", Outcome(success) }, { "scenario", scenario } };
        _databaseOperations.Add(1, tags);
        _databaseDuration.Record(durationMs, tags);
        if (!success) _databaseErrors.Add(1, tags);
        AddSample(new(timestamp, "database", operation, table, scenario, durationMs, success, 1, success ? "ok" : "timeout"));
    }

    public void RecordCache(string operation, string cacheName, string outcome, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        bool success = outcome != "error";
        var tags = new TagList { { "cache.operation", operation }, { "cache.name", cacheName }, { "cache.outcome", outcome }, { "scenario", scenario } };
        _cacheOperations.Add(1, tags);
        _cacheDuration.Record(durationMs, tags);
        AddSample(new(timestamp, "cache", operation, cacheName, scenario, durationMs, success, outcome == "hit" ? 1 : 0, outcome));
    }

    public void RecordDependency(string dependency, string operation, bool success, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        var tags = new TagList { { "server.address", dependency }, { "rpc.method", operation }, { "outcome", Outcome(success) }, { "scenario", scenario } };
        _dependencyCalls.Add(1, tags);
        _dependencyDuration.Record(durationMs, tags);
        if (!success) _dependencyErrors.Add(1, tags);
        AddSample(new(timestamp, "dependency", dependency, operation, scenario, durationMs, success, 1, success ? "ok" : "unavailable"));
    }

    public void RecordBusinessEvent(string eventName, double value, double queueDepth, string scenario, DateTimeOffset timestamp)
    {
        _customEvents.Add(1, new TagList { { "business.event", eventName }, { "scenario", scenario } });
        if (eventName == "checkout.completed")
        {
            _orderValue.Record(value, new TagList { { "currency", "USD" }, { "scenario", scenario } });
        }
        Interlocked.Exchange(ref _queueDepth, queueDepth);
        AddSample(new(timestamp, "custom-metric", eventName, "business", scenario, 0, true, value, $"queue:{queueDepth:0}"));
    }

    public void RecordSpan(string spanName, string traceId, bool success, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        var tags = new TagList { { "span.name", spanName }, { "outcome", Outcome(success) }, { "scenario", scenario } };
        _customSpans.Add(1, tags);
        _customSpanDuration.Record(durationMs, tags);
        AddSample(new(timestamp, "custom-span", spanName, traceId, scenario, durationMs, success, 1, traceId));
    }

    public void RecordError(string source, string errorType, string severity, string message, string scenario, DateTimeOffset timestamp)
    {
        _errors.Add(1, new TagList { { "error.source", source }, { "error.type", errorType }, { "severity", severity }, { "scenario", scenario } });
        AddSample(new(timestamp, "error", source, errorType, scenario, 0, false, 1, $"{severity}: {message}"));
    }

    public ApplicationMonitoringSnapshot GetSnapshot(int windowMinutes)
    {
        var to = DateTimeOffset.UtcNow;
        var from = to.AddMinutes(-windowMinutes);
        var samples = _samples.Where(x => x.Timestamp >= from && x.Timestamp <= to).OrderBy(x => x.Timestamp).ToArray();
        var categories = new[] { "http", "database", "cache", "dependency", "custom-metric", "custom-span", "error" };
        var sections = categories.Select(category => Summarize(category, samples.Where(x => x.Category == category).ToArray())).ToArray();
        var cache = samples.Where(x => x.Category == "cache").ToArray();
        var business = samples.Where(x => x.Category == "custom-metric").ToArray();

        var timeline = samples
            .GroupBy(x => (Minute(x.Timestamp), x.Category))
            .Select(g => new ApplicationMonitoringTimePoint(g.Key.Item1, g.Key.Category, g.Count(), g.Count(x => !x.Success), Math.Round(g.Sum(x => x.Value), 2)))
            .OrderBy(x => x.Timestamp).ThenBy(x => x.Category)
            .ToArray();

        var recentErrors = samples.Where(x => x.Category == "error").OrderByDescending(x => x.Timestamp).Take(12)
            .Select(x => new RecentApplicationError(x.Timestamp, x.Name, x.Dimension, x.Detail, x.Scenario)).ToArray();
        var recentSpans = samples.Where(x => x.Category == "custom-span").OrderByDescending(x => x.Timestamp).Take(12)
            .Select(x => new RecentApplicationSpan(x.Timestamp, x.Name, x.Dimension, x.DurationMilliseconds, x.Success, x.Scenario)).ToArray();

        return new ApplicationMonitoringSnapshot(
            windowMinutes, from, to, sections, timeline,
            new CacheAnalytics(cache.Count(x => x.Detail == "hit"), cache.Count(x => x.Detail == "miss"), cache.Count(x => x.Detail == "error"), Percentage(cache.Count(x => x.Detail == "hit"), cache.Count(x => x.Detail is "hit" or "miss"))),
            new BusinessAnalytics(business.Count(x => x.Name == "checkout.started"), business.Count(x => x.Name == "checkout.completed"), Math.Round(business.Where(x => x.Name == "checkout.completed").Sum(x => x.Value), 2), Volatile.Read(ref _queueDepth)),
            recentSpans, recentErrors);
    }

    private static ApplicationMonitoringSection Summarize(string category, ApplicationMonitoringSample[] values)
    {
        int errors = values.Count(x => !x.Success);
        var durations = values.Where(x => x.DurationMilliseconds > 0).Select(x => x.DurationMilliseconds).Order().ToArray();
        var breakdown = values.GroupBy(x => x.Name).OrderByDescending(g => g.Count()).Select(g =>
            new ApplicationMonitoringBreakdown(g.Key, g.Count(), g.Count(x => !x.Success), Math.Round(g.Where(x => x.DurationMilliseconds > 0).Select(x => x.DurationMilliseconds).DefaultIfEmpty().Average(), 2))).ToArray();
        return new(category, values.Length, errors, Percentage(errors, values.Length), durations.Length == 0 ? 0 : Math.Round(durations.Average(), 2), Percentile(durations, .95), breakdown);
    }

    private void AddSample(ApplicationMonitoringSample sample)
    {
        _samples.Enqueue(sample);
        int count = Interlocked.Increment(ref _sampleCount);
        while (count > MaximumRetainedSamples && _samples.TryDequeue(out _)) count = Interlocked.Decrement(ref _sampleCount);
    }

    private static string Outcome(bool success) => success ? "success" : "error";
    private static DateTimeOffset Minute(DateTimeOffset value) => new(value.Year, value.Month, value.Day, value.Hour, value.Minute, 0, TimeSpan.Zero);
    private static double Percentage(int numerator, int denominator) => denominator == 0 ? 0 : Math.Round(numerator * 100d / denominator, 2);
    private static double Percentile(double[] values, double percentile)
    {
        if (values.Length == 0) return 0;
        double index = (values.Length - 1) * percentile;
        int lower = (int)Math.Floor(index);
        int upper = (int)Math.Ceiling(index);
        return Math.Round(values[lower] + ((values[upper] - values[lower]) * (index - lower)), 2);
    }
}
