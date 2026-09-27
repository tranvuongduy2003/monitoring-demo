using System.Diagnostics;
using System.Text.RegularExpressions;
using MonitoringDemo.ApiService.Observability;

namespace MonitoringDemo.ApiService.Middleware;

public sealed partial class LogContextMiddleware
{
    private const string SafeCorrelationIdPattern = "^[A-Za-z0-9._:-]{1,128}$";

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

        using var scope = _logger.BeginApplicationScope(new ApplicationLogScope
        {
            EventName = "http_request",
            CorrelationId = correlationId,
            RequestId = requestId,
            TraceId = traceId,
            SpanId = spanId
        });

        _logger.RequestStarted(context.Request.Method, context.Request.Path.Value ?? "/");

        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            _logger.RequestUnhandledException(
                exception,
                context.Request.Method,
                context.Request.Path.Value ?? "/");
            throw;
        }
        finally
        {
            var elapsedMs = Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds;
            var level = context.Response.StatusCode >= StatusCodes.Status500InternalServerError
                ? LogLevel.Error
                : context.Response.StatusCode >= StatusCodes.Status400BadRequest
                    ? LogLevel.Warning
                    : LogLevel.Information;
            _logger.RequestCompleted(
                level,
                context.Request.Method,
                context.Request.Path.Value ?? "/",
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

    [GeneratedRegex(SafeCorrelationIdPattern, RegexOptions.CultureInvariant)]
    private static partial Regex SafeCorrelationId();
}
