using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Grafana;

public sealed class FundamentalAlertingService
{
    private const int MaximumSamples = 12_000;
    private static readonly string[] SupportedScenarios = ["healthy", "pending", "firing", "alert-fatigue"];
    private readonly object _sync = new();
    private readonly Counter<long> _evaluations;
    private readonly Counter<long> _transitions;
    private readonly Counter<long> _notifications;
    private readonly Counter<long> _suppressedNotifications;
    private readonly ConcurrentQueue<AlertEvaluationSample> _evaluationSamples = new();
    private readonly ConcurrentQueue<AlertTransitionSample> _transitionSamples = new();
    private readonly ConcurrentQueue<AlertNotificationSample> _notificationSamples = new();
    private readonly Dictionary<string, AlertRuleRuntime> _runtime = RuleCatalog.ToDictionary(
        rule => rule.Uid,
        rule => new AlertRuleRuntime(rule.Threshold * 0.6, "Normal"),
        StringComparer.Ordinal);
    private readonly ILogger<FundamentalAlertingService> _logger;
    private int _evaluationSampleCount;
    private int _transitionSampleCount;
    private int _notificationSampleCount;
    private int _seedRun;

    public FundamentalAlertingService(
        IMeterFactory meterFactory,
        ILogger<FundamentalAlertingService> logger)
    {
        _logger = logger;
        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _evaluations = meter.CreateCounter<long>(
            "alerting_demo_rule_evaluations_total",
            unit: "{evaluation}",
            description: "Fundamental alerting rule evaluations by resulting state");
        _transitions = meter.CreateCounter<long>(
            "alerting_demo_state_transitions_total",
            unit: "{transition}",
            description: "Fundamental alerting state transitions");
        _notifications = meter.CreateCounter<long>(
            "alerting_demo_notifications_total",
            unit: "{notification}",
            description: "Fundamental alerting notification attempts by channel and delivery status");
        _suppressedNotifications = meter.CreateCounter<long>(
            "alerting_demo_suppressed_notifications_total",
            unit: "{notification}",
            description: "Notifications suppressed by grouping, cooldowns, or mute timings");

        meter.CreateObservableGauge(
            "alerting_demo_signal_value",
            ObserveSignalValues,
            description: "Current value evaluated by each fundamental alerting rule");
        meter.CreateObservableGauge(
            "alerting_demo_active_instances",
            ObserveActiveInstances,
            unit: "{alert}",
            description: "Current alert instances labeled by Normal, Pending, or Firing state");
    }

    public AlertingSeedResult Seed(string? requestedScenario, int requestedCount)
    {
        string scenario = NormalizeScenario(requestedScenario);
        int count = Math.Clamp(requestedCount, 12, 1_200);
        int run = Interlocked.Increment(ref _seedRun);
        var random = new Random(20261001 + (run * 31) + Array.IndexOf(SupportedScenarios, scenario));
        var startedAt = DateTimeOffset.UtcNow.AddMinutes(-Math.Min(59, Math.Max(8, count / 4)));
        var previousStates = new Dictionary<string, string>(StringComparer.Ordinal);

        lock (_sync)
        {
            foreach (var rule in RuleCatalog)
            {
                previousStates[rule.Uid] = _runtime[rule.Uid].State;
            }
        }

        for (int index = 0; index < count; index++)
        {
            var rule = RuleCatalog[index % RuleCatalog.Count];
            int ruleEvaluation = index / RuleCatalog.Count;
            int evaluationsPerRule = Math.Max(1, (int)Math.Ceiling(count / (double)RuleCatalog.Count));
            double progress = ruleEvaluation / (double)Math.Max(1, evaluationsPerRule - 1);
            string state = StateFor(scenario, progress, ruleEvaluation);
            double value = ValueFor(rule, state, scenario, random);
            var timestamp = startedAt.AddTicks((DateTimeOffset.UtcNow - startedAt).Ticks * index / Math.Max(1, count - 1));
            string previousState = previousStates[rule.Uid];

            RecordEvaluation(rule, value, state, scenario, timestamp);

            if (!string.Equals(previousState, state, StringComparison.Ordinal))
            {
                RecordTransition(rule, previousState, state, scenario, timestamp);
                RouteTransition(rule, previousState, state, scenario, timestamp, random);
                previousStates[rule.Uid] = state;
            }
            else if (scenario == "alert-fatigue" && state == "Firing" && ruleEvaluation % 3 == 0)
            {
                RouteNotification(rule, "Reminder", scenario, timestamp, random, forceSuppression: true);
            }

            lock (_sync)
            {
                _runtime[rule.Uid] = new AlertRuleRuntime(value, state);
            }
        }

        _logger.LogInformation(
            "Seeded {EvaluationCount} fundamental alert evaluations for the {Scenario} scenario in run {SeedRun}",
            count,
            scenario,
            run);

        return new AlertingSeedResult(count, run, scenario, GetAnalytics(60));
    }

