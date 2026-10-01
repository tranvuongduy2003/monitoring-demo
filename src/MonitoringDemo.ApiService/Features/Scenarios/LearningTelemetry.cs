using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Observability;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Scenarios;

public sealed class LearningTelemetry
{
    private static readonly string[] DataSources = ["prometheus", "loki", "tempo"];
    private static readonly string[] Dashboards = ["api-metrics", "application-monitoring", "logs-correlation", "signal-correlation"];
    private readonly Counter<long> _grafanaViews;
    private readonly Counter<long> _grafanaQueries;
    private readonly Counter<long> _grafanaErrors;
    private readonly Histogram<double> _grafanaDuration;
    private readonly Counter<long> _correlationOperations;
    private readonly Counter<long> _correlationFailures;
    private readonly Histogram<double> _correlationDuration;
    private readonly Counter<long> _alertEvaluations;
    private readonly Counter<long> _alertNotifications;
    private readonly Counter<long> _suppressedNotifications;
    private readonly ConcurrentDictionary<string, SignalValue> _alertSignals = new();
    private readonly ConcurrentDictionary<string, double> _activeAlertStates = new();
    private readonly AppActivitySource _activitySource;
    private readonly ILogger<LearningTelemetry> _logger;
    private int _activeGrafanaAlerts;

    public LearningTelemetry(IMeterFactory meterFactory, AppActivitySource activitySource, ILogger<LearningTelemetry> logger)
    {
        _activitySource = activitySource;
        _logger = logger;
        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _grafanaViews = meter.CreateCounter<long>("grafana_demo_dashboard_views_total", "{view}");
        _grafanaQueries = meter.CreateCounter<long>("grafana_demo_query_runs_total", "{query}");
        _grafanaErrors = meter.CreateCounter<long>("grafana_demo_query_errors_total", "{error}");
        _grafanaDuration = meter.CreateHistogram<double>("grafana_demo_query_duration_ms", "ms");
        meter.CreateObservableGauge("grafana_demo_active_alerts", () => Volatile.Read(ref _activeGrafanaAlerts), "{alert}");

        _correlationOperations = meter.CreateCounter<long>("correlation_demo_operations_total", "{operation}");
        _correlationFailures = meter.CreateCounter<long>("correlation_demo_failures_total", "{operation}");
        _correlationDuration = meter.CreateHistogram<double>("correlation_demo_duration_ms", "ms");

        _alertEvaluations = meter.CreateCounter<long>("alerting_demo_rule_evaluations_total", "{evaluation}");
        _alertNotifications = meter.CreateCounter<long>("alerting_demo_notifications_total", "{notification}");
        _suppressedNotifications = meter.CreateCounter<long>("alerting_demo_suppressed_notifications_total", "{notification}");
        meter.CreateObservableGauge("alerting_demo_signal_value", ObserveAlertSignals);
        meter.CreateObservableGauge("alerting_demo_active_instances", ObserveActiveAlerts, "{alert}");
    }

    public void SeedForScenario(string scenarioId, int requestedCount)
    {
        int count = Math.Clamp(requestedCount, 1, 120);
        bool degraded = scenarioId is "dependency-outage" or "cache-pressure";
        var random = new Random(HashCode.Combine(Environment.TickCount64, scenarioId));

        for (int index = 0; index < count; index++)
        {
            string dataSource = DataSources[index % DataSources.Length];
            var tags = new TagList
            {
                { "grafana.datasource", dataSource },
                { "grafana.dashboard", Dashboards[random.Next(Dashboards.Length)] }
            };
            bool failed = degraded && index % 7 == 0;
            _grafanaQueries.Add(1, tags);
            _grafanaDuration.Record(failed ? random.Next(750, 1_500) : random.Next(20, 420), tags);
            if (index % 4 == 0) _grafanaViews.Add(1, tags);
            if (failed) _grafanaErrors.Add(1, tags);
        }

        int correlationCount = Math.Clamp(count / 6, 2, 20);
        for (int index = 0; index < correlationCount; index++)
        {
            bool failed = degraded && index % 4 == 0;
            string outcome = failed ? "error" : "success";
            string region = index % 2 == 0 ? "ap-southeast" : "eu-west";
            double duration = failed ? random.Next(900, 1_600) : random.Next(90, 700);
            using var activity = _activitySource.Source.StartActivity("CorrelatedScenarioOperation", ActivityKind.Internal);
            activity?.SetTag("scenario.id", scenarioId);
            activity?.SetTag("operation", "checkout");
            activity?.SetTag("outcome", outcome);
            activity?.SetTag("region", region);
            activity?.SetStatus(failed ? ActivityStatusCode.Error : ActivityStatusCode.Ok);
            var tags = new TagList { { "operation", "checkout" }, { "outcome", outcome }, { "region", region } };
            _correlationOperations.Add(1, tags);
            _correlationDuration.Record(duration, tags);
            if (failed) _correlationFailures.Add(1, tags);

            using var scope = _logger.BeginApplicationScope(new ApplicationLogScope
            {
                EventName = failed ? "correlation_failed" : "correlation_completed",
                CorrelationId = $"correlation-{scenarioId}-{index + 1:000}",
                TraceId = activity?.TraceId.ToString(),
                SpanId = activity?.SpanId.ToString(),
                Scenario = scenarioId,
                SeedData = true
            });
            _logger.Log(failed ? LogLevel.Warning : LogLevel.Information,
                "Correlated scenario operation {Operation} completed with {Outcome} in {DurationMilliseconds} ms",
                index + 1, outcome, duration);
        }

        SetAlertState(scenarioId switch
        {
            "dependency-outage" => "firing",
            "traffic-spike" or "cache-pressure" => "pending",
            _ => "normal"
        });
    }

    public void RecordNotification() =>
        _alertNotifications.Add(1, new TagList { { "channel", "webhook" }, { "status", "delivered" } });

    private void SetAlertState(string state)
    {
        bool pending = state == "pending";
        bool firing = state == "firing";
        _alertSignals["checkout-error-rate"] = new(firing ? 24 : pending ? 12 : 2, "percent");
        _alertSignals["api-p95-latency"] = new(firing ? 1_450 : pending ? 890 : 220, "ms");
        _alertSignals["worker-queue-depth"] = new(firing ? 130 : pending ? 92 : 18, "items");
        _activeAlertStates["pending"] = pending ? 2 : 0;
        _activeAlertStates["firing"] = firing ? 3 : 0;
        Volatile.Write(ref _activeGrafanaAlerts, firing ? 3 : pending ? 2 : 0);

        foreach (string rule in _alertSignals.Keys)
        {
            _alertEvaluations.Add(1, new TagList { { "rule", rule }, { "state", state } });
        }
        if (pending || firing)
        {
            _alertNotifications.Add(1, new TagList { { "channel", "operations-chat" }, { "status", firing ? "sent" : "pending" } });
            _suppressedNotifications.Add(pending ? 1 : 2, new TagList { { "reason", "grouping" } });
        }
    }

    private IEnumerable<Measurement<double>> ObserveAlertSignals() => _alertSignals.Select(item =>
        new Measurement<double>(item.Value.Value,
            new KeyValuePair<string, object?>("rule", item.Key),
            new KeyValuePair<string, object?>("unit", item.Value.Unit)));

    private IEnumerable<Measurement<double>> ObserveActiveAlerts() => _activeAlertStates.Select(item =>
        new Measurement<double>(item.Value, new KeyValuePair<string, object?>("state", item.Key)));

    private sealed record SignalValue(double Value, string Unit);
}
