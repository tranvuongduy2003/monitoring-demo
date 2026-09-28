namespace MonitoringDemo.ApiService.Features.Tracing;

public sealed class TempoOptions
{
    public const string SectionName = "Tempo";
    public string BaseUrl { get; init; } = "http://localhost:3200";
}
