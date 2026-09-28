using System.Diagnostics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Tracing;

public sealed class TracingDemoSeeder
{
    private const int MinimumSeedCount = 1;
    private const int MaximumSeedCount = 50;
    private readonly AppActivitySource _activitySource;
    private int _sequence;

    public TracingDemoSeeder(AppActivitySource activitySource) => _activitySource = activitySource;

    public TraceSeedResult Seed(int count)
    {
        count = Math.Clamp(count, MinimumSeedCount, MaximumSeedCount);
        var traceIds = new List<string>(count);
        for (var index = 0; index < count; index++)
        {
            var traceId = EmitTrace(Interlocked.Increment(ref _sequence));
            if (traceId is not null) traceIds.Add(traceId);
        }

        return new TraceSeedResult(count, traceIds);
    }

    private string? EmitTrace(int sequence)
    {
        var failed = sequence % 4 == 0;
        var slow = sequence % 3 == 0;
        var totalDuration = slow ? 1_650 + sequence % 240 : 720 + sequence % 180;
        var traceStart = DateTime.UtcNow.AddMilliseconds(-totalDuration - 20);
        var previousActivity = Activity.Current;
        var baggage = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["tenant.id"] = sequence % 2 == 0 ? "northwind" : "contoso",
            ["customer.tier"] = sequence % 2 == 0 ? "premium" : "standard",
            ["region"] = sequence % 3 == 0 ? "eu-west" : "ap-southeast"
        };

