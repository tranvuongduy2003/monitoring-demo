using System.Globalization;
using System.Text.Json;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public sealed class TempoQueryService
{
    private const int RequestTimeoutSeconds = 8;
    private const int MinimumWindowMinutes = 5;
    private const int MaximumWindowMinutes = 24 * 60;
    private const int SearchLimit = 30;
    private const int MaximumDetailedTraces = 10;
    private const string SeedTraceQuery = "{ resource.service.name = \"" + TelemetryConstants.ServiceName + "\" && span.demo.trace = true }";

    private readonly HttpClient _httpClient;
    private readonly ILogger<TempoQueryService> _logger;
    private readonly string _baseUrl;

    public TempoQueryService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<TempoQueryService> logger)
    {
        _httpClient = httpClient;
        _httpClient.Timeout = TimeSpan.FromSeconds(RequestTimeoutSeconds);
        _logger = logger;
        _baseUrl = (configuration["Tempo:BaseUrl"] ?? "http://localhost:3200").TrimEnd('/');
    }

    public static IReadOnlyList<TraceQueryExample> QueryExamples { get; } =
    [
        new("Seeded traces", SeedTraceQuery, "Find the complete teaching dataset."),
        new("Errors", "{ resource.service.name = \"MonitoringDemo.ApiService\" && status = error }", "Find traces containing an error span."),
        new("Slow spans", "{ resource.service.name = \"MonitoringDemo.ApiService\" && duration > 500ms }", "Locate latency outliers."),
        new("Checkout roots", "{ rootName = \"CheckoutOrder\" }", "Select traces by their root span name."),
        new("Parent followed by child", "{ name = \"ChargePayment\" } >> { name = \"POST /authorize\" }", "Use structural operators to query a parent/descendant path."),
        new("Attribute filter", "{ span.payment.method = \"card\" }", "Filter spans using a business attribute.")
    ];

    public async Task<TraceOverview> GetOverviewAsync(int minutes, CancellationToken cancellationToken)
    {
        minutes = Math.Clamp(minutes, MinimumWindowMinutes, MaximumWindowMinutes);
        var now = DateTimeOffset.UtcNow;
        var start = now.AddMinutes(-minutes).ToUnixTimeSeconds();
        var end = now.ToUnixTimeSeconds();

        try
        {
            var summaries = await SearchAsync(start, end, cancellationToken);
            var detailTasks = summaries
                .Take(MaximumDetailedTraces)
                .Select(summary => GetTraceAsync(summary, cancellationToken));
            var traceResults = await Task.WhenAll(detailTasks);
            var traces = traceResults
                .Where(trace => trace is not null)
                .Cast<TraceDetail>()
                .ToArray();

            return new TraceOverview(
                true,
                minutes,
                summaries.Count,
                BuildAnalytics(summaries, traces),
                traces,
                QueryExamples,
                null);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(exception, "Tempo trace analytics are temporarily unavailable");
            return TraceOverview.Unavailable(
                minutes,
                "Tempo is starting or unavailable. Trace analytics will retry automatically.");
        }
    }

    private async Task<IReadOnlyList<TraceSearchSummary>> SearchAsync(
        long start,
        long end,
        CancellationToken cancellationToken)
    {
        var url = $"{_baseUrl}/api/search?q={Uri.EscapeDataString(SeedTraceQuery)}&start={start}&end={end}&limit={SearchLimit}&spss=3";
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (!document.RootElement.TryGetProperty("traces", out var traces) ||
            traces.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return traces.EnumerateArray()
            .Select(item => new TraceSearchSummary(
                String(item, "traceID") ?? string.Empty,
                String(item, "rootServiceName") ?? TelemetryConstants.ServiceName,
                String(item, "rootTraceName") ?? "unknown",
                ParseUnixNanoseconds(String(item, "startTimeUnixNano")),
                Number(item, "durationMs")))
            .Where(trace => trace.TraceId.Length > 0)
            .OrderByDescending(trace => trace.StartedAt)
            .ToArray();
    }

    private async Task<TraceDetail?> GetTraceAsync(
        TraceSearchSummary summary,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync(
                $"{_baseUrl}/api/traces/{Uri.EscapeDataString(summary.TraceId)}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            return ReadTrace(document.RootElement, summary);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogDebug(exception, "Tempo trace {TraceId} could not be expanded", summary.TraceId);
            return null;
        }
    }

    private static TraceDetail ReadTrace(JsonElement root, TraceSearchSummary summary)
    {
        var spans = new List<TraceSpan>();

        foreach (var batch in ResourceBatches(root))
        {
            var serviceName = ReadServiceName(batch) ?? summary.RootServiceName;
            foreach (var scope in ScopeSpans(batch))
            {
                if (!scope.TryGetProperty("spans", out var spanArray) || spanArray.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var span in spanArray.EnumerateArray())
                {
                    var startedAt = ParseUnixNanoseconds(String(span, "startTimeUnixNano"));
                    var endedAt = ParseUnixNanoseconds(String(span, "endTimeUnixNano"));
                    var spanDuration = Math.Max(0, (endedAt - startedAt).TotalMilliseconds);
                    spans.Add(new TraceSpan(
                        NormalizeId(String(span, "spanId")) ?? string.Empty,
                        NormalizeId(String(span, "parentSpanId")),
                        String(span, "name") ?? "unnamed span",
                        serviceName,
                        ReadKind(span),
                        startedAt,
                        spanDuration,
                        ReadStatus(span),
                        ReadAttributes(span),
                        ReadEvents(span)));
                }
            }
        }

        var orderedSpans = spans.OrderBy(span => span.StartedAt).ToArray();
        var rootSpan = orderedSpans.FirstOrDefault(span => string.IsNullOrWhiteSpace(span.ParentSpanId))
            ?? orderedSpans.FirstOrDefault();
        var traceDuration = summary.DurationMilliseconds > 0
            ? summary.DurationMilliseconds
            : rootSpan?.DurationMilliseconds ?? 0;

        return new TraceDetail(
            summary.TraceId,
            summary.RootServiceName,
            rootSpan?.Name ?? summary.RootTraceName,
            summary.StartedAt,
            traceDuration,
            orderedSpans.Any(span => span.Status.Equals("Error", StringComparison.OrdinalIgnoreCase)) ? "Error" : rootSpan?.Status ?? "Unset",
            orderedSpans);
    }

    private static TraceAnalytics BuildAnalytics(
        IReadOnlyList<TraceSearchSummary> summaries,
        IReadOnlyList<TraceDetail> traces)
    {
        var traceDurations = summaries.Select(trace => trace.DurationMilliseconds).Order().ToArray();
        var spans = traces.SelectMany(trace => trace.Spans).ToArray();
        var statusCounts = spans
            .GroupBy(span => span.Status)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.OrdinalIgnoreCase);
        var durationBuckets = new[] { 50d, 100d, 250d, 500d, 1_000d }
            .Select(limit => new TraceDurationBucket(
                $"≤ {limit:0} ms",
                spans.Count(span => span.DurationMilliseconds <= limit)))
            .Append(new TraceDurationBucket("> 1000 ms", spans.Count(span => span.DurationMilliseconds > 1_000)))
            .ToArray();
        var operations = spans
            .GroupBy(span => span.Name)
            .Select(group =>
            {
                var durations = group.Select(span => span.DurationMilliseconds).Order().ToArray();
                return new TraceOperation(
                    group.Key,
                    group.Count(),
                    group.Count(span => span.Status.Equals("Error", StringComparison.OrdinalIgnoreCase)),
                    durations.Length == 0 ? 0 : durations.Average(),
                    Percentile(durations, 0.95));
            })
            .OrderByDescending(operation => operation.Count)
            .ThenByDescending(operation => operation.AverageDurationMilliseconds)
            .Take(8)
            .ToArray();

        return new TraceAnalytics(
            summaries.Count,
            spans.Length,
            traces.Count(trace => trace.Status.Equals("Error", StringComparison.OrdinalIgnoreCase)),
            spans.Count(span => span.Status.Equals("Error", StringComparison.OrdinalIgnoreCase)),
            traceDurations.Length == 0 ? 0 : traceDurations.Average(),
            Percentile(traceDurations, 0.95),
            statusCounts,
            durationBuckets,
            operations);
    }

    private static double Percentile(IReadOnlyList<double> sortedValues, double percentile)
    {
        if (sortedValues.Count == 0) return 0;
        var index = (int)Math.Ceiling(percentile * sortedValues.Count) - 1;
        return sortedValues[Math.Clamp(index, 0, sortedValues.Count - 1)];
    }

    private static IEnumerable<JsonElement> ResourceBatches(JsonElement root)
    {
        if (root.TryGetProperty("batches", out var batches) && batches.ValueKind == JsonValueKind.Array)
        {
            foreach (var batch in batches.EnumerateArray()) yield return batch;
        }

        if (root.TryGetProperty("resourceSpans", out var resourceSpans) && resourceSpans.ValueKind == JsonValueKind.Array)
        {
            foreach (var batch in resourceSpans.EnumerateArray()) yield return batch;
        }
    }

    private static IEnumerable<JsonElement> ScopeSpans(JsonElement batch)
    {
        if (batch.TryGetProperty("scopeSpans", out var scopeSpans) && scopeSpans.ValueKind == JsonValueKind.Array)
        {
            foreach (var scope in scopeSpans.EnumerateArray()) yield return scope;
        }

        if (batch.TryGetProperty("instrumentationLibrarySpans", out var librarySpans) && librarySpans.ValueKind == JsonValueKind.Array)
        {
            foreach (var scope in librarySpans.EnumerateArray()) yield return scope;
        }
    }

    private static string? ReadServiceName(JsonElement batch)
    {
        if (!batch.TryGetProperty("resource", out var resource)) return null;
        var attributes = ReadAttributes(resource);
        return attributes.TryGetValue("service.name", out var value) ? value : null;
    }

    private static IReadOnlyDictionary<string, string> ReadAttributes(JsonElement element)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!element.TryGetProperty("attributes", out var attributes) || attributes.ValueKind != JsonValueKind.Array)
        {
            return result;
        }

        foreach (var attribute in attributes.EnumerateArray())
        {
            var key = String(attribute, "key");
            if (key is null || !attribute.TryGetProperty("value", out var value)) continue;
            result[key] = ReadAnyValue(value);
        }

        return result;
    }

    private static IReadOnlyList<TraceSpanEvent> ReadEvents(JsonElement span)
    {
        if (!span.TryGetProperty("events", out var events) || events.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return events.EnumerateArray()
            .Select(activityEvent => new TraceSpanEvent(
                String(activityEvent, "name") ?? "event",
                ParseUnixNanoseconds(String(activityEvent, "timeUnixNano")),
                ReadAttributes(activityEvent)))
            .ToArray();
    }

    private static string ReadAnyValue(JsonElement value)
    {
        foreach (var property in new[] { "stringValue", "intValue", "doubleValue", "boolValue", "bytesValue" })
        {
            if (value.TryGetProperty(property, out var item))
            {
                return item.ValueKind == JsonValueKind.String ? item.GetString() ?? string.Empty : item.ToString();
            }
        }

        if (value.TryGetProperty("arrayValue", out var arrayValue) &&
            arrayValue.TryGetProperty("values", out var values) &&
            values.ValueKind == JsonValueKind.Array)
        {
            return string.Join(", ", values.EnumerateArray().Select(ReadAnyValue));
        }

        return value.ToString();
    }

    private static string ReadStatus(JsonElement span)
    {
        if (!span.TryGetProperty("status", out var status) || !status.TryGetProperty("code", out var code))
        {
            return "Unset";
        }

        if (code.ValueKind == JsonValueKind.Number && code.TryGetInt32(out var numericCode))
        {
            return numericCode switch { 1 => "Ok", 2 => "Error", _ => "Unset" };
        }

        var text = code.GetString() ?? string.Empty;
        if (text.Contains("ERROR", StringComparison.OrdinalIgnoreCase)) return "Error";
        if (text.Contains("OK", StringComparison.OrdinalIgnoreCase)) return "Ok";
        return "Unset";
    }

    private static string ReadKind(JsonElement span)
    {
        if (!span.TryGetProperty("kind", out var kind)) return "Unspecified";
        if (kind.ValueKind == JsonValueKind.Number && kind.TryGetInt32(out var value))
        {
            return value switch
            {
                1 => "Internal",
                2 => "Server",
                3 => "Client",
                4 => "Producer",
                5 => "Consumer",
                _ => "Unspecified"
            };
        }

        return (kind.GetString() ?? "Unspecified").Replace("SPAN_KIND_", string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    private static DateTimeOffset ParseUnixNanoseconds(string? rawValue)
    {
        if (!long.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var nanoseconds))
        {
            return DateTimeOffset.UnixEpoch;
        }

        return DateTimeOffset.FromUnixTimeMilliseconds(nanoseconds / 1_000_000);
    }

    private static string? String(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value)
            ? value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString()
            : null;

    private static string? NormalizeId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (value.All(character => Uri.IsHexDigit(character))) return value.ToLowerInvariant();

        try
        {
            var bytes = Convert.FromBase64String(value);
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
        catch (FormatException)
        {
            return value;
        }
    }

    private static double Number(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value)) return 0;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number)) return number;
        return double.TryParse(value.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out number) ? number : 0;
    }
}

