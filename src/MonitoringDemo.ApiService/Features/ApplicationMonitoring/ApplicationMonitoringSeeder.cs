using System.Diagnostics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.ApplicationMonitoring;

public sealed class ApplicationMonitoringSeeder
{
    public static readonly string[] SupportedScenarios = ["healthy", "cache-pressure", "dependency-outage"];
    private static readonly string[] Routes = ["/api/orders", "/api/products", "/api/checkout"];
    private static readonly string[] DatabaseOperations = ["SELECT", "INSERT", "UPDATE"];
    private static readonly string[] Dependencies = ["payments-api", "inventory-api", "shipping-api"];
    private readonly ApplicationMonitoringMetrics _metrics;
    private readonly AppActivitySource _activitySource;
    private readonly ILogger<ApplicationMonitoringSeeder> _logger;
    private int _sequence;

    public ApplicationMonitoringSeeder(ApplicationMonitoringMetrics metrics, AppActivitySource activitySource, ILogger<ApplicationMonitoringSeeder> logger)
    {
        _metrics = metrics;
        _activitySource = activitySource;
        _logger = logger;
    }

    public int Seed(string? requestedScenario, int transactionCount, int windowMinutes = 60, bool writeLog = true)
    {
        string scenario = NormalizeScenario(requestedScenario);
        var random = new Random(20260928 + Interlocked.Increment(ref _sequence));
        var now = DateTimeOffset.UtcNow;
        int loggedErrors = 0;

        for (int index = 0; index < transactionCount; index++)
        {
            var timestamp = now.AddSeconds(-random.Next(0, Math.Max(1, windowMinutes * 60)));
            if (SeedTransaction(random, scenario, timestamp, writeLog && loggedErrors < 3))
            {
                loggedErrors++;
            }
        }

        if (writeLog)
        {
            _logger.LogInformation("Seeded {TransactionCount} application monitoring transactions for {Scenario}", transactionCount, scenario);
        }

        return transactionCount;
    }

    public static string NormalizeScenario(string? scenario) =>
        SupportedScenarios.Contains(scenario, StringComparer.OrdinalIgnoreCase) ? scenario!.ToLowerInvariant() : "healthy";

