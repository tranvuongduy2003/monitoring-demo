using System.Globalization;
using System.Text.Json;

namespace MonitoringDemo.ApiService.Services;

public sealed class PrometheusQueryService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PrometheusQueryService> _logger;
    private readonly string _baseUrl;

    public PrometheusQueryService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<PrometheusQueryService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _baseUrl = (configuration["Prometheus:BaseUrl"] ?? "http://localhost:9090").TrimEnd('/');
    }

    public async Task<PrometheusOverview> GetOverviewAsync(int minutes, CancellationToken cancellationToken)
    {
        var settings = new PrometheusSettings(
            _configuration["Prometheus:ScrapeInterval"] ?? "15s",
            _configuration["Prometheus:ApiScrapeInterval"] ?? "5s",
            _configuration["Prometheus:EvaluationInterval"] ?? "15s",
            _configuration["Prometheus:Retention"] ?? "15d",
            "/metrics",
            "file_sd",
            "30s");

        try
        {
            var targetsTask = GetTargetsAsync(cancellationToken);
            var rulesTask = GetRulesAsync(cancellationToken);
            var storageTask = GetStorageAsync(settings.Retention, cancellationToken);
            var analyticsTask = GetAnalyticsAsync(minutes, cancellationToken);

            await Task.WhenAll(targetsTask, rulesTask, storageTask, analyticsTask);
            var targets = await targetsTask;
            var jobs = targets
                .GroupBy(target => target.Job)
                .Select(group => new PrometheusJob(
                    group.Key,
                    group.Count(),
                    group.Count(target => string.Equals(target.Health, "up", StringComparison.OrdinalIgnoreCase)),
                    group.Select(target => target.Instance).Distinct().Count()))
                .OrderBy(job => job.Name)
                .ToArray();

            return new PrometheusOverview(
                true,
                null,
                DateTimeOffset.UtcNow,
                _baseUrl,
                settings,
                targets,
                jobs,
                await rulesTask,
                await storageTask,
                await analyticsTask);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(exception, "Prometheus learning overview is temporarily unavailable");
            return PrometheusOverview.Unavailable(_baseUrl, settings, exception.Message);
        }
    }

    private async Task<IReadOnlyList<PrometheusTarget>> GetTargetsAsync(CancellationToken cancellationToken)
    {
        using var document = await GetDataAsync("/api/v1/targets?state=any", cancellationToken);
        var targets = new List<PrometheusTarget>();

        if (!document.RootElement.TryGetProperty("activeTargets", out var activeTargets))
        {
            return targets;
        }

        foreach (var target in activeTargets.EnumerateArray())
        {
            var labels = ReadLabels(target, "labels");
            var discoveredLabels = ReadLabels(target, "discoveredLabels");
            labels.TryGetValue("job", out var job);
            labels.TryGetValue("instance", out var instance);

            targets.Add(new PrometheusTarget(
                job ?? target.String("scrapePool") ?? "unknown",
                instance ?? "unknown",
                target.String("scrapeUrl") ?? string.Empty,
                target.String("health") ?? "unknown",
                target.String("lastError") ?? string.Empty,
                target.String("lastScrape"),
                Math.Round(target.Number("lastScrapeDuration"), 4),
                target.String("scrapeInterval") ?? string.Empty,
                labels,
                discoveredLabels));
        }

        return targets;
    }

    private async Task<IReadOnlyList<PrometheusRule>> GetRulesAsync(CancellationToken cancellationToken)
    {
        using var document = await GetDataAsync("/api/v1/rules", cancellationToken);
        var rules = new List<PrometheusRule>();
        if (!document.RootElement.TryGetProperty("groups", out var groups)) return rules;

        foreach (var group in groups.EnumerateArray())
        {
            string groupName = group.String("name") ?? "unnamed";
            if (!group.TryGetProperty("rules", out var groupRules)) continue;

            foreach (var rule in groupRules.EnumerateArray())
            {
                string kind = rule.String("type") ?? (rule.TryGetProperty("state", out _) ? "alerting" : "recording");
                rules.Add(new PrometheusRule(
                    rule.String("name") ?? "unnamed",
                    kind,
                    groupName,
                    rule.String("query") ?? string.Empty,
                    rule.String("health") ?? "unknown",
                    rule.String("state") ?? (kind == "recording" ? "recording" : "inactive"),
                    rule.String("lastError") ?? string.Empty,
                    rule.String("lastEvaluation"),
                    Math.Round(rule.Number("evaluationTime"), 4)));
            }
        }

        return rules;
    }

    private async Task<PrometheusStorage> GetStorageAsync(string configuredRetention, CancellationToken cancellationToken)
    {
        using var document = await GetDataAsync("/api/v1/status/tsdb", cancellationToken);
        var data = document.RootElement;
        var headStats = data.TryGetProperty("headStats", out var value) ? value : default;

        return new PrometheusStorage(
            configuredRetention,
            headStats.Long("numSeries"),
            headStats.Long("chunkCount"),
            FromUnixMilliseconds(headStats.Long("minTime")),
            FromUnixMilliseconds(headStats.Long("maxTime")),
            ReadTopMetrics(data));
    }

    private async Task<PrometheusAnalytics> GetAnalyticsAsync(int minutes, CancellationToken cancellationToken)
    {
        var upTask = QueryScalarAsync("sum(up)", cancellationToken);
        var throughputTask = QueryScalarAsync("sum(job:orders_created:rate5m)", cancellationToken);
        var p95Task = QueryScalarAsync("max(job:order_processing_duration_ms:p95_5m)", cancellationToken);
        var alertsTask = QueryScalarAsync("count(ALERTS{alertstate=\"firing\"})", cancellationToken);
        var rangeTask = QueryRangeAsync(
            "sum(job:orders_created:rate5m)",
            DateTimeOffset.UtcNow.AddMinutes(-minutes),
            DateTimeOffset.UtcNow,
            Math.Max(15, minutes * 60 / 60),
            cancellationToken);

        await Task.WhenAll(upTask, throughputTask, p95Task, alertsTask, rangeTask);
        return new PrometheusAnalytics(
            await upTask,
            Math.Round(await throughputTask, 4),
            Math.Round(await p95Task, 2),
            (int)await alertsTask,
            await rangeTask);
    }

    private async Task<double> QueryScalarAsync(string query, CancellationToken cancellationToken)
    {
        using var document = await GetDataAsync(
            $"/api/v1/query?query={Uri.EscapeDataString(query)}",
            cancellationToken);
        if (!document.RootElement.TryGetProperty("result", out var results)) return 0;
        var first = results.EnumerateArray().FirstOrDefault();
        return first.ValueKind == JsonValueKind.Undefined ? 0 : ReadSampleValue(first, "value");
    }

    private async Task<IReadOnlyList<PrometheusPoint>> QueryRangeAsync(
        string query,
        DateTimeOffset start,
        DateTimeOffset end,
        int stepSeconds,
        CancellationToken cancellationToken)
    {
        string path = "/api/v1/query_range" +
            $"?query={Uri.EscapeDataString(query)}" +
            $"&start={start.ToUnixTimeSeconds()}&end={end.ToUnixTimeSeconds()}&step={stepSeconds}";
        using var document = await GetDataAsync(path, cancellationToken);
        if (!document.RootElement.TryGetProperty("result", out var results)) return [];
        var series = results.EnumerateArray().FirstOrDefault();
        if (series.ValueKind == JsonValueKind.Undefined || !series.TryGetProperty("values", out var values)) return [];

        return values.EnumerateArray()
            .Select(sample => new PrometheusPoint(
                DateTimeOffset.FromUnixTimeSeconds((long)sample[0].GetDouble()),
                ParseDouble(sample[1].GetString())))
            .ToArray();
    }

    private async Task<JsonDocument> GetDataAsync(string path, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync($"{_baseUrl}{path}", cancellationToken);
        response.EnsureSuccessStatusCode();
        using var document = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);

        if (document.RootElement.String("status") != "success")
        {
            throw new HttpRequestException($"Prometheus returned {document.RootElement.String("status") ?? "an error"}.");
        }

        return JsonDocument.Parse(document.RootElement.GetProperty("data").GetRawText());
    }

    private static IReadOnlyDictionary<string, string> ReadLabels(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var labels)) return new Dictionary<string, string>();
        return labels.EnumerateObject().ToDictionary(property => property.Name, property => property.Value.GetString() ?? string.Empty);
    }

    private static IReadOnlyList<PrometheusMetricCount> ReadTopMetrics(JsonElement data)
    {
        if (!data.TryGetProperty("seriesCountByMetricName", out var counts)) return [];
        return counts.EnumerateArray()
            .Take(8)
            .Select(item => new PrometheusMetricCount(item.String("name") ?? "unknown", (long)item.Number("value")))
            .ToArray();
    }

    private static double ReadSampleValue(JsonElement result, string propertyName)
    {
        if (!result.TryGetProperty(propertyName, out var sample) || sample.GetArrayLength() < 2) return 0;
        return ParseDouble(sample[1].GetString());
    }

    private static double ParseDouble(string? value) =>
        double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number)
            ? number
            : 0;

    private static DateTimeOffset? FromUnixMilliseconds(long value) =>
        value > 0 ? DateTimeOffset.FromUnixTimeMilliseconds(value) : null;
}

