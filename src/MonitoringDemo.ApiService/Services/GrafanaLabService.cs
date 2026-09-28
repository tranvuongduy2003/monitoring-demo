using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Observability;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public sealed class GrafanaLabService
{
    private const int MaximumSamples = 8_000;
    private static readonly string[] DataSourceNames = ["Prometheus", "Loki", "Tempo"];
    private static readonly string[] DashboardNames = ["Grafana Fundamentals", "API Metrics", "Logs & Correlation", "Signal Correlation"];
    private static readonly string[] PanelTypes = ["Time series", "Stat", "Logs", "Table", "Heatmap", "Gauge"];

    private readonly MetricsDemoSeeder _metricsSeeder;
    private readonly TracingDemoSeeder _tracingSeeder;
    private readonly AppMetrics _appMetrics;
    private readonly AppActivitySource _activitySource;
    private readonly FundamentalAlertingService _alerting;
    private readonly ILogger<GrafanaLabService> _logger;
    private readonly Counter<long> _dashboardViews;
    private readonly Counter<long> _queryRuns;
    private readonly Counter<long> _queryErrors;
    private readonly Histogram<double> _queryDuration;
    private readonly Counter<long> _correlationOperations;
    private readonly Counter<long> _correlationFailures;
    private readonly Histogram<double> _correlationDuration;
    private readonly ConcurrentQueue<GrafanaSample> _samples = new();
    private readonly ConcurrentQueue<CorrelationSample> _correlationSamples = new();
    private int _sampleCount;
    private int _correlationSampleCount;
    private int _seedRun;
    private int _correlationSeedRun;
    private int _correlationSequence;
    private int _activeAlerts;

    public GrafanaLabService(
        MetricsDemoSeeder metricsSeeder,
        TracingDemoSeeder tracingSeeder,
        AppMetrics appMetrics,
        AppActivitySource activitySource,
        FundamentalAlertingService alerting,
        IMeterFactory meterFactory,
        ILogger<GrafanaLabService> logger)
    {
        _metricsSeeder = metricsSeeder;
        _tracingSeeder = tracingSeeder;
        _appMetrics = appMetrics;
        _activitySource = activitySource;
        _alerting = alerting;
        _logger = logger;

        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _dashboardViews = meter.CreateCounter<long>("grafana_demo_dashboard_views_total", unit: "{view}");
        _queryRuns = meter.CreateCounter<long>("grafana_demo_query_runs_total", unit: "{query}");
        _queryErrors = meter.CreateCounter<long>("grafana_demo_query_errors_total", unit: "{error}");
        // The instrument name already carries the unit suffix; omitting unit keeps the
        // Prometheus name stable as grafana_demo_query_duration_ms_bucket.
        _queryDuration = meter.CreateHistogram<double>("grafana_demo_query_duration_ms");
        _correlationOperations = meter.CreateCounter<long>("correlation_demo_operations_total", unit: "{operation}");
        _correlationFailures = meter.CreateCounter<long>("correlation_demo_failures_total", unit: "{operation}");
        _correlationDuration = meter.CreateHistogram<double>(
            "correlation_demo_duration_ms",
            description: "Duration of operations carrying correlated logs, metrics, and traces");
        meter.CreateObservableGauge("grafana_demo_active_alerts", () => Volatile.Read(ref _activeAlerts), unit: "{alert}");
    }

    public GrafanaSeedResult Seed(int requestedCount)
    {
        int count = Math.Clamp(requestedCount, 1, 500);
        int run = Interlocked.Increment(ref _seedRun);
        var random = new Random(20260928 + run);
        var now = DateTimeOffset.UtcNow;

        for (int index = 0; index < count; index++)
        {
            string dataSource = DataSourceNames[(index + run) % DataSourceNames.Length];
            string dashboard = DashboardNames[random.Next(DashboardNames.Length)];
            string panelType = PanelTypes[random.Next(PanelTypes.Length)];
            bool failed = (index + run) % 19 == 0;
            bool annotated = (index + run) % 13 == 0;
            double duration = failed ? random.Next(700, 1_450) : random.Next(18, 460);
            var timestamp = now.AddSeconds(-random.Next(0, 60 * 60));

            var commonTags = new TagList
            {
                { "grafana.datasource", dataSource.ToLowerInvariant() },
                { "grafana.dashboard", dashboard.ToLowerInvariant().Replace(' ', '-') }
            };
            _dashboardViews.Add(index % 4 == 0 ? 1 : 0, commonTags);
            _queryRuns.Add(1, commonTags);
            _queryDuration.Record(duration, commonTags);
            if (failed) _queryErrors.Add(1, commonTags);

            AddSample(new GrafanaSample(timestamp, dataSource, dashboard, panelType, duration, failed, annotated));

            if (failed)
            {
                _logger.LogWarning(
                    "Grafana seed query failed for {DataSource} on {Dashboard} after {DurationMilliseconds} ms in run {SeedRun}",
                    dataSource, dashboard, duration, run);
            }
        }

        Volatile.Write(ref _activeAlerts, run % 4 == 0 ? 1 : 0);

        // Populate the actual backends as well as the deterministic teaching model.
        _metricsSeeder.Seed(Math.Min(count, 240), writeLog: false);
        var traces = _tracingSeeder.Seed(Math.Clamp(count / 12, 3, 24));
        var correlations = SeedCorrelationsCore(Math.Clamp(count / 15, 3, 24), run);
        _logger.LogInformation(
            "Seeded {GrafanaInteractionCount} Grafana interactions, {TraceCount} teaching traces, and {CorrelationCount} correlated operations for run {SeedRun}",
            count, traces.TraceIds.Count, correlations.Seeded, run);

        return new GrafanaSeedResult(
            count,
            run,
            traces.TraceIds.Count + correlations.Seeded,
            correlations.Seeded,
            GetAnalytics(60),
            correlations.Analytics);
    }

    public GrafanaCorrelationSeedResult SeedCorrelations(int requestedCount)
    {
        int run = Interlocked.Increment(ref _correlationSeedRun);
        return SeedCorrelationsCore(requestedCount, run);
    }

    public GrafanaOverview GetOverview(int requestedWindowMinutes)
    {
        int windowMinutes = Math.Clamp(requestedWindowMinutes, 5, 240);
        return new GrafanaOverview(
            DateTimeOffset.UtcNow,
            windowMinutes,
            GetAnalytics(windowMinutes),
            DataSources,
            Dashboards,
            Panels,
            Queries,
            Variables,
            ExploreExamples,
            Annotations,
            _alerting.GetRuleDefinitions(),
            FundamentalAlertingService.GetNotificationChannels(),
            FundamentalAlertingService.GetFatiguePractices(),
            _alerting.GetAnalytics(windowMinutes),
            Correlations,
            GetCorrelationAnalytics(windowMinutes));
    }

    private GrafanaCorrelationSeedResult SeedCorrelationsCore(int requestedCount, int run)
    {
        int count = Math.Clamp(requestedCount, 1, 100);
        var random = new Random(20260929 + run);

        for (int index = 0; index < count; index++)
        {
            int sequence = Interlocked.Increment(ref _correlationSequence);
            string correlationId = $"correlation-{run:000}-{sequence:00000}";
            string region = sequence % 2 == 0 ? "ap-southeast" : "eu-west";
            string status = sequence % 7 == 0 ? "Failed" : "Completed";
            bool failed = status == "Failed";
            double duration = failed ? random.Next(900, 1_550) : random.Next(90, 780);
            var timestamp = DateTimeOffset.UtcNow;
            var previousActivity = Activity.Current;

            try
            {
                Activity.Current = null;
                using var root = _activitySource.Source.StartActivity("CorrelatedCheckout", ActivityKind.Server);
                if (root is null) continue;

                root.SetTag("demo.correlation", true);
                root.SetTag("correlation.id", correlationId);
                root.SetTag("region", region);
                root.SetTag("order.status", status);
                root.SetTag("operation", "checkout");
                root.SetTag("outcome", status.ToLowerInvariant());
                root.SetTag("service.name", TelemetryConstants.ServiceName);
                root.AddEvent(new ActivityEvent("correlation.started"));

                using (var scope = BeginCorrelationScope(
                    "correlation_started",
                    correlationId,
                    root.TraceId.ToString(),
                    root.SpanId.ToString(),
                    region))
                {
                    _logger.LogInformation(
                        "Correlation demo operation {CorrelationId} started in {Region}",
                        correlationId,
                        region);
                }

                string metricSpanId;
                using (var child = _activitySource.Source.StartActivity("CorrelatedPayment", ActivityKind.Client))
                {
                    metricSpanId = child?.SpanId.ToString() ?? root.SpanId.ToString();
                    child?.SetTag("demo.correlation", true);
                    child?.SetTag("correlation.id", correlationId);
                    child?.SetTag("payment.outcome", failed ? "declined" : "authorized");
                    child?.SetTag("operation", "checkout");
                    child?.SetTag("outcome", status.ToLowerInvariant());
                    child?.SetStatus(failed ? ActivityStatusCode.Error : ActivityStatusCode.Ok);

                    var tags = new TagList
                    {
                        { "service.name", TelemetryConstants.ServiceName },
                        { "operation", "checkout" },
                        { "outcome", status.ToLowerInvariant() },
                        { "region", region }
                    };
                    _correlationOperations.Add(1, tags);
                    _correlationDuration.Record(duration, tags);
                    if (failed) _correlationFailures.Add(1, tags);

                    using var scope = BeginCorrelationScope(
                        failed ? "correlation_failed" : "correlation_completed",
                        correlationId,
                        root.TraceId.ToString(),
                        metricSpanId,
                        region);
                    if (failed)
                    {
                        _logger.LogWarning(
                            "Correlation demo operation {CorrelationId} failed after {DurationMilliseconds} ms",
                            correlationId,
                            duration);
                    }
                    else
                    {
                        _logger.LogInformation(
                            "Correlation demo operation {CorrelationId} completed after {DurationMilliseconds} ms",
                            correlationId,
                            duration);
                    }
                }

                // This histogram is also recorded under the root span, demonstrating that
                // regular application instruments gain exemplars without a separate API.
                _appMetrics.RecordOrderProcessed(duration, status, "Correlation", "correlation-seed");
                root.SetStatus(failed ? ActivityStatusCode.Error : ActivityStatusCode.Ok);
                root.AddEvent(new ActivityEvent(failed ? "correlation.failed" : "correlation.completed"));

                AddCorrelationSample(new CorrelationSample(
                    timestamp,
                    correlationId,
                    root.TraceId.ToString(),
                    root.SpanId.ToString(),
                    metricSpanId,
                    duration,
                    failed));
            }
            finally
            {
                Activity.Current = previousActivity;
            }
        }

        var analytics = GetCorrelationAnalytics(60);
        return new GrafanaCorrelationSeedResult(count, run, analytics);
    }

    private IDisposable? BeginCorrelationScope(
        string eventName,
        string correlationId,
        string traceId,
        string spanId,
        string region) =>
        _logger.BeginApplicationScope(new ApplicationLogScope
        {
            EventName = eventName,
            CorrelationId = correlationId,
            RequestId = $"seed-{correlationId}",
            TraceId = traceId,
            SpanId = spanId,
            Region = region,
            TenantId = "correlation-lab",
            SeedData = true
        });

    private CorrelationAnalytics GetCorrelationAnalytics(int windowMinutes)
    {
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-windowMinutes);
        var samples = _correlationSamples
            .Where(sample => sample.Timestamp >= cutoff)
            .OrderBy(sample => sample.Timestamp)
            .ToArray();
        var durations = samples.Select(sample => sample.DurationMilliseconds).Order().ToArray();
        var timeline = samples
            .GroupBy(sample => new DateTimeOffset(
                sample.Timestamp.Year,
                sample.Timestamp.Month,
                sample.Timestamp.Day,
                sample.Timestamp.Hour,
                sample.Timestamp.Minute,
                0,
                TimeSpan.Zero))
            .Select(group => new CorrelationTimelinePoint(
                group.Key,
                group.Count(),
                group.Count(item => item.Failed),
                group.Count()))
            .ToArray();
        var recent = samples
            .OrderByDescending(sample => sample.Timestamp)
            .Take(12)
            .Select(sample => new CorrelationRecentOperation(
                sample.Timestamp,
                sample.CorrelationId,
                sample.TraceId,
                sample.RootSpanId,
                sample.MetricSpanId,
                Math.Round(sample.DurationMilliseconds, 1),
                sample.Failed ? "Failed" : "Completed"))
            .ToArray();

        return new CorrelationAnalytics(
            samples.Length,
            samples.Length * 2,
            samples.Length * 2,
            samples.Length,
            samples.Select(sample => sample.TraceId).Distinct(StringComparer.Ordinal).Count(),
            samples.SelectMany(sample => new[] { sample.RootSpanId, sample.MetricSpanId }).Distinct(StringComparer.Ordinal).Count(),
            samples.Length == 0 ? 0 : Math.Round(samples.Average(sample => sample.DurationMilliseconds), 1),
            Percentile(durations, 0.95),
            timeline,
            recent);
    }

    private GrafanaAnalytics GetAnalytics(int windowMinutes)
    {
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-windowMinutes);
        var samples = _samples.Where(sample => sample.Timestamp >= cutoff).OrderBy(sample => sample.Timestamp).ToArray();
        var durations = samples.Select(sample => sample.DurationMilliseconds).Order().ToArray();

        var timeline = samples
            .GroupBy(sample => new DateTimeOffset(sample.Timestamp.Year, sample.Timestamp.Month, sample.Timestamp.Day, sample.Timestamp.Hour, sample.Timestamp.Minute, 0, TimeSpan.Zero))
            .Select(group => new GrafanaTimelinePoint(group.Key, group.Count(), group.Count(item => item.Failed), group.Count(item => item.Annotated)))
            .ToArray();
        var usage = DataSourceNames.Select(name =>
        {
            var sourceSamples = samples.Where(sample => sample.DataSource == name).ToArray();
            return new GrafanaDataSourceUsage(name, sourceSamples.Length, sourceSamples.Count(item => item.Failed), sourceSamples.Length == 0 ? 0 : Math.Round(sourceSamples.Average(item => item.DurationMilliseconds), 1));
        }).ToArray();
        var panelUsage = PanelTypes.Select(type => new GrafanaPanelUsage(type, samples.Count(sample => sample.PanelType == type))).ToArray();
        var recent = samples.OrderByDescending(sample => sample.Timestamp).Take(12)
            .Select(sample => new GrafanaRecentActivity(sample.Timestamp, sample.Dashboard, sample.DataSource, sample.PanelType, Math.Round(sample.DurationMilliseconds, 1), sample.Failed ? "Error" : "Success"))
            .ToArray();

        return new GrafanaAnalytics(
            samples.Length,
            samples.Length / 4,
            samples.Count(sample => sample.Failed),
            samples.Count(sample => sample.Annotated),
            durations.Length == 0 ? 0 : Math.Round(durations.Average(), 1),
            Percentile(durations, 0.95),
            Volatile.Read(ref _activeAlerts),
            timeline,
            usage,
            panelUsage,
            recent);
    }

    private void AddSample(GrafanaSample sample)
    {
        _samples.Enqueue(sample);
        int count = Interlocked.Increment(ref _sampleCount);
        while (count > MaximumSamples && _samples.TryDequeue(out _))
            count = Interlocked.Decrement(ref _sampleCount);
    }

    private void AddCorrelationSample(CorrelationSample sample)
    {
        _correlationSamples.Enqueue(sample);
        int count = Interlocked.Increment(ref _correlationSampleCount);
        while (count > MaximumSamples && _correlationSamples.TryDequeue(out _))
            count = Interlocked.Decrement(ref _correlationSampleCount);
    }

    private static double Percentile(double[] values, double percentile)
    {
        if (values.Length == 0) return 0;
        int index = (int)Math.Ceiling(values.Length * percentile) - 1;
        return Math.Round(values[Math.Clamp(index, 0, values.Length - 1)], 1);
    }

    private static readonly IReadOnlyList<GrafanaDataSource> DataSources =
    [
        new("Prometheus", "prometheus", "Metrics", "http://host.docker.internal:9090", true, "PromQL", "Counters, gauges, histograms, and alert state"),
        new("Loki", "loki", "Logs", "http://host.docker.internal:3100", false, "LogQL", "Structured logs with trace and span correlation"),
        new("Tempo", "tempo", "Traces", "http://host.docker.internal:3200", false, "TraceQL", "Distributed traces, service graph, and span search")
    ];

    private static readonly IReadOnlyList<GrafanaDashboardDefinition> Dashboards =
    [
        new("grafana-fundamentals", "Grafana Fundamentals", "Provisioned", 8, "Variables, mixed signals, annotations, and alert health"),
        new("fundamental-alerting", "Fundamental Alerting", "Provisioned", 9, "Thresholds, state transitions, routing, notifications, and fatigue analytics"),
        new("monitoring-demo", "API Metrics", "Provisioned", 12, "Application and runtime Prometheus analytics"),
        new("monitoring-demo-logs", "Logs & Correlation", "Provisioned", 5, "Loki volume, errors, slow operations, and raw logs"),
        new("signal-correlation", "Signal Correlation", "Provisioned", 5, "Bidirectional logs, metrics, traces, IDs, and exemplars")
    ];

    private static readonly IReadOnlyList<GrafanaPanelDefinition> Panels =
    [
        new("Time series", "Query volume by data source", "Trend and compare values over time", "Lines", "rate(grafana_demo_query_runs_total[$__rate_interval])"),
        new("Stat", "Query success rate", "Show one reduced KPI", "Threshold colors", "1 - errors / runs"),
        new("Gauge", "p95 query latency", "Compare a value with thresholds", "Milliseconds", "histogram_quantile(0.95, ...)"),
        new("Logs", "Seeded Grafana events", "Read and inspect log lines", "Newest first", "{service_name=\"MonitoringDemo.ApiService\"} |= `Grafana`"),
        new("Table", "Queries by source", "Compare labeled series as rows", "Labels to fields", "sum by (grafana_datasource) (...)"),
        new("Heatmap", "Query latency distribution", "See a histogram evolve over time", "Bucket density", "sum by (le) (rate(..._bucket[$__rate_interval]))")
    ];

    private static readonly IReadOnlyList<GrafanaQueryDefinition> Queries =
    [
        new("PromQL", "Query rate", "sum by (grafana_datasource) (rate(grafana_demo_query_runs_total{grafana_datasource=~\"$datasource\"}[$__rate_interval]))", "Range", "Grafana expands variables and the rate interval before sending the request."),
        new("PromQL", "p95 latency", "histogram_quantile(0.95, sum by (le) (rate(grafana_demo_query_duration_ms_bucket[$__rate_interval])))", "Range", "The panel transforms cumulative histogram buckets into a percentile."),
        new("LogQL", "Grafana seed logs", "{service_name=\"MonitoringDemo.ApiService\"} |= `Grafana`", "Range", "A stream selector narrows labels, then a line filter keeps matching events."),
        new("TraceQL", "Slow or failed traces", "{ duration > 1s || status = error }", "Search", "Tempo searches trace spans using structural and intrinsic fields.")
    ];

    private static readonly IReadOnlyList<GrafanaVariableDefinition> Variables =
    [
        new("datasource", "Query", "label_values(grafana_demo_query_runs_total, grafana_datasource)", "All", true, "Filters panels without duplicating dashboards."),
        new("dashboard", "Custom", "grafana-fundamentals,api-metrics,logs-correlation", "grafana-fundamentals", false, "Demonstrates a fixed, reusable selection."),
        new("interval", "Interval", "1m,5m,15m,1h", "5m", false, "Controls aggregation windows for rate and count queries."),
        new("__rate_interval", "Built-in", "Calculated from panel resolution and scrape interval", "Automatic", false, "Prevents rate windows that are too short for the data source.")
    ];

    private static readonly IReadOnlyList<GrafanaExploreExample> ExploreExamples =
    [
        new("Metrics", "Prometheus", "sum by (order_status) (rate(orders_created_total[5m]))", "Run query, inspect labels, then split the view with logs."),
        new("Logs", "Loki", "{service_name=\"MonitoringDemo.ApiService\"} | severity_text =~ `(?i)warning|error`", "Expand a log, copy its trace_id, and open the trace."),
        new("Traces", "Tempo", "{ resource.service.name = \"MonitoringDemo.ApiService\" && duration > 500ms }", "Inspect the span waterfall and follow linked logs.")
    ];

    private static readonly IReadOnlyList<GrafanaAnnotationDefinition> Annotations =
    [
        new("Seeded warning events", "Loki", "{service_name=\"MonitoringDemo.ApiService\"} |= `Grafana seed query failed`", "grafana,seed,error", true),
        new("Manual deployment", "Dashboard", "Created from the dashboard annotation UI", "deployment,manual", false)
    ];

    private static readonly IReadOnlyList<GrafanaCorrelationDefinition> Correlations =
    [
        new("Logs ↔ Traces", "Loki ↔ Tempo", "trace_id", "Loki derived field + Tempo tracesToLogsV2", "{service_name=\"MonitoringDemo.ApiService\"} | trace_id = `<trace-id>`", "Open a log's View trace link, then use Logs for this span to return to the exact log window."),
        new("Metrics ↔ Traces", "Prometheus ↔ Tempo", "operation + outcome", "Tempo tracesToMetrics + Prometheus exemplar destination", "histogram_quantile(0.95, sum by (le) (rate(correlation_demo_duration_ms_bucket[$__rate_interval])))", "Open Metrics for this span from Tempo; click an exemplar diamond in the metric graph to return to Tempo."),
        new("Trace ID correlation", "All signals", "trace_id", "W3C 128-bit trace identity", "{service_name=\"MonitoringDemo.ApiService\"} | trace_id = `<trace-id>`", "Use one trace ID to group every correlated log and span across the operation."),
        new("Span ID correlation", "Logs ↔ exact span", "span_id", "Tempo filterBySpanID", "{service_name=\"MonitoringDemo.ApiService\"} | trace_id = `<trace-id>` | span_id = `<span-id>`", "Filter a trace's logs to the selected 64-bit span instead of every log in the trace."),
        new("Fundamental Exemplars", "Metric sample → trace", "trace_id + span_id", "TraceBased exemplar filter + Prometheus exemplar storage", "correlation_demo_duration_ms_bucket", "Measurements recorded under an active sampled span carry an exemplar; Grafana renders it as a clickable diamond.")
    ];
}

