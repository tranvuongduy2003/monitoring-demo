using Aspire.Hosting.ApplicationModel;
using MonitoringDemo.AppHost.Configuration;

namespace MonitoringDemo.AppHost.Orchestration;

internal sealed record ObservabilityResources(
    IResourceBuilder<ContainerResource> Loki,
    IResourceBuilder<ContainerResource> Tempo,
    IResourceBuilder<ContainerResource> Collector,
    IResourceBuilder<ContainerResource> Prometheus,
    IResourceBuilder<ContainerResource> Grafana);

internal static class ObservabilityResourceExtensions
{
    public static ObservabilityResources AddObservabilityStack(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings)
    {
        var loki = builder.AddLoki(settings);
        var tempo = builder.AddTempo(settings);
        var collector = builder.AddCollector(settings, loki, tempo);
        var prometheus = builder.AddPrometheus(settings, collector);
        var grafana = builder.AddGrafana(settings, prometheus, loki, tempo);

        return new(loki, tempo, collector, prometheus, grafana);
    }

    private static IResourceBuilder<ContainerResource> AddLoki(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings) =>
        builder.AddContainer(ResourceNames.Loki, "grafana/loki", settings.Images.Loki)
            .WithBindMount("loki", "/etc/loki", isReadOnly: true)
            .WithHttpEndpoint(port: settings.Ports.Loki, targetPort: 3100, name: "http")
            .WithHttpHealthCheck("/ready")
            .WithEnvironment("LOKI_RETENTION_PERIOD", settings.Monitoring.LokiRetention)
            .WithArgs("-config.file=/etc/loki/loki-config.yaml", "-config.expand-env=true");

    private static IResourceBuilder<ContainerResource> AddTempo(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings) =>
        builder.AddContainer(ResourceNames.Tempo, "grafana/tempo", settings.Images.Tempo)
            .WithBindMount("tempo", "/etc/tempo", isReadOnly: true)
            .WithHttpEndpoint(port: settings.Ports.Tempo, targetPort: 3200, name: "http")
            .WithHttpEndpoint(port: settings.Ports.TempoOtlpGrpc, targetPort: 4317, name: "otlp-grpc")
            .WithHttpEndpoint(port: settings.Ports.TempoOtlpHttp, targetPort: 4318, name: "otlp-http")
            .WithHttpHealthCheck("/ready")
            .WithArgs("-config.file=/etc/tempo/tempo.yaml", "-config.expand-env=true");

    private static IResourceBuilder<ContainerResource> AddCollector(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings,
        IResourceBuilder<ContainerResource> loki,
        IResourceBuilder<ContainerResource> tempo) =>
        builder.AddContainer(ResourceNames.Collector, "otel/opentelemetry-collector-contrib", settings.Images.Collector)
            .WithBindMount("otel-collector", "/etc/otelcol-contrib", isReadOnly: true)
            .WithHttpEndpoint(port: settings.Ports.CollectorOtlpGrpc, targetPort: 4317, name: "otlp-grpc")
            .WithHttpEndpoint(port: settings.Ports.CollectorOtlpHttp, targetPort: 4318, name: "otlp-http")
            .WithHttpEndpoint(port: settings.Ports.CollectorMetrics, targetPort: 9464, name: "prometheus")
            .WithEnvironment("GOMEMLIMIT", settings.Monitoring.CollectorMemoryLimit)
            .WithEnvironment("TEMPO_OTLP_HTTP_ENDPOINT", "http://host.docker.internal:" + settings.Ports.TempoOtlpHttp)
            .WithEnvironment("LOKI_OTLP_HTTP_LOGS_ENDPOINT", "http://host.docker.internal:" + settings.Ports.Loki + "/otlp/v1/logs")
            .WithArgs("--config=/etc/otelcol-contrib/config.yaml")
            .WaitFor(loki)
            .WaitFor(tempo);

