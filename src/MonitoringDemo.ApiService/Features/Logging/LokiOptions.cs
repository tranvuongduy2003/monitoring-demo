namespace MonitoringDemo.ApiService.Features.Logging;

public sealed class LokiOptions
{
    public const string SectionName = "Loki";
    public string BaseUrl { get; init; } = "http://localhost:3100";
}
