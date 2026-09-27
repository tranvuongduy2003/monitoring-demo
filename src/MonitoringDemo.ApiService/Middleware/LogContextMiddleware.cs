using System.Diagnostics;
using System.Text.RegularExpressions;

namespace MonitoringDemo.ApiService.Middleware;

public sealed partial class LogContextMiddleware
{
    public const string CorrelationHeader = "X-Correlation-ID";
    public const string RequestHeader = "X-Request-ID";

    private readonly RequestDelegate _next;
    private readonly ILogger<LogContextMiddleware> _logger;

    public LogContextMiddleware(RequestDelegate next, ILogger<LogContextMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetCorrelationId(context);
        var requestId = context.TraceIdentifier;
        var traceId = Activity.Current?.TraceId.ToString() ?? string.Empty;
        var spanId = Activity.Current?.SpanId.ToString() ?? string.Empty;
        var startedAt = Stopwatch.GetTimestamp();

        context.Response.Headers[CorrelationHeader] = correlationId;
        context.Response.Headers[RequestHeader] = requestId;
        Activity.Current?.SetTag("correlation.id", correlationId);
        Activity.Current?.SetTag("request.id", requestId);
        Activity.Current?.AddBaggage("correlation.id", correlationId);

        using var scope = _logger.BeginScope(new Dictionary<string, object?>
        {
            ["correlation_id"] = correlationId,
            ["request_id"] = requestId,
            ["trace_id"] = traceId,
            ["span_id"] = spanId,
            ["event_name"] = "http_request"
        });

        _logger.LogInformation(
            new EventId(1000, "RequestStarted"),
            "HTTP {http_method} {http_path} started",
            context.Request.Method,
            context.Request.Path);

        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                new EventId(1002, "RequestUnhandledException"),
                exception,
                "HTTP {http_method} {http_path} failed with an unhandled exception",
                context.Request.Method,
                context.Request.Path);
            throw;
        }
        finally
        {
            var elapsedMs = Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds;
            _logger.LogInformation(
                new EventId(1001, "RequestCompleted"),
                "HTTP {http_method} {http_path} completed with {status_code} in {duration_ms:F1} ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                elapsedMs);
        }
    }

    private static string GetCorrelationId(HttpContext context)
    {
        var supplied = context.Request.Headers[CorrelationHeader].FirstOrDefault();
        return supplied is not null && SafeCorrelationId().IsMatch(supplied)
            ? supplied
            : Guid.NewGuid().ToString("N");
    }

    [GeneratedRegex("^[A-Za-z0-9._:-]{1,128}$", RegexOptions.CultureInvariant)]
    private static partial Regex SafeCorrelationId();
}