internal static class PrometheusJsonExtensions
{
    public static string? String(this JsonElement element, string propertyName) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(propertyName, out var value)
            ? value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString()
            : null;

    public static double Number(this JsonElement element, string propertyName)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(propertyName, out var value)) return 0;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number)) return number;
        return double.TryParse(value.ToString(), NumberStyles.Float, CultureInfo.InvariantCulture, out number) ? number : 0;
    }

    public static long Long(this JsonElement element, string propertyName) => (long)element.Number(propertyName);
}

public sealed record PrometheusOverview(
    bool Connected,
    string? Error,
    DateTimeOffset CheckedAt,
    string BaseUrl,
    PrometheusSettings Settings,
    IReadOnlyList<PrometheusTarget> Targets,
    IReadOnlyList<PrometheusJob> Jobs,
    IReadOnlyList<PrometheusRule> Rules,
    PrometheusStorage Storage,
    PrometheusAnalytics Analytics)
{
    public static PrometheusOverview Unavailable(string baseUrl, PrometheusSettings settings, string error) =>
        new(false, error, DateTimeOffset.UtcNow, baseUrl, settings, [], [], [],
            new PrometheusStorage(settings.Retention, 0, 0, null, null, []),
            new PrometheusAnalytics(0, 0, 0, 0, []));
}