public sealed record TraceOverview(
    bool Available,
    int WindowMinutes,
    int IndexedTraceCount,
    TraceAnalytics Analytics,
    IReadOnlyList<TraceDetail> Traces,
    IReadOnlyList<TraceQueryExample> Queries,
    string? Message)
{
    public static TraceOverview Unavailable(int minutes, string message) =>
        new(false, minutes, 0, TraceAnalytics.Empty, [], TempoQueryService.QueryExamples, message);
}

public sealed record TraceAnalytics(
    int TraceCount,
    int SpanCount,
    int ErrorTraceCount,
    int ErrorSpanCount,
    double AverageDurationMilliseconds,
    double P95DurationMilliseconds,
    IReadOnlyDictionary<string, int> StatusCounts,
    IReadOnlyList<TraceDurationBucket> DurationBuckets,
    IReadOnlyList<TraceOperation> Operations)
{
    public static TraceAnalytics Empty { get; } = new(0, 0, 0, 0, 0, 0, new Dictionary<string, int>(), [], []);
}

public sealed record TraceDetail(
    string TraceId,
    string RootServiceName,
    string RootSpanName,
    DateTimeOffset StartedAt,
    double DurationMilliseconds,
    string Status,
    IReadOnlyList<TraceSpan> Spans);

public sealed record TraceSpan(
    string SpanId,
    string? ParentSpanId,
    string Name,
    string ServiceName,
    string Kind,
    DateTimeOffset StartedAt,
    double DurationMilliseconds,
    string Status,
    IReadOnlyDictionary<string, string> Attributes,
    IReadOnlyList<TraceSpanEvent> Events);

public sealed record TraceSpanEvent(
    string Name,
    DateTimeOffset Timestamp,
    IReadOnlyDictionary<string, string> Attributes);

public sealed record TraceDurationBucket(string Label, int Count);
public sealed record TraceOperation(string Name, int Count, int ErrorCount, double AverageDurationMilliseconds, double P95DurationMilliseconds);
public sealed record TraceQueryExample(string Title, string Query, string Purpose);
internal sealed record TraceSearchSummary(string TraceId, string RootServiceName, string RootTraceName, DateTimeOffset StartedAt, double DurationMilliseconds);