    public AlertingAnalytics GetAnalytics(int requestedWindowMinutes)
    {
        int windowMinutes = Math.Clamp(requestedWindowMinutes, 5, 240);
        var now = DateTimeOffset.UtcNow;
        var cutoff = now.AddMinutes(-windowMinutes);
        var evaluations = _evaluationSamples
            .Where(sample => sample.Timestamp >= cutoff && sample.Timestamp <= now)
            .OrderBy(sample => sample.Timestamp)
            .ToArray();
        var transitions = _transitionSamples
            .Where(sample => sample.Timestamp >= cutoff && sample.Timestamp <= now)
            .OrderBy(sample => sample.Timestamp)
            .ToArray();
        var notifications = _notificationSamples
            .Where(sample => sample.Timestamp >= cutoff && sample.Timestamp <= now)
            .OrderBy(sample => sample.Timestamp)
            .ToArray();

        Dictionary<string, AlertRuleRuntime> runtime;
        lock (_sync)
        {
            runtime = new Dictionary<string, AlertRuleRuntime>(_runtime, StringComparer.Ordinal);
        }

        int incidents = transitions.Count(item => item.ToState == "Firing");
        int suppressed = notifications.Count(item => item.Status == "Suppressed");
        double noiseRatio = notifications.Length == 0
            ? 0
            : Math.Round(suppressed * 100d / notifications.Length, 1);

        var timelineMinutes = evaluations
            .Select(sample => Minute(sample.Timestamp))
            .Concat(notifications.Select(sample => Minute(sample.Timestamp)))
            .Distinct()
            .Order()
            .ToArray();
        var timeline = timelineMinutes.Select(minute => new AlertingTimelinePoint(
            minute,
            evaluations.Count(item => Minute(item.Timestamp) == minute),
            evaluations.Count(item => Minute(item.Timestamp) == minute && item.State == "Pending"),
            evaluations.Count(item => Minute(item.Timestamp) == minute && item.State == "Firing"),
            notifications.Count(item => Minute(item.Timestamp) == minute && item.Status == "Delivered"),
            notifications.Count(item => Minute(item.Timestamp) == minute && item.Status == "Suppressed")))
            .ToArray();

        var ruleHealth = RuleCatalog.Select(rule =>
        {
            var samples = evaluations.Where(item => item.RuleUid == rule.Uid).ToArray();
            return new AlertRuleAnalytics(
                rule.Uid,
                rule.Title,
                runtime[rule.Uid].State,
                Math.Round(runtime[rule.Uid].Value, 2),
                rule.Threshold,
                rule.Unit,
                samples.Length,
                samples.Count(item => item.Value > rule.Threshold),
                transitions.Count(item => item.RuleUid == rule.Uid),
                notifications.Count(item => item.RuleUid == rule.Uid));
        }).ToArray();

        var channelUsage = NotificationChannels.Select(channel =>
        {
            var channelSamples = notifications.Where(item => item.Channel == channel.Name).ToArray();
            return new NotificationChannelAnalytics(
                channel.Name,
                channel.Type,
                channel.Route,
                channelSamples.Length,
                channelSamples.Count(item => item.Status == "Delivered"),
                channelSamples.Count(item => item.Status == "Suppressed"));
        }).ToArray();

        var recentEvents = transitions
            .Select(item => new AlertingRecentEvent(
                item.Timestamp,
                "Transition",
                item.RuleTitle,
                $"{item.FromState} → {item.ToState}",
                item.Scenario))
            .Concat(notifications.Select(item => new AlertingRecentEvent(
                item.Timestamp,
                "Notification",
                item.RuleTitle,
                $"{item.Channel} · {item.Status} · {item.Reason}",
                item.Scenario)))
            .OrderByDescending(item => item.Timestamp)
            .Take(16)
            .ToArray();

        return new AlertingAnalytics(
            windowMinutes,
            evaluations.Length,
            evaluations.Count(item => item.Value > RuleCatalog.First(rule => rule.Uid == item.RuleUid).Threshold),
            runtime.Values.Count(item => item.State == "Pending"),
            runtime.Values.Count(item => item.State == "Firing"),
            incidents,
            notifications.Length,
            notifications.Count(item => item.Status == "Delivered"),
            suppressed,
            Math.Min(100, noiseRatio),
            timeline,
            ruleHealth,
            channelUsage,
            recentEvents);
    }

