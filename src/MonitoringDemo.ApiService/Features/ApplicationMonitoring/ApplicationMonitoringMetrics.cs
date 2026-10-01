using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.ApplicationMonitoring;

public sealed class ApplicationMonitoringMetrics
{
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
        var tags = new TagList { { "http.route", route }, { "http.request.method", method }, { "http.response.status_code", statusCode }, { "scenario", scenario } };
        _httpRequests.Add(1, tags);
        _httpDuration.Record(durationMs, tags);
        if (statusCode >= 500) _httpErrors.Add(1, tags);
    }

    public void RecordDatabase(string operation, string table, bool success, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        var tags = Tags(scenario, "db.operation.name", operation, "db.collection.name", table, success);
        _databaseOperations.Add(1, tags);
        _databaseDuration.Record(durationMs, tags);
        if (!success) _databaseErrors.Add(1, tags);
    }

    public void RecordCache(string operation, string cacheName, string outcome, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        var tags = new TagList { { "cache.operation", operation }, { "cache.name", cacheName }, { "cache.outcome", outcome }, { "scenario", scenario } };
        _cacheOperations.Add(1, tags);
        _cacheDuration.Record(durationMs, tags);
    }

    public void RecordDependency(string dependency, string operation, bool success, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        var tags = Tags(scenario, "server.address", dependency, "rpc.method", operation, success);
        _dependencyCalls.Add(1, tags);
        _dependencyDuration.Record(durationMs, tags);
        if (!success) _dependencyErrors.Add(1, tags);
    }

    public void RecordBusinessEvent(string eventName, double value, double queueDepth, string scenario, DateTimeOffset timestamp)
    {
        _customEvents.Add(1, new TagList { { "business.event", eventName }, { "scenario", scenario } });
        if (eventName == "checkout.completed") _orderValue.Record(value, new TagList { { "currency", "USD" }, { "scenario", scenario } });
        Interlocked.Exchange(ref _queueDepth, queueDepth);
    }

    public void RecordSpan(string spanName, string traceId, bool success, double durationMs, string scenario, DateTimeOffset timestamp)
    {
        var tags = new TagList { { "span.name", spanName }, { "outcome", success ? "success" : "error" }, { "scenario", scenario } };
        _customSpans.Add(1, tags);
        _customSpanDuration.Record(durationMs, tags);
    }

    public void RecordError(string source, string errorType, string severity, string message, string scenario, DateTimeOffset timestamp) =>
        _errors.Add(1, new TagList { { "error.source", source }, { "error.type", errorType }, { "severity", severity }, { "scenario", scenario } });

    private static TagList Tags(string scenario, string firstName, string firstValue, string secondName, string secondValue, bool success) =>
        new() { { firstName, firstValue }, { secondName, secondValue }, { "outcome", success ? "success" : "error" }, { "scenario", scenario } };
}