public sealed class GrafanaSeedService : BackgroundService
{
    private readonly GrafanaLabService _lab;
    public GrafanaSeedService(GrafanaLabService lab) => _lab = lab;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(6), stoppingToken);
            _lab.Seed(180);
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            while (await timer.WaitForNextTickAsync(stoppingToken)) _lab.Seed(8);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}

public sealed record GrafanaOverview(DateTimeOffset GeneratedAt, int WindowMinutes, GrafanaAnalytics Analytics, IReadOnlyList<GrafanaDataSource> DataSources, IReadOnlyList<GrafanaDashboardDefinition> Dashboards, IReadOnlyList<GrafanaPanelDefinition> Panels, IReadOnlyList<GrafanaQueryDefinition> Queries, IReadOnlyList<GrafanaVariableDefinition> Variables, IReadOnlyList<GrafanaExploreExample> Explore, IReadOnlyList<GrafanaAnnotationDefinition> Annotations, IReadOnlyList<GrafanaAlertRuleDefinition> Alerting, IReadOnlyList<AlertNotificationChannel> NotificationChannels, IReadOnlyList<AlertFatiguePractice> AlertFatigue, AlertingAnalytics AlertingAnalytics, IReadOnlyList<GrafanaCorrelationDefinition> Correlations, CorrelationAnalytics CorrelationAnalytics);
public sealed record GrafanaSeedResult(int Seeded, int Run, int TraceCount, int CorrelationCount, GrafanaAnalytics Analytics, CorrelationAnalytics CorrelationAnalytics);
public sealed record GrafanaCorrelationSeedResult(int Seeded, int Run, CorrelationAnalytics Analytics);
public sealed record GrafanaAnalytics(int QueryCount, int DashboardViewCount, int ErrorCount, int AnnotationCount, double AverageQueryDurationMilliseconds, double P95QueryDurationMilliseconds, int ActiveAlerts, IReadOnlyList<GrafanaTimelinePoint> Timeline, IReadOnlyList<GrafanaDataSourceUsage> DataSourceUsage, IReadOnlyList<GrafanaPanelUsage> PanelUsage, IReadOnlyList<GrafanaRecentActivity> RecentActivity);
public sealed record GrafanaTimelinePoint(DateTimeOffset Timestamp, int Queries, int Errors, int Annotations);
public sealed record GrafanaDataSourceUsage(string Name, int QueryCount, int ErrorCount, double AverageDurationMilliseconds);
public sealed record GrafanaPanelUsage(string Type, int ViewCount);
public sealed record GrafanaRecentActivity(DateTimeOffset Timestamp, string Dashboard, string DataSource, string PanelType, double DurationMilliseconds, string Status);
public sealed record GrafanaDataSource(string Name, string Uid, string Signal, string Url, bool IsDefault, string QueryLanguage, string Purpose);
public sealed record GrafanaDashboardDefinition(string Uid, string Title, string Source, int PanelCount, string Purpose);
public sealed record GrafanaPanelDefinition(string Type, string Title, string UseWhen, string Display, string Query);
public sealed record GrafanaQueryDefinition(string Language, string Title, string Expression, string QueryType, string Explanation);
public sealed record GrafanaVariableDefinition(string Name, string Type, string Definition, string Current, bool MultiValue, string Purpose);
public sealed record GrafanaExploreExample(string Signal, string DataSource, string Query, string Workflow);
public sealed record GrafanaAnnotationDefinition(string Name, string Source, string Query, string Tags, bool Enabled);
public sealed record GrafanaAlertRuleDefinition(string Uid, string Title, string Group, string DataSource, string Query, string Condition, string For, string NoDataState, string ErrorState, string Severity, string State, string Source);
public sealed record GrafanaCorrelationDefinition(string Title, string Signals, string JoinKey, string Configuration, string Query, string Workflow);
public sealed record CorrelationAnalytics(int OperationCount, int LogCount, int MetricPointCount, int ExemplarCount, int UniqueTraceIds, int UniqueSpanIds, double AverageDurationMilliseconds, double P95DurationMilliseconds, IReadOnlyList<CorrelationTimelinePoint> Timeline, IReadOnlyList<CorrelationRecentOperation> RecentOperations);
public sealed record CorrelationTimelinePoint(DateTimeOffset Timestamp, int Operations, int Failures, int Exemplars);
public sealed record CorrelationRecentOperation(DateTimeOffset Timestamp, string CorrelationId, string TraceId, string RootSpanId, string MetricSpanId, double DurationMilliseconds, string Status);
internal sealed record GrafanaSample(DateTimeOffset Timestamp, string DataSource, string Dashboard, string PanelType, double DurationMilliseconds, bool Failed, bool Annotated);
internal sealed record CorrelationSample(DateTimeOffset Timestamp, string CorrelationId, string TraceId, string RootSpanId, string MetricSpanId, double DurationMilliseconds, bool Failed);