    public IReadOnlyList<GrafanaAlertRuleDefinition> GetRuleDefinitions()
    {
        lock (_sync)
        {
            return RuleCatalog.Select(rule => new GrafanaAlertRuleDefinition(
                rule.Uid,
                rule.Title,
                rule.Group,
                "Prometheus",
                rule.Query,
                $"Above {rule.Threshold:g} {rule.Unit}",
                rule.For,
                "NoData",
                "Error",
                rule.Severity,
                _runtime[rule.Uid].State,
                "Provisioned"))
                .ToArray();
        }
    }

    public static IReadOnlyList<AlertNotificationChannel> GetNotificationChannels() => NotificationChannels;

    public static IReadOnlyList<AlertFatiguePractice> GetFatiguePractices() => FatiguePractices;

    public static string NormalizeScenario(string? scenario) =>
        SupportedScenarios.Contains(scenario, StringComparer.OrdinalIgnoreCase)
            ? scenario!.ToLowerInvariant()
            : "healthy";

    public void RecordWebhookNotification(string payloadSummary)
    {
        var timestamp = DateTimeOffset.UtcNow;
        var sample = new AlertNotificationSample(
            timestamp,
            "grafana-webhook",
            "Grafana-managed notification",
            "Operations chat",
            "Delivered",
            string.IsNullOrWhiteSpace(payloadSummary) ? "Grafana webhook" : payloadSummary,
            "grafana");
        AddNotification(sample);
        _notifications.Add(1, Tags(sample.RuleUid, "grafana", ("channel", "operations-webhook"), ("status", "delivered")));
    }

    private void RecordEvaluation(
        AlertRuleCatalogItem rule,
        double value,
        string state,
        string scenario,
        DateTimeOffset timestamp)
    {
        AddEvaluation(new AlertEvaluationSample(timestamp, rule.Uid, rule.Title, value, state, scenario));
        _evaluations.Add(1, Tags(rule.Uid, scenario, ("state", state.ToLowerInvariant())));
    }

    private void RecordTransition(
        AlertRuleCatalogItem rule,
        string fromState,
        string toState,
        string scenario,
        DateTimeOffset timestamp)
    {
        AddTransition(new AlertTransitionSample(timestamp, rule.Uid, rule.Title, fromState, toState, scenario));
        _transitions.Add(1, Tags(
            rule.Uid,
            scenario,
            ("from_state", fromState.ToLowerInvariant()),
            ("to_state", toState.ToLowerInvariant())));
    }

    private void RouteTransition(
        AlertRuleCatalogItem rule,
        string fromState,
        string toState,
        string scenario,
        DateTimeOffset timestamp,
        Random random)
    {
        if (toState == "Firing")
        {
            RouteNotification(rule, "New incident", scenario, timestamp, random, forceSuppression: false);
        }
        else if (fromState == "Firing")
        {
            RouteNotification(rule, "Resolved", scenario, timestamp, random, forceSuppression: false);
        }
    }

