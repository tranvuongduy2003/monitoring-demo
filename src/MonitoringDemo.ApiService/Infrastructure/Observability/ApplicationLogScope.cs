using System.Collections;

namespace MonitoringDemo.ApiService.Infrastructure.Observability;

public sealed record ApplicationLogScope
{
    public required string EventName { get; init; }
    public string? CorrelationId { get; init; }
    public string? RequestId { get; init; }
    public string? TraceId { get; init; }
    public string? SpanId { get; init; }
    public string? Region { get; init; }
    public string? TenantId { get; init; }
    public int? ProductId { get; init; }
    public string? ProductCategory { get; init; }
    public string? Worker { get; init; }
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
            AddIfPresent(properties, LogPropertyNames.Region, context.Region);
            AddIfPresent(properties, LogPropertyNames.TenantId, context.TenantId);
            AddIfPresent(properties, LogPropertyNames.ProductId, context.ProductId);
            AddIfPresent(properties, LogPropertyNames.ProductCategory, context.ProductCategory);
            AddIfPresent(properties, LogPropertyNames.Worker, context.Worker);
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
    public const string Region = "region";
    public const string TenantId = "tenant_id";
    public const string ProductId = "product_id";
    public const string ProductCategory = "product_category";
    public const string Worker = "worker";
    public const string SeedData = "seed_data";
}