        try
        {
            Activity.Current = null;
            using var root = StartSpan(
                "CheckoutOrder",
                ActivityKind.Server,
                traceStart,
                totalDuration,
                [
                    new("demo.trace", true),
                    new("demo.context_propagation", true),
                    new("demo.scenario", failed ? "payment-declined" : slow ? "slow-checkout" : "checkout"),
                    new("demo.service.name", "edge-gateway"),
                    new("order.id", 20_000 + sequence),
                    new("customer.tier", baggage["customer.tier"]),
                    new("http.request.method", "POST"),
                    new("url.path", "/demo/checkout")
                ]);

            if (root is null) return null;

            root.TraceStateString = $"demo=seed-{sequence},sample=full";
            foreach (var item in baggage)
            {
                root.AddBaggage(item.Key, item.Value);
                root.SetTag($"demo.baggage.{item.Key}", item.Value);
            }

            root.AddEvent(new ActivityEvent(
                "checkout.received",
                traceStart.AddMilliseconds(2),
                new ActivityTagsCollection { { "cart.items", sequence % 5 + 1 } }));

            EmitChild(
                "ValidateCart",
                ActivityKind.Internal,
                traceStart.AddMilliseconds(12),
                38,
                ActivityStatusCode.Ok,
                [
                    new("demo.service.name", "edge-gateway"),
                    new("validation.result", "valid"),
                    new("cart.currency", "USD")
                ],
                new ActivityEvent(
                    "cart.validated",
                    traceStart.AddMilliseconds(35),
                    new ActivityTagsCollection { { "validation.rules", 6 } }));

            EmitHttpHop(traceStart, slow, baggage);
            EmitGrpcHop(traceStart, slow, failed, sequence, baggage);

            EmitChild(
                "PublishOrderEvent",
                ActivityKind.Producer,
                traceStart.AddMilliseconds(totalDuration - 70),
                42,
                failed ? ActivityStatusCode.Unset : ActivityStatusCode.Ok,
                [
                    new("demo.service.name", "edge-gateway"),
                    new("messaging.system", "demo-bus"),
                    new("messaging.destination.name", "orders")
                ],
                new ActivityEvent("message.enqueued", traceStart.AddMilliseconds(totalDuration - 42)));

            root.AddEvent(new ActivityEvent(
                failed ? "checkout.failed" : "checkout.completed",
                traceStart.AddMilliseconds(totalDuration - 5),
                new ActivityTagsCollection { { "order.outcome", failed ? "declined" : "accepted" } }));
            root.SetStatus(
                failed ? ActivityStatusCode.Error : ActivityStatusCode.Ok,
                failed ? "Payment authorization failed" : null);
            return root.TraceId.ToString();
        }
        finally
        {
            Activity.Current = previousActivity;
        }
    }

    private void EmitHttpHop(DateTime traceStart, bool slow, IReadOnlyDictionary<string, string> baggage)
    {
        var clientStart = traceStart.AddMilliseconds(58);
        var clientDuration = slow ? 720 : 145;
        using var client = StartSpan(
            "HTTP POST inventory/reservations",
            ActivityKind.Client,
            clientStart,
            clientDuration,
            [
                new("demo.service.name", "edge-gateway"),
                new("demo.propagation.transport", "http"),
                new("demo.propagation.role", "injector"),
                new("http.request.method", "POST"),
                new("server.address", "inventory-api")
            ]);

        if (client is null) return;
        var carrier = InjectContext(client, baggage);
        AddCarrierTags(client, carrier);

        if (!TryExtractContext(carrier, out var remoteParent, out var receivedBaggage))
        {
            client.SetStatus(ActivityStatusCode.Error, "Seeded HTTP context extraction failed");
            return;
        }

        var serverStart = clientStart.AddMilliseconds(11);
        using var server = StartRemoteSpan(
            "POST /inventory/reservations",
            remoteParent,
            serverStart,
            clientDuration - 24,
            PropagationTags("http", "inventory-api", carrier, receivedBaggage));

        if (server is null) return;
        CopyBaggage(server, receivedBaggage);
        server.AddEvent(new ActivityEvent("context.extracted", serverStart.AddMilliseconds(1)));

        EmitChild(
            "UPDATE inventory",
            ActivityKind.Client,
            serverStart.AddMilliseconds(18),
            slow ? 650 : 82,
            ActivityStatusCode.Ok,
            [
                new("demo.service.name", "inventory-api"),
                new("db.system", "postgresql"),
                new("db.operation.name", "UPDATE"),
                new("db.namespace", "monitoringdb")
            ],
            new ActivityEvent("inventory.reserved", serverStart.AddMilliseconds(slow ? 675 : 105)));

        server.SetStatus(ActivityStatusCode.Ok);
        client.SetStatus(ActivityStatusCode.Ok);
    }

    private void EmitGrpcHop(
        DateTime traceStart,
        bool slow,
        bool failed,
        int sequence,
        IReadOnlyDictionary<string, string> baggage)
    {
        var clientStart = traceStart.AddMilliseconds(slow ? 835 : 235);
        var clientDuration = failed ? 340 : 185;
        using var client = StartSpan(
            "gRPC PaymentService/Authorize",
            ActivityKind.Client,
            clientStart,
            clientDuration,
            [
                new("demo.service.name", "edge-gateway"),
                new("demo.propagation.transport", "grpc"),
                new("demo.propagation.role", "injector"),
                new("rpc.system", "grpc"),
                new("rpc.service", "PaymentService"),
                new("rpc.method", "Authorize"),
                new("server.address", "payment-api")
            ]);

        if (client is null) return;
        var metadata = InjectContext(client, baggage);
        AddCarrierTags(client, metadata);

        if (!TryExtractContext(metadata, out var remoteParent, out var receivedBaggage))
        {
            client.SetStatus(ActivityStatusCode.Error, "Seeded gRPC context extraction failed");
            return;
        }

        var serverStart = clientStart.AddMilliseconds(9);
        using var server = StartRemoteSpan(
            "PaymentService/Authorize",
            remoteParent,
            serverStart,
            clientDuration - 18,
            PropagationTags("grpc", "payment-api", metadata, receivedBaggage));

        if (server is null) return;
        CopyBaggage(server, receivedBaggage);
        server.AddEvent(new ActivityEvent("metadata.extracted", serverStart.AddMilliseconds(1)));

        EmitChild(
            "POST /provider/authorize",
            ActivityKind.Client,
            serverStart.AddMilliseconds(22),
            failed ? 275 : 105,
            failed ? ActivityStatusCode.Error : ActivityStatusCode.Ok,
            [
                new("demo.service.name", "payment-api"),
                new("http.request.method", "POST"),
                new("http.response.status_code", failed ? 402 : 200),
                new("payment.method", "card")
            ],
            failed
                ? ExceptionEvent(serverStart.AddMilliseconds(292), sequence)
                : new ActivityEvent("payment.authorized", serverStart.AddMilliseconds(118)));

        if (failed)
        {
            server.SetStatus(ActivityStatusCode.Error, "Card authorization was declined");
            server.AddEvent(new ActivityEvent("payment.declined", tags: new ActivityTagsCollection
            {
                { "payment.reason", "insufficient_funds" }
            }));
            client.SetStatus(ActivityStatusCode.Error, "Remote payment authorization failed");
        }
        else
        {
            server.SetStatus(ActivityStatusCode.Ok);
            client.SetStatus(ActivityStatusCode.Ok);
        }
    }

    private Activity? StartSpan(
        string name,
        ActivityKind kind,
        DateTime start,
        int durationMilliseconds,
        ActivityTagsCollection tags)
    {
        var parentContext = Activity.Current?.Context ?? default;
        var activity = _activitySource.Source.StartActivity(name, kind, parentContext, tags, startTime: start);
        activity?.SetEndTime(start.AddMilliseconds(durationMilliseconds));
        return activity;
    }

    private Activity? StartRemoteSpan(
        string name,
        ActivityContext remoteParent,
        DateTime start,
        int durationMilliseconds,
        ActivityTagsCollection tags)
    {
        var activity = _activitySource.Source.StartActivity(
            name,
            ActivityKind.Server,
            remoteParent,
            tags,
            startTime: start);
        activity?.SetEndTime(start.AddMilliseconds(durationMilliseconds));
        return activity;
    }

    private void EmitChild(
        string name,
        ActivityKind kind,
        DateTime start,
        int durationMilliseconds,
        ActivityStatusCode status,
        ActivityTagsCollection tags,
        ActivityEvent activityEvent)
    {
        using var activity = StartSpan(name, kind, start, durationMilliseconds, tags);
        activity?.AddEvent(activityEvent);
        activity?.SetStatus(status, status == ActivityStatusCode.Error ? "Seeded failure" : null);
    }

    private static PropagationCarrier InjectContext(Activity activity, IReadOnlyDictionary<string, string> baggage)
    {
        var flags = activity.ActivityTraceFlags.HasFlag(ActivityTraceFlags.Recorded) ? "01" : "00";
        return new PropagationCarrier(
            $"00-{activity.TraceId}-{activity.SpanId}-{flags}",
            activity.TraceStateString ?? string.Empty,
            string.Join(',', baggage.OrderBy(item => item.Key, StringComparer.Ordinal).Select(item =>
                $"{Uri.EscapeDataString(item.Key)}={Uri.EscapeDataString(item.Value)}")));
    }

    private static bool TryExtractContext(
        PropagationCarrier carrier,
        out ActivityContext remoteContext,
        out IReadOnlyDictionary<string, string> baggage)
    {
        baggage = carrier.Baggage
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(member => member.Split('=', 2))
            .Where(parts => parts.Length == 2)
            .ToDictionary(
                parts => Uri.UnescapeDataString(parts[0]),
                parts => Uri.UnescapeDataString(parts[1]),
                StringComparer.Ordinal);
        return ActivityContext.TryParse(carrier.TraceParent, carrier.TraceState, true, out remoteContext);
    }

    private static ActivityTagsCollection PropagationTags(
        string transport,
        string serviceName,
        PropagationCarrier carrier,
        IReadOnlyDictionary<string, string> baggage)
    {
        var tags = new ActivityTagsCollection
        {
            { "demo.service.name", serviceName },
            { "demo.propagation.transport", transport },
            { "demo.propagation.role", "extractor" },
            { "demo.propagation.success", true },
            { "demo.propagation.remote_parent", true },
            { "demo.propagation.traceparent", carrier.TraceParent },
            { "demo.propagation.tracestate", carrier.TraceState },
            { "demo.propagation.baggage", carrier.Baggage },
            { "demo.propagation.baggage_count", baggage.Count }
        };
        foreach (var item in baggage) tags.Add($"demo.baggage.{item.Key}", item.Value);
        return tags;
    }

    private static void AddCarrierTags(Activity activity, PropagationCarrier carrier)
    {
        activity.SetTag("demo.propagation.traceparent", carrier.TraceParent);
        activity.SetTag("demo.propagation.tracestate", carrier.TraceState);
        activity.SetTag("demo.propagation.baggage", carrier.Baggage);
    }

    private static void CopyBaggage(Activity activity, IReadOnlyDictionary<string, string> baggage)
    {
        foreach (var item in baggage) activity.AddBaggage(item.Key, item.Value);
    }

    private static ActivityEvent ExceptionEvent(DateTime timestamp, int sequence) =>
        new(
            "exception",
            timestamp,
            new ActivityTagsCollection
            {
                { "exception.type", typeof(InvalidOperationException).FullName },
                { "exception.message", $"Seeded payment decline for order {20_000 + sequence}" },
                { "exception.escaped", false }
            });

    private sealed record PropagationCarrier(string TraceParent, string TraceState, string Baggage);
}

public sealed record TraceSeedResult(int Requested, IReadOnlyList<string> TraceIds);

