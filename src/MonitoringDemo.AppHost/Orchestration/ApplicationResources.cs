using Aspire.Hosting.ApplicationModel;
using MonitoringDemo.AppHost.Configuration;

namespace MonitoringDemo.AppHost.Orchestration;

internal static class ApplicationResourceExtensions
{
    public static void AddApplicationWorkloads(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings,
        IResourceBuilder<PostgresDatabaseResource> database,
        ObservabilityResources observability)
    {
        var api = builder.AddProject<Projects.MonitoringDemo_ApiService>(ResourceNames.Api)
            .WithReference(database)
            .WithEnvironment("LOKI_OTLP_ENDPOINT", settings.Api.LokiOtlpEndpoint)
            .WithEnvironment("TEMPO_OTLP_ENDPOINT", settings.Api.TempoOtlpEndpoint)
            .WithEnvironment("COLLECTOR_OTLP_ENDPOINT", settings.Api.CollectorOtlpEndpoint)
            .WithEnvironment("Tempo__BaseUrl", settings.Api.TempoBaseUrl)
            .WithEnvironment("Loki__BaseUrl", settings.Api.LokiBaseUrl)
            .WithEnvironment("Prometheus__BaseUrl", settings.Api.PrometheusBaseUrl)
            .WithEnvironment("Prometheus__Retention", settings.Monitoring.PrometheusRetention)
            .WithEnvironment("Prometheus__ScrapeInterval", settings.Monitoring.PrometheusScrapeInterval)
            .WithEnvironment("Prometheus__ApiScrapeInterval", settings.Monitoring.PrometheusApiScrapeInterval)
            .WithEnvironment("Prometheus__EvaluationInterval", settings.Monitoring.PrometheusEvaluationInterval)
            .WithEnvironment("Cors__AllowedOrigins", settings.Api.AllowedOrigins)
            .WaitFor(database)
            .WaitFor(observability.Loki)
            .WaitFor(observability.Tempo)
            .WaitFor(observability.Collector)
            .WithHttpEndpoint(port: settings.Ports.Api);

        builder.AddViteApp(ResourceNames.Frontend, "../MonitoringDemo.Frontend")
            .WithReference(api)
            .WithEnvironment("VITE_GRAFANA_URL", settings.Frontend.GrafanaUrl)
            .WithEnvironment("VITE_PROMETHEUS_URL", settings.Frontend.PrometheusUrl)
            .WithEnvironment("VITE_API_PUBLIC_URL", settings.Frontend.ApiPublicUrl)
            .WaitFor(api)
            .WithHttpEndpoint(port: settings.Ports.Frontend, env: "PORT")
            .WithExternalHttpEndpoints();
    }
}
