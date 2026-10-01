namespace MonitoringDemo.AppHost.Configuration;

public sealed record DatabaseSettings(string Name);

public sealed record PortSettings(
    int Postgres,
    int Frontend,
    int Api,
    int Grafana,
    int Prometheus,
    int Loki,
    int Tempo,
    int TempoOtlpGrpc,
    int TempoOtlpHttp,
    int CollectorOtlpGrpc,
    int CollectorOtlpHttp,
    int CollectorMetrics);

public sealed record ContainerImageSettings(
    string Grafana,
    string Prometheus,
    string Loki,
    string Tempo,
    string Collector);

public sealed record MonitoringSettings(
    string PrometheusRetention,
    string PrometheusFeatures,
    string PrometheusScrapeInterval,
    string PrometheusEvaluationInterval,
    string PrometheusApiScrapeInterval,
    string PrometheusApiHost,
    string PrometheusCollectorHost,
    string LokiRetention,
    string CollectorMemoryLimit);

public sealed record GrafanaSettings(
    string AdminUser,
    string AdminPassword,
    string AllowSignUp,
    string PrometheusDataSourceUrl,
    string LokiDataSourceUrl,
    string TempoDataSourceUrl,
    string AlertWebhookUrl);

public sealed record ApiSettings(
    string LokiOtlpEndpoint,
    string TempoOtlpEndpoint,
    string CollectorOtlpEndpoint,
    string AllowedOrigins);

public sealed record FrontendSettings(
    string ApiPublicUrl,
    string GrafanaUrl,
    string PrometheusUrl);