    private static IResourceBuilder<ContainerResource> AddPrometheus(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings,
        IResourceBuilder<ContainerResource> collector) =>
        builder.AddContainer(ResourceNames.Prometheus, "prom/prometheus", settings.Images.Prometheus)
            .WithBindMount("prometheus", "/etc/prometheus", isReadOnly: true)
            .WithHttpEndpoint(port: settings.Ports.Prometheus, targetPort: 9090, name: "http")
            .WithHttpHealthCheck("/-/ready")
            .WithEnvironment("PROMETHEUS_SCRAPE_INTERVAL", settings.Monitoring.PrometheusScrapeInterval)
            .WithEnvironment("PROMETHEUS_EVALUATION_INTERVAL", settings.Monitoring.PrometheusEvaluationInterval)
            .WithEnvironment("PROMETHEUS_API_SCRAPE_INTERVAL", settings.Monitoring.PrometheusApiScrapeInterval)
            .WithEnvironment("API_METRICS_TARGET", settings.Monitoring.PrometheusApiHost + ":" + settings.Ports.Api)
            .WithEnvironment("COLLECTOR_METRICS_TARGET", settings.Monitoring.PrometheusCollectorHost + ":" + settings.Ports.CollectorMetrics)
            .WithEntrypoint("/bin/sh")
            .WithArgs("-c", PrometheusStartupCommand(settings))
            .WaitFor(collector);

    private static IResourceBuilder<ContainerResource> AddGrafana(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings,
        IResourceBuilder<ContainerResource> prometheus,
        IResourceBuilder<ContainerResource> loki,
        IResourceBuilder<ContainerResource> tempo) =>
        builder.AddContainer(ResourceNames.Grafana, "grafana/grafana", settings.Images.Grafana)
            .WithBindMount("grafana/provisioning", "/etc/grafana/provisioning", isReadOnly: true)
            .WithBindMount("grafana/dashboards", "/etc/grafana/dashboards", isReadOnly: true)
            .WithHttpEndpoint(port: settings.Ports.Grafana, targetPort: 3000, name: "http")
            .WithHttpHealthCheck("/api/health")
            .WithEnvironment("GF_SECURITY_ADMIN_USER", settings.Grafana.AdminUser)
            .WithEnvironment("GF_SECURITY_ADMIN_PASSWORD", settings.Grafana.AdminPassword)
            .WithEnvironment("GF_USERS_ALLOW_SIGN_UP", settings.Grafana.AllowSignUp)
            .WithEnvironment("PROMETHEUS_DATASOURCE_URL", settings.Grafana.PrometheusDataSourceUrl)
            .WithEnvironment("LOKI_DATASOURCE_URL", settings.Grafana.LokiDataSourceUrl)
            .WithEnvironment("TEMPO_DATASOURCE_URL", settings.Grafana.TempoDataSourceUrl)
            .WithEnvironment("ALERT_WEBHOOK_URL", settings.Grafana.AlertWebhookUrl)
            .WaitFor(prometheus)
            .WaitFor(loki)
            .WaitFor(tempo);

    private static string PrometheusStartupCommand(AppHostSettings settings) =>
        "sed -e \"s|__SCRAPE_INTERVAL__|${PROMETHEUS_SCRAPE_INTERVAL}|g\" " +
        "-e \"s|__EVALUATION_INTERVAL__|${PROMETHEUS_EVALUATION_INTERVAL}|g\" " +
        "-e \"s|__API_SCRAPE_INTERVAL__|${PROMETHEUS_API_SCRAPE_INTERVAL}|g\" " +
        "-e \"s|__COLLECTOR_METRICS_TARGET__|${COLLECTOR_METRICS_TARGET}|g\" " +
        "/etc/prometheus/prometheus.yml > /tmp/prometheus.yml && " +
        "sed -e \"s|__API_METRICS_TARGET__|${API_METRICS_TARGET}|g\" " +
        "/etc/prometheus/targets/apiservice.json > /tmp/apiservice-targets.json && " +
        $"exec /bin/prometheus --config.file=/tmp/prometheus.yml " +
        $"--storage.tsdb.retention.time={settings.Monitoring.PrometheusRetention} " +
        $"--enable-feature={settings.Monitoring.PrometheusFeatures}";
}
