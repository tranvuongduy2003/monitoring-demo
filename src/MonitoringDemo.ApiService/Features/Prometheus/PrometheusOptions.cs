namespace MonitoringDemo.ApiService.Features.Prometheus;

public sealed class PrometheusOptions
{
    public const string SectionName = "Prometheus";
    public string BaseUrl { get; init; } = "http://localhost:9090";
    public string Retention { get; init; } = "15d";
    public string ScrapeInterval { get; init; } = "15s";
    public string ApiScrapeInterval { get; init; } = "5s";
    public string EvaluationInterval { get; init; } = "15s";
}
