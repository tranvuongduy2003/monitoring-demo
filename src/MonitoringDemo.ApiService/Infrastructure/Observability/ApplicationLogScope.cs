using System.Collections;

namespace MonitoringDemo.ApiService.Infrastructure.Observability;

public sealed record ApplicationLogScope
{
    public required string EventName { get; init; }
    public string? CorrelationId { get; init; }
    public string? RequestId { get; init; }
    public string? TraceId { get; init; }
    public string? SpanId { get; init; }
    public string? Scenario { get; init; }
    public bool? SeedData { get; init; }
}

public static class ApplicationLogScopeExtensions
{
    public static IDisposable? BeginApplicationScope(
        this ILogger logger,
        ApplicationLogScope context)
    {
        ArgumentNullException.ThrowIfNull(logger);
        ArgumentNullException.ThrowIfNull(context);

        return logger.BeginScope(new StructuredLogScope(context));
    }

    private sealed class StructuredLogScope : IReadOnlyList<KeyValuePair<string, object?>>
    {
        private readonly KeyValuePair<string, object?>[] _properties;

        public StructuredLogScope(ApplicationLogScope context)
        {
            var properties = new List<KeyValuePair<string, object?>>
            {
                Property(LogPropertyNames.EventName, context.EventName)
            };

            AddIfPresent(properties, LogPropertyNames.CorrelationId, context.CorrelationId);
            AddIfPresent(properties, LogPropertyNames.RequestId, context.RequestId);
            AddIfPresent(properties, LogPropertyNames.TraceId, context.TraceId);
            AddIfPresent(properties, LogPropertyNames.SpanId, context.SpanId);
            AddIfPresent(properties, LogPropertyNames.Scenario, context.Scenario);
            AddIfPresent(properties, LogPropertyNames.SeedData, context.SeedData);

            _properties = [.. properties];
        }

        public int Count => _properties.Length;

        public KeyValuePair<string, object?> this[int index] => _properties[index];

        public IEnumerator<KeyValuePair<string, object?>> GetEnumerator() =>
            ((IEnumerable<KeyValuePair<string, object?>>)_properties).GetEnumerator();

        IEnumerator IEnumerable.GetEnumerator() => _properties.GetEnumerator();

        public override string ToString() =>
            string.Join(", ", _properties.Select(property => $"{property.Key}={property.Value}"));

        private static KeyValuePair<string, object?> Property(string name, object? value) =>
            new(name, value);

        private static void AddIfPresent<T>(
            ICollection<KeyValuePair<string, object?>> properties,
            string name,
            T? value)
        {
            if (value is not null)
            {
                properties.Add(Property(name, value));
            }
        }
    }
}

public static class LogPropertyNames
{
    public const string EventName = "event_name";
    public const string CorrelationId = "correlation_id";
    public const string RequestId = "request_id";
    public const string TraceId = "trace_id";
    public const string SpanId = "span_id";
    public const string Scenario = "scenario";
    public const string SeedData = "seed_data";
}