    private void RouteNotification(
        AlertRuleCatalogItem rule,
        string reason,
        string scenario,
        DateTimeOffset timestamp,
        Random random,
        bool forceSuppression)
    {
        var channel = reason == "Resolved"
            ? NotificationChannels[2]
            : rule.Severity == "critical" ? NotificationChannels[0] : NotificationChannels[1];
        bool suppressed = forceSuppression || (scenario == "alert-fatigue" && random.NextDouble() < 0.45);
        string status = suppressed ? "Suppressed" : "Delivered";
        string deliveryReason = suppressed ? "Grouped by 5m cooldown" : reason;
        var sample = new AlertNotificationSample(
            timestamp,
            rule.Uid,
            rule.Title,
            channel.Name,
            status,
            deliveryReason,
            scenario);
        AddNotification(sample);

        _notifications.Add(1, Tags(
            rule.Uid,
            scenario,
            ("channel", Slug(channel.Name)),
            ("status", status.ToLowerInvariant())));
        if (suppressed)
        {
            _suppressedNotifications.Add(1, Tags(
                rule.Uid,
                scenario,
                ("reason", "cooldown")));
        }
    }

    private IEnumerable<Measurement<double>> ObserveSignalValues()
    {
        lock (_sync)
        {
            return RuleCatalog.Select(rule => new Measurement<double>(
                _runtime[rule.Uid].Value,
                new KeyValuePair<string, object?>("rule", rule.Uid),
                new KeyValuePair<string, object?>("severity", rule.Severity),
                new KeyValuePair<string, object?>("unit", rule.Unit)))
                .ToArray();
        }
    }

    private IEnumerable<Measurement<int>> ObserveActiveInstances()
    {
        lock (_sync)
        {
            return RuleCatalog.Select(rule => new Measurement<int>(
                _runtime[rule.Uid].State == "Normal" ? 0 : 1,
                new KeyValuePair<string, object?>("rule", rule.Uid),
                new KeyValuePair<string, object?>("state", _runtime[rule.Uid].State.ToLowerInvariant()),
                new KeyValuePair<string, object?>("severity", rule.Severity)))
                .ToArray();
        }
    }

    private static string StateFor(string scenario, double progress, int evaluation) => scenario switch
    {
        "pending" => progress < 0.18 ? "Normal" : "Pending",
        "firing" => progress < 0.15 ? "Normal" : progress < 0.38 ? "Pending" : "Firing",
        "alert-fatigue" => (evaluation % 8) switch
        {
            0 or 1 => "Normal",
            2 or 3 => "Pending",
            4 or 5 or 6 => "Firing",
            _ => "Normal"
        },
        _ => evaluation % 13 == 0 && evaluation > 0 ? "Pending" : "Normal"
    };

    private static double ValueFor(
        AlertRuleCatalogItem rule,
        string state,
        string scenario,
        Random random)
    {
        double jitter = 0.92 + (random.NextDouble() * 0.16);
        double multiplier = state switch
        {
            "Firing" => scenario == "alert-fatigue" ? 1.45 : 1.25,
            "Pending" => 1.1,
            _ => 0.55
        };
        return Math.Round(rule.Threshold * multiplier * jitter, 2);
    }

    private static DateTimeOffset Minute(DateTimeOffset value) => new(
        value.Year,
        value.Month,
        value.Day,
        value.Hour,
        value.Minute,
        0,
        TimeSpan.Zero);

    private static TagList Tags(
        string ruleUid,
        string scenario,
        params (string Key, string Value)[] extras)
    {
        var tags = new TagList
        {
            { "rule", ruleUid },
            { "scenario", scenario }
        };
        foreach (var extra in extras)
        {
            tags.Add(extra.Key, extra.Value);
        }
        return tags;
    }

    private static string Slug(string value) => value.ToLowerInvariant().Replace(' ', '-');

    private void AddEvaluation(AlertEvaluationSample sample) =>
        AddBounded(_evaluationSamples, sample, ref _evaluationSampleCount);

    private void AddTransition(AlertTransitionSample sample) =>
        AddBounded(_transitionSamples, sample, ref _transitionSampleCount);

    private void AddNotification(AlertNotificationSample sample) =>
        AddBounded(_notificationSamples, sample, ref _notificationSampleCount);

    private static void AddBounded<T>(ConcurrentQueue<T> queue, T sample, ref int count)
    {
        queue.Enqueue(sample);
        int current = Interlocked.Increment(ref count);
        while (current > MaximumSamples && queue.TryDequeue(out _))
        {
            current = Interlocked.Decrement(ref count);
        }
    }