    private bool SeedTransaction(Random random, string scenario, DateTimeOffset timestamp, bool mayLogError)
    {
        string route = Routes[random.Next(Routes.Length)];
        string method = route == "/api/checkout" ? "POST" : "GET";
        string databaseOperation = DatabaseOperations[random.Next(DatabaseOperations.Length)];
        string table = route.Contains("products", StringComparison.Ordinal) ? "products" : "orders";
        string dependency = Dependencies[random.Next(Dependencies.Length)];

        bool databaseSuccess = random.NextDouble() >= (scenario == "dependency-outage" ? .08 : .015);
        string cacheOutcome = CreateCacheOutcome(random, scenario);
        bool dependencySuccess = random.NextDouble() >= DependencyFailureRate(scenario);
        bool requestSuccess = databaseSuccess && dependencySuccess && cacheOutcome != "error";

        double databaseDuration = Duration(random, scenario == "dependency-outage" ? 18 : 7, scenario == "dependency-outage" ? 190 : 70);
        double cacheDuration = Duration(random, 1, scenario == "cache-pressure" ? 55 : 12);
        double dependencyDuration = Duration(random, 25, scenario == "dependency-outage" ? 1_600 : 260);
        double requestDuration = databaseDuration + cacheDuration + dependencyDuration + random.Next(8, 45);
        int statusCode = requestSuccess ? (method == "POST" ? 201 : 200) : (dependencySuccess ? 500 : 503);

        using var root = StartActivity("checkout.process", ActivityKind.Server, timestamp, scenario, route);
        string traceId = root?.TraceId.ToHexString() ?? ActivityTraceId.CreateRandom().ToHexString();
        CompleteActivity(root, requestSuccess, requestDuration, requestSuccess ? null : "Application transaction failed");

        CreateChildSpan("database.persist-order", ActivityKind.Client, timestamp, databaseDuration, databaseSuccess, scenario, "db.system.name", "postgresql");
        CreateChildSpan("cache.lookup-product", ActivityKind.Internal, timestamp, cacheDuration, cacheOutcome != "error", scenario, "cache.outcome", cacheOutcome);
        CreateChildSpan("dependency.reserve-inventory", ActivityKind.Client, timestamp, dependencyDuration, dependencySuccess, scenario, "server.address", dependency);

        _metrics.RecordHttp(route, method, statusCode, requestDuration, scenario, timestamp);
        _metrics.RecordDatabase(databaseOperation, table, databaseSuccess, databaseDuration, scenario, timestamp);
        _metrics.RecordCache("GET", "product-catalog", cacheOutcome, cacheDuration, scenario, timestamp);
        _metrics.RecordDependency(dependency, "reserve", dependencySuccess, dependencyDuration, scenario, timestamp);

        bool checkout = route == "/api/checkout";
        string businessEvent = checkout ? (requestSuccess ? "checkout.completed" : "checkout.started") : "catalog.viewed";
        double orderValue = checkout && requestSuccess ? Math.Round(20 + random.NextDouble() * 480, 2) : 0;
        double queueDepth = scenario switch { "cache-pressure" => random.Next(30, 91), "dependency-outage" => random.Next(55, 141), _ => random.Next(0, 18) };
        _metrics.RecordBusinessEvent(businessEvent, orderValue, queueDepth, scenario, timestamp);
        _metrics.RecordSpan("checkout.process", traceId, requestSuccess, requestDuration, scenario, timestamp);

        if (!requestSuccess)
        {
            string source = !dependencySuccess ? "dependency" : !databaseSuccess ? "database" : "cache";
            string type = source switch { "dependency" => "DependencyUnavailable", "database" => "DatabaseTimeout", _ => "CacheConnectionError" };
            string message = source switch { "dependency" => $"{dependency} did not complete the reserve call", "database" => "PostgreSQL operation exceeded its deadline", _ => "Product cache was unavailable" };
            _metrics.RecordError(source, type, statusCode == 503 ? "critical" : "error", message, scenario, timestamp);
            if (mayLogError)
            {
                using var scope = _logger.BeginScope(new Dictionary<string, object?> { ["TraceId"] = traceId, ["Scenario"] = scenario, ["ErrorSource"] = source });
                _logger.LogError("Application monitoring seed captured {ErrorType}: {ErrorMessage}", type, message);
            }
        }

        return !requestSuccess && mayLogError;
    }

    private Activity? StartActivity(string name, ActivityKind kind, DateTimeOffset timestamp, string scenario, string route) =>
        _activitySource.Source.StartActivity(name, kind, default(ActivityContext),
            tags: [new("scenario", scenario), new("http.route", route), new("monitoring.synthetic", true)], startTime: timestamp);

    private void CreateChildSpan(string name, ActivityKind kind, DateTimeOffset timestamp, double durationMs, bool success, string scenario, string attributeName, string attributeValue)
    {
        using var activity = _activitySource.Source.StartActivity(name, kind, Activity.Current?.Context ?? default,
            tags: [new("scenario", scenario), new(attributeName, attributeValue), new("monitoring.synthetic", true)], startTime: timestamp);
        CompleteActivity(activity, success, durationMs, success ? null : $"{name} failed");
    }

    private static void CompleteActivity(Activity? activity, bool success, double durationMs, string? error)
    {
        if (activity is null) return;
        if (!success)
        {
            activity.SetStatus(ActivityStatusCode.Error, error);
            activity.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection
            {
                ["exception.type"] = "SyntheticApplicationException",
                ["exception.message"] = error
            }));
        }
        else
        {
            activity.SetStatus(ActivityStatusCode.Ok);
        }
        activity.SetEndTime(activity.StartTimeUtc.AddMilliseconds(durationMs));
    }

    private static string CreateCacheOutcome(Random random, string scenario)
    {
        double roll = random.NextDouble();
        if (scenario == "cache-pressure") return roll < .22 ? "hit" : roll < .92 ? "miss" : "error";
        return roll < .82 ? "hit" : roll < .99 ? "miss" : "error";
    }

    private static double DependencyFailureRate(string scenario) => scenario == "dependency-outage" ? .38 : .025;
    private static double Duration(Random random, int minimum, int maximum) => Math.Round(minimum + random.NextDouble() * (maximum - minimum), 2);
}
