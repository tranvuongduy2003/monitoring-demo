using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public sealed class GrafanaLabService
{
    private const int MaximumSamples = 8_000;
    private static readonly string[] DataSourceNames = ["Prometheus", "Loki", "Tempo"];
    private static readonly string[] DashboardNames = ["Grafana Fundamentals", "API Metrics", "Logs & Correlation"];
    private static readonly string[] PanelTypes = ["Time series", "Stat", "Logs", "Table", "Heatmap", "Gauge"];

    private readonly MetricsDemoSeeder _metricsSeeder;
    private readonly TracingDemoSeeder _tracingSeeder;
    private readonly ILogger<GrafanaLabService> _logger;
    private readonly Counter<long> _dashboardViews;
    private readonly Counter<long> _queryRuns;
    private readonly Counter<long> _queryErrors;
    private readonly Histogram<double> _queryDuration;
    private readonly ConcurrentQueue<GrafanaSample> _samples = new();
    private int _sampleCount;
    private int _seedRun;
    private int _activeAlerts;

    public GrafanaLabService(
        MetricsDemoSeeder metricsSeeder,
        TracingDemoSeeder tracingSeeder,
        IMeterFactory meterFactory,
        ILogger<GrafanaLabService> logger)
    {
        _metricsSeeder = metricsSeeder;
        _tracingSeeder = tracingSeeder;
        _logger = logger;

        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _dashboardViews = meter.CreateCounter<long>("grafana_demo_dashboard_views_total", unit: "{view}");
        _queryRuns = meter.CreateCounter<long>("grafana_demo_query_runs_total", unit: "{query}");
        _queryErrors = meter.CreateCounter<long>("grafana_demo_query_errors_total", unit: "{error}");
        // The instrument name already carries the unit suffix; omitting unit keeps the
        // Prometheus name stable as grafana_demo_query_duration_ms_bucket.
        _queryDuration = meter.CreateHistogram<double>("grafana_demo_query_duration_ms");
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
        _logger.LogInformation(
            "Seeded {GrafanaInteractionCount} Grafana interactions and {TraceCount} correlated traces for run {SeedRun}",
            count, traces.TraceIds.Count, run);

        return new GrafanaSeedResult(count, run, traces.TraceIds.Count, GetAnalytics(60));
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
            AlertRules);
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
        new("monitoring-demo", "API Metrics", "Provisioned", 12, "Application and runtime Prometheus analytics"),
        new("monitoring-demo-logs", "Logs & Correlation", "Provisioned", 5, "Loki volume, errors, slow operations, and raw logs")
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

    private static readonly IReadOnlyList<GrafanaAlertRuleDefinition> AlertRules =
    [
        new("grafana-demo-query-errors", "Grafana demo query errors", "MonitoringDemo", "Prometheus", "sum(increase(grafana_demo_query_errors_total[5m]))", "Above 2", "1m", "NoData", "Normal", "Provisioned"),
        new("high-order-error-rate", "High order error rate", "Prometheus rules", "Prometheus", "job:orders_failed:ratio5m > 0.2", "Above 20%", "2m", "NoData", "Normal", "Data source managed")
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

public sealed record GrafanaOverview(DateTimeOffset GeneratedAt, int WindowMinutes, GrafanaAnalytics Analytics, IReadOnlyList<GrafanaDataSource> DataSources, IReadOnlyList<GrafanaDashboardDefinition> Dashboards, IReadOnlyList<GrafanaPanelDefinition> Panels, IReadOnlyList<GrafanaQueryDefinition> Queries, IReadOnlyList<GrafanaVariableDefinition> Variables, IReadOnlyList<GrafanaExploreExample> Explore, IReadOnlyList<GrafanaAnnotationDefinition> Annotations, IReadOnlyList<GrafanaAlertRuleDefinition> Alerting);
public sealed record GrafanaSeedResult(int Seeded, int Run, int TraceCount, GrafanaAnalytics Analytics);
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
public sealed record GrafanaAlertRuleDefinition(string Uid, string Title, string Group, string DataSource, string Query, string Condition, string For, string NoDataState, string State, string Source);
internal sealed record GrafanaSample(DateTimeOffset Timestamp, string DataSource, string Dashboard, string PanelType, double DurationMilliseconds, bool Failed, bool Annotated);
