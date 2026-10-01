using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.MonitoringMethodologies;

public sealed class MonitoringMethodologyMetrics
{
    private readonly Counter<long> _requests;
    private readonly Counter<long> _requestErrors;
    private readonly Histogram<double> _requestDuration;
    private readonly Counter<long> _resourceErrors;
    private readonly ConcurrentDictionary<string, ResourceMeasurement> _latestResources = new();

    public MonitoringMethodologyMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _requests = meter.CreateCounter<long>("methodology_service_requests_total", "{request}", "Service requests used by RED and Golden Signals");
        _requestErrors = meter.CreateCounter<long>("methodology_service_request_errors_total", "{request}", "Failed service requests");
        _requestDuration = meter.CreateHistogram<double>("methodology_service_request_duration_ms", "ms", "Service request latency");
        _resourceErrors = meter.CreateCounter<long>("methodology_resource_errors_total", "{error}", "Resource errors used by USE");
        meter.CreateObservableGauge("methodology_resource_utilization_ratio", ObserveUtilization, "1");
        meter.CreateObservableGauge("methodology_resource_saturation_ratio", ObserveSaturation, "1");
    }

    public void RecordRequest(double durationMilliseconds, bool failed, string operation, string scenario, DateTimeOffset? observedAt = null)
    {
        var tags = new TagList { { "operation", operation }, { "outcome", failed ? "error" : "success" }, { "scenario", scenario } };
        _requests.Add(1, tags);
        _requestDuration.Record(durationMilliseconds, tags);
        if (failed) _requestErrors.Add(1, tags);
    }

    public void RecordResource(string resource, double utilizationRatio, double saturationRatio, int errorCount, string scenario, DateTimeOffset? observedAt = null)
    {
        _latestResources[resource] = new(Math.Clamp(utilizationRatio, 0, 1), Math.Clamp(saturationRatio, 0, 1), scenario);
        if (errorCount > 0) _resourceErrors.Add(errorCount, new TagList { { "resource", resource }, { "scenario", scenario } });
    }

    private IEnumerable<Measurement<double>> ObserveUtilization() => _latestResources.Select(item =>
        new Measurement<double>(item.Value.Utilization, new KeyValuePair<string, object?>("resource", item.Key), new KeyValuePair<string, object?>("scenario", item.Value.Scenario)));

    private IEnumerable<Measurement<double>> ObserveSaturation() => _latestResources.Select(item =>
        new Measurement<double>(item.Value.Saturation, new KeyValuePair<string, object?>("resource", item.Key), new KeyValuePair<string, object?>("scenario", item.Value.Scenario)));

    private sealed record ResourceMeasurement(double Utilization, double Saturation, string Scenario);
}
