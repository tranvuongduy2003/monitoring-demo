using System.Globalization;
using System.Text.Json;
using MonitoringDemo.ApiService.Observability;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public sealed class LokiQueryService
{
    private const int RequestTimeoutSeconds = 5;
    private const int MinimumAnalyticsWindowMinutes = 5;
    private const int MaximumAnalyticsWindowMinutes = 24 * 60;
    private const int VectorValueIndex = 1;

    private const string ServiceSelector = "{service_name=\"" + TelemetryConstants.ServiceName + "\"}";
    private readonly HttpClient _httpClient;
    private readonly ILogger<LokiQueryService> _logger;
    private readonly string _baseUrl;

    public LokiQueryService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<LokiQueryService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.Timeout = TimeSpan.FromSeconds(RequestTimeoutSeconds);
        _baseUrl = configuration["Loki:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:3100";
    }

    public static IReadOnlyList<LogQueryExample> QueryExamples { get; } =
    [
        new("All application logs", ServiceSelector, "Start with an indexed stream selector."),
        new("Errors and critical events", $"{ServiceSelector} | severity_text =~ `(?i)error|critical`", "Filter structured severity metadata."),
        new("One correlation", $"{ServiceSelector} | correlation_id = `seed-correlation-01`", "Follow related operations across log lines."),
        new("One trace", $"{ServiceSelector} | trace_id = `<trace-id>`", "Pivot from a trace to its logs."),
        new("Slow operations", $"{ServiceSelector} | duration_ms > {TelemetryConstants.SlowOperationThresholdMilliseconds}", "Apply a numeric structured-metadata filter."),
        new("Volume by level", $"sum by (severity_text) (count_over_time({ServiceSelector} | severity_text != `` [5m]))", "Turn logs into a time-series analytic.")
    ];

    public async Task<LogAnalytics> GetAnalyticsAsync(int minutes, CancellationToken cancellationToken)
    {
        minutes = Math.Clamp(
            minutes,
            MinimumAnalyticsWindowMinutes,
            MaximumAnalyticsWindowMinutes);
        var window = $"{minutes}m";
        var volumeQuery = $"sum by (severity_text) (count_over_time({ServiceSelector} | severity_text != `` [{window}]))";

        try
        {
            using var response = await _httpClient.GetAsync(
                $"{_baseUrl}/loki/api/v1/query?query={Uri.EscapeDataString(volumeQuery)}",
                cancellationToken);

            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var counts = ReadVector(document.RootElement, "severity_text");

            return new LogAnalytics(
                true,
                minutes,
                counts.Values.Sum(),
                counts,
                QueryExamples,
                null);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LokiQueryFailed(exception, minutes);
            return new LogAnalytics(
                false,
                minutes,
                0,
                new Dictionary<string, double>(),
                QueryExamples,
                "Loki is starting or unavailable. Analytics will retry automatically.");
        }
    }

    private static Dictionary<string, double> ReadVector(JsonElement root, string label)
    {
        var values = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        if (!root.TryGetProperty("data", out var data) ||
            !data.TryGetProperty("result", out var result) ||
            result.ValueKind != JsonValueKind.Array)
        {
            return values;
        }

        foreach (var item in result.EnumerateArray())
        {
            var name = item.GetProperty("metric").TryGetProperty(label, out var labelValue)
                ? labelValue.GetString() ?? "unknown"
                : "unknown";
            var rawValue = item.GetProperty("value")[VectorValueIndex].GetString();
            if (double.TryParse(rawValue, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
            {
                values[name] = value;
            }
        }

        return values;
    }
}

public sealed record LogAnalytics(
    bool Available,
    int WindowMinutes,
    double TotalLogs,
    IReadOnlyDictionary<string, double> ByLevel,
    IReadOnlyList<LogQueryExample> Queries,
    string? Message);

public sealed record LogQueryExample(string Title, string Query, string Purpose);
