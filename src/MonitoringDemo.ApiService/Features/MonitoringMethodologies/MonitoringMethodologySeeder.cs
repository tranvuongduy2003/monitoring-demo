namespace MonitoringDemo.ApiService.Features.MonitoringMethodologies;

public sealed class MonitoringMethodologySeeder
{
    public static readonly string[] SupportedScenarios = ["baseline", "traffic-spike", "failure-burst"];
    private static readonly string[] Operations = ["catalog.list", "orders.create", "orders.list", "products.get"];
    private static readonly string[] Resources = ["cpu", "memory", "thread-pool", "database-pool"];

    private readonly MonitoringMethodologyMetrics _metrics;
    private readonly ILogger<MonitoringMethodologySeeder> _logger;
    private int _sequence;
    private string _activeScenario = "baseline";
    private long _activeScenarioUntilUtcTicks;

    public MonitoringMethodologySeeder(
        MonitoringMethodologyMetrics metrics,
        ILogger<MonitoringMethodologySeeder> logger)
    {
        _metrics = metrics;
        _logger = logger;
    }

    public int Seed(
        string scenario,
        int requestCount,
        int windowMinutes = 60,
        bool writeLog = true)
    {
        scenario = NormalizeScenario(scenario);
        var random = new Random(20260928 + Interlocked.Increment(ref _sequence));
        var now = DateTimeOffset.UtcNow;

        for (int index = 0; index < requestCount; index++)
        {
            var timestamp = now.AddSeconds(-random.Next(0, Math.Max(1, windowMinutes * 60)));
            bool failed = random.NextDouble() < ErrorProbability(scenario);
            _metrics.RecordRequest(
                CreateDuration(random, scenario, failed),
                failed,
                Operations[random.Next(Operations.Length)],
                scenario,
                timestamp);
        }

        int resourceIntervals = Math.Clamp(windowMinutes, 1, 120);
        for (int minute = 0; minute < resourceIntervals; minute++)
        {
            var timestamp = now.AddMinutes(-minute).AddSeconds(-random.Next(0, 60));
            foreach (string resource in Resources)
            {
                var (utilization, saturation, errors) = CreateResourceSample(random, scenario, resource);
                _metrics.RecordResource(resource, utilization, saturation, errors, scenario, timestamp);
            }
        }

        if (writeLog)
        {
            _activeScenario = scenario;
            Interlocked.Exchange(
                ref _activeScenarioUntilUtcTicks,
                DateTimeOffset.UtcNow.AddMinutes(2).UtcTicks);
            _logger.LogInformation(
                "Seeded {RequestCount} monitoring methodology requests using the {Scenario} scenario",
                requestCount,
                scenario);
        }

        return requestCount;
    }

    public string GetActiveScenario() =>
        DateTimeOffset.UtcNow.UtcTicks <= Interlocked.Read(ref _activeScenarioUntilUtcTicks)
            ? _activeScenario
            : "baseline";

    public static string NormalizeScenario(string? scenario) =>
        SupportedScenarios.Contains(scenario, StringComparer.OrdinalIgnoreCase)
            ? scenario!.ToLowerInvariant()
            : "baseline";

    private static double ErrorProbability(string scenario) => scenario switch
    {
        "traffic-spike" => 0.08,
        "failure-burst" => 0.35,
        _ => 0.02
    };

    private static double CreateDuration(Random random, string scenario, bool failed)
    {
        if (failed)
        {
            return scenario == "failure-burst" ? random.Next(600, 2_401) : random.Next(250, 1_201);
        }

        return scenario switch
        {
            "traffic-spike" => random.Next(180, 1_101),
            "failure-burst" => random.Next(250, 1_501),
            _ => random.NextDouble() < 0.95 ? random.Next(35, 181) : random.Next(181, 601)
        };
    }

    private static (double Utilization, double Saturation, int Errors) CreateResourceSample(
        Random random,
        string scenario,
        string resource)
    {
        double resourceOffset = resource switch
        {
            "cpu" => 0.05,
            "database-pool" => 0.09,
            "thread-pool" => 0.03,
            _ => 0
        };
        double utilizationBase = scenario switch
        {
            "traffic-spike" => 0.78,
            "failure-burst" => 0.68,
            _ => 0.38
        };
        double saturationBase = scenario switch
        {
            "traffic-spike" => 0.65,
            "failure-burst" => 0.82,
            _ => 0.08
        };
        int errors = scenario switch
        {
            "failure-burst" => random.Next(0, 4),
            "traffic-spike" when random.NextDouble() < 0.18 => 1,
            _ => 0
        };

        return (
            Math.Clamp(utilizationBase + resourceOffset + ((random.NextDouble() - 0.5) * 0.18), 0, 1),
            Math.Clamp(saturationBase + resourceOffset + ((random.NextDouble() - 0.5) * 0.20), 0, 1),
            errors);
    }
}
