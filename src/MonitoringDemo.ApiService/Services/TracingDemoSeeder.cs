using System.Diagnostics;
using MonitoringDemo.ApiService.Telemetry;

namespace MonitoringDemo.ApiService.Services;

public sealed class TracingDemoSeeder
{
    private const int MinimumSeedCount = 1;
    private const int MaximumSeedCount = 50;
    private readonly AppActivitySource _activitySource;
    private int _sequence;

    public TracingDemoSeeder(AppActivitySource activitySource)
    {
        _activitySource = activitySource;
    }

    public TraceSeedResult Seed(int count)
    {
        count = Math.Clamp(count, MinimumSeedCount, MaximumSeedCount);
        var traceIds = new List<string>(count);

        for (var index = 0; index < count; index++)
        {
            var sequence = Interlocked.Increment(ref _sequence);
            var traceId = EmitTrace(sequence);
            if (traceId is not null)
            {
                traceIds.Add(traceId);
            }
        }

        return new TraceSeedResult(count, traceIds);
    }

    private string? EmitTrace(int sequence)
    {
        var failed = sequence % 4 == 0;
        var slow = sequence % 3 == 0;
        var totalDuration = slow ? 1_250 + sequence % 240 : 420 + sequence % 180;
        var traceStart = DateTime.UtcNow.AddMilliseconds(-totalDuration - 20);
        var previousActivity = Activity.Current;

        try
        {
            // A seeded checkout starts a new distributed trace instead of becoming a child
            // of the HTTP request that triggered seeding.
            Activity.Current = null;
            using var root = StartSpan(
                "CheckoutOrder",
                ActivityKind.Server,
                traceStart,
                totalDuration,
                [
                    new("demo.trace", true),
                    new("demo.scenario", failed ? "payment-declined" : slow ? "slow-checkout" : "checkout"),
                    new("order.id", 20_000 + sequence),
                    new("customer.tier", sequence % 2 == 0 ? "premium" : "standard"),
                    new("http.request.method", "POST"),
                    new("url.path", "/demo/checkout")
                ]);

            if (root is null)
            {
                return null;
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
                [new("validation.result", "valid"), new("cart.currency", "USD")],
                new ActivityEvent(
                    "cart.validated",
                    traceStart.AddMilliseconds(35),
                    new ActivityTagsCollection { { "validation.rules", 6 } }));

            using (var inventory = StartSpan(
                "ReserveInventory",
                ActivityKind.Client,
                traceStart.AddMilliseconds(58),
                slow ? 720 : 105,
                [new("rpc.system", "inventory"), new("inventory.warehouse", "sg-01")]))
            {
                EmitChild(
                    "UPDATE inventory",
                    ActivityKind.Client,
                    traceStart.AddMilliseconds(74),
                    slow ? 650 : 72,
                    ActivityStatusCode.Ok,
                    [new("db.system", "postgresql"), new("db.operation.name", "UPDATE"), new("db.namespace", "monitoringdb")],
                    new ActivityEvent("inventory.reserved", traceStart.AddMilliseconds(slow ? 700 : 125)));

                inventory?.SetStatus(ActivityStatusCode.Ok);
            }

            using (var payment = StartSpan(
                "ChargePayment",
                ActivityKind.Client,
                traceStart.AddMilliseconds(slow ? 810 : 178),
                failed ? 310 : 124,
                [new("server.address", "payments.demo"), new("payment.method", "card")]))
            {
                EmitChild(
                    "POST /authorize",
                    ActivityKind.Client,
                    traceStart.AddMilliseconds(slow ? 835 : 194),
                    failed ? 260 : 82,
                    failed ? ActivityStatusCode.Error : ActivityStatusCode.Ok,
                    [new("http.request.method", "POST"), new("http.response.status_code", failed ? 402 : 200)],
                    failed
                        ? ExceptionEvent(traceStart.AddMilliseconds(slow ? 1_020 : 350), sequence)
                        : new ActivityEvent("payment.authorized", traceStart.AddMilliseconds(slow ? 900 : 240)));

                if (failed)
                {
                    payment?.SetStatus(ActivityStatusCode.Error, "Card authorization was declined");
                    payment?.AddEvent(new ActivityEvent("payment.declined", tags: new ActivityTagsCollection
                    {
                        { "payment.reason", "insufficient_funds" }
                    }));
                }
                else
                {
                    payment?.SetStatus(ActivityStatusCode.Ok);
                }
            }

            EmitChild(
                "PublishOrderEvent",
                ActivityKind.Producer,
                traceStart.AddMilliseconds(totalDuration - 70),
                42,
                failed ? ActivityStatusCode.Unset : ActivityStatusCode.Ok,
                [new("messaging.system", "demo-bus"), new("messaging.destination.name", "orders")],
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

    private Activity? StartSpan(
        string name,
        ActivityKind kind,
        DateTime start,
        int durationMilliseconds,
        ActivityTagsCollection tags)
    {
        var parentContext = Activity.Current?.Context ?? default;
        var activity = _activitySource.Source.StartActivity(
            name,
            kind,
            parentContext,
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
}

public sealed record TraceSeedResult(int Requested, IReadOnlyList<string> TraceIds);

public sealed class TracingSeedService : BackgroundService
{
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(3);
    private const int StartupTraceCount = 12;
    private readonly TracingDemoSeeder _seeder;

    public TracingSeedService(TracingDemoSeeder seeder)
    {
        _seeder = seeder;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
            _seeder.Seed(StartupTraceCount);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown before startup seeding completes.
        }
    }
}