public sealed record PrometheusSettings(
    string GlobalScrapeInterval,
    string ApiScrapeInterval,
    string EvaluationInterval,
    string Retention,
    string MetricsPath,
    string DiscoveryMechanism,
    string DiscoveryRefreshInterval);

public sealed record PrometheusTarget(
    string Job,
    string Instance,
    string ScrapeUrl,
    string Health,
    string LastError,
    string? LastScrape,
    double LastScrapeDurationSeconds,
    string ScrapeInterval,
    IReadOnlyDictionary<string, string> Labels,
    IReadOnlyDictionary<string, string> DiscoveredLabels);

public sealed record PrometheusJob(string Name, int TargetCount, int HealthyTargetCount, int InstanceCount);

public sealed record PrometheusRule(
    string Name,
    string Kind,
    string Group,
    string Query,
    string Health,
    string State,
    string LastError,
    string? LastEvaluation,
    double EvaluationTimeSeconds);

public sealed record PrometheusStorage(
    string Retention,
    long HeadSeries,
    long HeadChunks,
    DateTimeOffset? MinTime,
    DateTimeOffset? MaxTime,
    IReadOnlyList<PrometheusMetricCount> TopMetrics);

public sealed record PrometheusMetricCount(string Name, long Count);

public sealed record PrometheusAnalytics(
    double TargetsUp,
    double OrdersPerSecond,
    double P95DurationMilliseconds,
    int FiringAlerts,
    IReadOnlyList<PrometheusPoint> Throughput);

public sealed record PrometheusPoint(DateTimeOffset Timestamp, double Value);
