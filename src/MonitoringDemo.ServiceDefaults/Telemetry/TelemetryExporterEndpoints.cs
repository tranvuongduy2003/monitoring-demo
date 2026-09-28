using Microsoft.Extensions.Configuration;

namespace MonitoringDemo.ServiceDefaults.Telemetry;

internal sealed record TelemetryExporterEndpoints(
    bool HasStandardLogs,
    bool HasStandardMetrics,
    bool HasStandardTraces,
    bool HasSignalLogs,
    Uri? Collector,
    Uri? Loki,
    Uri? Tempo)
{
    public static TelemetryExporterEndpoints FromConfiguration(IConfiguration configuration)
    {
        bool hasSharedEndpoint = HasValue(configuration, "OTEL_EXPORTER_OTLP_ENDPOINT");
        bool hasSignalLogs = HasValue(configuration, "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT");

        return new(
            hasSharedEndpoint || hasSignalLogs,
            hasSharedEndpoint || HasValue(configuration, "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"),
            hasSharedEndpoint || HasValue(configuration, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"),
            hasSignalLogs,
            AbsoluteHttpUri(configuration, "COLLECTOR_OTLP_ENDPOINT"),
            AbsoluteHttpUri(configuration, "LOKI_OTLP_ENDPOINT"),
            AbsoluteHttpUri(configuration, "TEMPO_OTLP_ENDPOINT"));
    }

    private static bool HasValue(IConfiguration configuration, string key) =>
        !string.IsNullOrWhiteSpace(configuration[key]);

    private static Uri? AbsoluteHttpUri(IConfiguration configuration, string key)
    {
        string? value = configuration[key];
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (Uri.TryCreate(value, UriKind.Absolute, out var endpoint) &&
            (endpoint.Scheme == Uri.UriSchemeHttp || endpoint.Scheme == Uri.UriSchemeHttps))
        {
            return endpoint;
        }

        throw new InvalidOperationException(
            $"Configuration value '{key}' must be an absolute HTTP(S) URL.");
    }
}