    private static readonly IReadOnlyList<AlertRuleCatalogItem> RuleCatalog =
    [
        new(
            "checkout-error-rate",
            "Checkout error rate",
            "Fundamental alerting",
            "alerting_demo_signal_value{rule=\"checkout-error-rate\"}",
            10,
            "%",
            "2m",
            "critical"),
        new(
            "api-p95-latency",
            "API p95 latency",
            "Fundamental alerting",
            "alerting_demo_signal_value{rule=\"api-p95-latency\"}",
            750,
            "ms",
            "1m",
            "warning"),
        new(
            "worker-queue-depth",
            "Worker queue depth",
            "Fundamental alerting",
            "alerting_demo_signal_value{rule=\"worker-queue-depth\"}",
            80,
            "jobs",
            "3m",
            "warning")
    ];

    private static readonly IReadOnlyList<AlertNotificationChannel> NotificationChannels =
    [
        new("Primary on-call", "PagerDuty", "severity = critical", "Immediate", true),
        new("Operations chat", "Webhook", "severity = warning", "Grouped for 5m", true),
        new("Incident archive", "Email", "resolved alerts", "Recovery only", true)
    ];

    private static readonly IReadOnlyList<AlertFatiguePractice> FatiguePractices =
    [
        new("Actionable thresholds", "Alert on user impact or exhausted capacity, not every anomaly."),
        new("Pending duration", "Require a sustained breach so transient spikes do not page responders."),
        new("Grouping and cooldowns", "Group related instances and suppress duplicate reminders for five minutes."),
        new("Severity routing", "Page critical incidents; send warning alerts to an asynchronous channel."),
        new("Ownership and runbooks", "Every notification identifies a team, context, and a first response."),
        new("Review noise ratio", "Tune or retire rules that create notifications without distinct incidents.")
    ];
}

internal sealed record AlertRuleCatalogItem(
    string Uid,
    string Title,
    string Group,
    string Query,
    double Threshold,
    string Unit,
    string For,
    string Severity);

internal sealed record AlertRuleRuntime(double Value, string State);
internal sealed record AlertEvaluationSample(DateTimeOffset Timestamp, string RuleUid, string RuleTitle, double Value, string State, string Scenario);
internal sealed record AlertTransitionSample(DateTimeOffset Timestamp, string RuleUid, string RuleTitle, string FromState, string ToState, string Scenario);
internal sealed record AlertNotificationSample(DateTimeOffset Timestamp, string RuleUid, string RuleTitle, string Channel, string Status, string Reason, string Scenario);

public sealed record AlertingSeedResult(int SeededEvaluations, int Run, string Scenario, AlertingAnalytics Analytics);
public sealed record AlertingAnalytics(
    int WindowMinutes,
    int EvaluationCount,
    int ThresholdBreaches,
    int PendingRules,
    int FiringRules,
    int IncidentCount,
    int NotificationAttempts,
    int DeliveredNotifications,
    int SuppressedNotifications,
    double NoiseRatioPercent,
    IReadOnlyList<AlertingTimelinePoint> Timeline,
    IReadOnlyList<AlertRuleAnalytics> Rules,
    IReadOnlyList<NotificationChannelAnalytics> Channels,
    IReadOnlyList<AlertingRecentEvent> RecentEvents);
public sealed record AlertingTimelinePoint(DateTimeOffset Timestamp, int Evaluations, int Pending, int Firing, int Delivered, int Suppressed);
public sealed record AlertRuleAnalytics(string Uid, string Title, string State, double CurrentValue, double Threshold, string Unit, int Evaluations, int Breaches, int Transitions, int Notifications);
public sealed record NotificationChannelAnalytics(string Name, string Type, string Route, int Attempts, int Delivered, int Suppressed);
public sealed record AlertingRecentEvent(DateTimeOffset Timestamp, string Type, string Rule, string Detail, string Scenario);
public sealed record AlertNotificationChannel(string Name, string Type, string Route, string Cadence, bool Provisioned);
public sealed record AlertFatiguePractice(string Title, string Description);
