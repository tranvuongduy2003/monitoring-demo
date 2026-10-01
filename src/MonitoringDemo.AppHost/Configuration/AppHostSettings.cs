using Microsoft.Extensions.Configuration;

namespace MonitoringDemo.AppHost.Configuration;

public sealed record AppHostSettings(
    DatabaseSettings Database,
    PortSettings Ports,
    ContainerImageSettings Images,
    MonitoringSettings Monitoring,
    GrafanaSettings Grafana,
    ApiSettings Api,
    FrontendSettings Frontend)
{
    public static AppHostSettings FromConfiguration(IConfiguration configuration)
    {
        var ports = new PortSettings(
            Port(configuration, "POSTGRES_PORT", 5432),
            Port(configuration, "FRONTEND_PORT", 5173),
            Port(configuration, "API_PORT", 5000),
            Port(configuration, "GRAFANA_PORT", 3000),
            Port(configuration, "PROMETHEUS_PORT", 9090),
            Port(configuration, "LOKI_PORT", 3100),
            Port(configuration, "TEMPO_PORT", 3200),
            Port(configuration, "TEMPO_OTLP_GRPC_PORT", 4317),
            Port(configuration, "TEMPO_OTLP_HTTP_PORT", 4318),
            Port(configuration, "OTEL_COLLECTOR_OTLP_GRPC_PORT", 14317),
            Port(configuration, "OTEL_COLLECTOR_OTLP_HTTP_PORT", 14318),
            Port(configuration, "OTEL_COLLECTOR_METRICS_PORT", 9464));

        string hostDockerInternal = "host.docker.internal";
        string localHost = "localhost";
        string prometheusUrl = $"http://{localHost}:{ports.Prometheus}";
        string lokiUrl = $"http://{localHost}:{ports.Loki}";
        string apiUrl = $"http://{localHost}:{ports.Api}";
        string frontendUrl = $"http://{localHost}:{ports.Frontend}";
        string grafanaUrl = $"http://{localHost}:{ports.Grafana}";

        return new AppHostSettings(
            new DatabaseSettings(Token(configuration, "POSTGRES_DATABASE", "monitoringdb")),
            ports,
            new ContainerImageSettings(
                Value(configuration, "GRAFANA_IMAGE_TAG", "latest"),
                Value(configuration, "PROMETHEUS_IMAGE_TAG", "latest"),
                Value(configuration, "LOKI_IMAGE_TAG", "3.6.3"),
                Value(configuration, "TEMPO_IMAGE_TAG", "latest"),
                Value(configuration, "OTEL_COLLECTOR_IMAGE_TAG", "0.161.0")),
            new MonitoringSettings(
                Token(configuration, "PROMETHEUS_RETENTION_TIME", "15d"),
                Token(configuration, "PROMETHEUS_FEATURES", "exemplar-storage"),
                Token(configuration, "PROMETHEUS_SCRAPE_INTERVAL", "15s"),
                Token(configuration, "PROMETHEUS_EVALUATION_INTERVAL", "15s"),
                Token(configuration, "PROMETHEUS_API_SCRAPE_INTERVAL", "5s"),
                Host(configuration, "PROMETHEUS_API_HOST", hostDockerInternal),
                Host(configuration, "PROMETHEUS_COLLECTOR_HOST", hostDockerInternal),
                Token(configuration, "LOKI_RETENTION_PERIOD", "168h"),
                Token(configuration, "OTEL_COLLECTOR_GOMEMLIMIT", "205MiB")),
            new GrafanaSettings(
                Value(configuration, "GRAFANA_ADMIN_USER", "admin"),
                Value(configuration, "GRAFANA_ADMIN_PASSWORD", "admin"),
                Boolean(configuration, "GRAFANA_ALLOW_SIGN_UP", fallback: false),
                Url(configuration, "PROMETHEUS_DATASOURCE_URL", $"http://{hostDockerInternal}:{ports.Prometheus}"),
                Url(configuration, "LOKI_DATASOURCE_URL", $"http://{hostDockerInternal}:{ports.Loki}"),
                Url(configuration, "TEMPO_DATASOURCE_URL", $"http://{hostDockerInternal}:{ports.Tempo}"),
                Url(configuration, "ALERT_WEBHOOK_URL", $"http://{hostDockerInternal}:{ports.Api}/api/grafana/alerting/notifications")),
            new ApiSettings(
                Url(configuration, "LOKI_OTLP_ENDPOINT", $"{lokiUrl}/otlp/v1/logs"),
                Url(configuration, "TEMPO_OTLP_ENDPOINT", $"http://{localHost}:{ports.TempoOtlpHttp}/v1/traces"),
                Url(configuration, "COLLECTOR_OTLP_ENDPOINT", $"http://{localHost}:{ports.CollectorOtlpGrpc}"),
                Origins(configuration, "CORS_ALLOWED_ORIGINS", frontendUrl)),
            new FrontendSettings(
                Url(configuration, "VITE_API_PUBLIC_URL", apiUrl),
                Url(configuration, "VITE_GRAFANA_URL", grafanaUrl),
                Url(configuration, "VITE_PROMETHEUS_URL", prometheusUrl)));
    }

    private static string Value(IConfiguration configuration, string name, string fallback) =>
        string.IsNullOrWhiteSpace(configuration[name]) ? fallback : configuration[name]!.Trim();

    private static string Token(IConfiguration configuration, string name, string fallback)
    {
        string value = Value(configuration, name, fallback);
        if (value.All(character =>
            char.IsAsciiLetterOrDigit(character) || character is '.' or ',' or '_' or '-'))
        {
            return value;
        }

        throw new InvalidOperationException(
            $"Configuration value '{name}' contains unsupported characters.");
    }

    private static string Boolean(IConfiguration configuration, string name, bool fallback)
    {
        string? rawValue = configuration[name];
        if (string.IsNullOrWhiteSpace(rawValue)) return fallback.ToString().ToLowerInvariant();
        if (bool.TryParse(rawValue, out bool value)) return value.ToString().ToLowerInvariant();

        throw new InvalidOperationException($"Configuration value '{name}' must be true or false.");
    }

    private static string Host(IConfiguration configuration, string name, string fallback)
    {
        string value = Value(configuration, name, fallback);
        if (Uri.CheckHostName(value) != UriHostNameType.Unknown) return value;

        throw new InvalidOperationException($"Configuration value '{name}' must be a valid host name or IP address.");
    }

    private static string Url(IConfiguration configuration, string name, string fallback)
    {
        string value = Value(configuration, name, fallback);
        if (IsHttpUrl(value))
        {
            return value.TrimEnd('/');
        }

        throw new InvalidOperationException($"Configuration value '{name}' must be an absolute HTTP(S) URL.");
    }

    private static string Origins(IConfiguration configuration, string name, string fallback)
    {
        string value = Value(configuration, name, fallback);
        foreach (string origin in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (origin == "*") continue;
            if (!IsHttpUrl(origin))
            {
                throw new InvalidOperationException(
                    $"Configuration value '{name}' contains an invalid HTTP(S) origin.");
            }
        }

        return value;
    }

    private static bool IsHttpUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

    private static int Port(IConfiguration configuration, string name, int fallback)
    {
        string? rawValue = configuration[name];
        if (string.IsNullOrWhiteSpace(rawValue)) return fallback;
        if (int.TryParse(rawValue, out int value) && value is >= 1 and <= 65_535) return value;

        throw new InvalidOperationException($"Configuration value '{name}' must be a valid TCP port.");
    }
}
