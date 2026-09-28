using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Collector;

public sealed class CollectorLabService
{
    private const int MaximumSamples = 5_000;
    private const int BatchSize = 512;
    private const int MemorySoftLimitMib = 192;
    private const int MemoryHardLimitMib = 256;
    private static readonly string[] Signals = ["Traces", "Metrics", "Logs"];
    private static readonly string[] Protocols = ["OTLP/gRPC", "OTLP/HTTP"];
    private static readonly string[] Operations = ["checkout", "catalog", "payment", "fulfillment"];

    private readonly AppActivitySource _activitySource;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CollectorLabService> _logger;
    private readonly Counter<long> _receivedRecords;
    private readonly Counter<long> _exportedRecords;
    private readonly Counter<long> _refusedRecords;
    private readonly Histogram<double> _pipelineDuration;
    private readonly ConcurrentQueue<CollectorSample> _samples = new();
    private int _sampleCount;
    private int _seedRun;

    public CollectorLabService(
        AppActivitySource activitySource,
        IMeterFactory meterFactory,
        IConfiguration configuration,
        ILogger<CollectorLabService> logger)
    {
        _activitySource = activitySource;
        _configuration = configuration;
        _logger = logger;
        var meter = meterFactory.Create(TelemetryConstants.MeterName);
        _receivedRecords = meter.CreateCounter<long>("collector_demo_received_records_total", "{record}", "Records sent to the Collector learning pipeline");
        _exportedRecords = meter.CreateCounter<long>("collector_demo_exported_records_total", "{record}", "Records exported by the Collector learning pipeline");
        _refusedRecords = meter.CreateCounter<long>("collector_demo_refused_records_total", "{record}", "Records temporarily refused by the memory limiter model");
        _pipelineDuration = meter.CreateHistogram<double>("collector_demo_pipeline_duration_ms", "ms", "Modeled Collector pipeline duration");
    }

    public CollectorSeedResult Seed(int requestedCount)
    {
        int count = Math.Clamp(requestedCount, 1, 500);
        int run = Interlocked.Increment(ref _seedRun);
        var random = new Random(8888 + (run * 13133));
        var now = DateTimeOffset.UtcNow;

        for (int index = 0; index < count; index++)
        {
            string signal = Signals[(index + run) % Signals.Length];
            string protocol = Protocols[(index + run) % Protocols.Length];
            string operation = Operations[(index + run) % Operations.Length];
            int received = random.Next(80, 801);
            bool dropped = index > 0 && (index + run) % 97 == 0;
            bool softLimited = dropped || (index > 0 && (index + run) % 19 == 0);
            bool hardLimited = index > 0 && (index + run) % 61 == 0;
            int refused = softLimited || hardLimited ? received : 0;
            int droppedRecords = dropped ? Math.Max(1, received / 12) : 0;
            int accepted = received - droppedRecords;
            int exported = accepted;
            int outputBatches = Math.Max(1, (int)Math.Ceiling((double)accepted / BatchSize));
            double averageBatchSize = Math.Round((double)accepted / outputBatches, 1);
            string batchTrigger = accepted >= BatchSize ? "Size" : "Timeout";
            double memoryMib = hardLimited
                ? random.Next(257, 282)
                : softLimited ? random.Next(193, 252) : random.Next(76, 189);
            string memoryState = hardLimited ? "Hard limit" : softLimited ? "Soft limit" : "Normal";
            double duration = Math.Round(random.NextDouble() * 22 + outputBatches * 3 + (softLimited ? 18 : 0), 2);
            string exporter = signal switch
            {
                "Traces" => "Tempo",
                "Metrics" => "Prometheus",
                _ => "Loki"
            };
            var timestamp = now.AddSeconds(-random.Next(0, 30 * 60));

            EmitTelemetry(run, index, signal, protocol, operation, received, exported, refused, outputBatches, duration, memoryState);
            AddSample(new CollectorSample(
                timestamp,
                signal,
                protocol,
                exporter,
                operation,
                received,
                accepted,
                refused,
                refused - droppedRecords,
                droppedRecords,
                exported,
                outputBatches,
                averageBatchSize,
                batchTrigger,
                duration,
                memoryMib,
                memoryState));
        }

        return new CollectorSeedResult(count, run, GetAnalytics(60));
    }

    public CollectorOverview GetOverview(int requestedWindowMinutes)
    {
        int windowMinutes = Math.Clamp(requestedWindowMinutes, 5, 240);
        string? endpoint = _configuration["COLLECTOR_OTLP_ENDPOINT"];
        return new CollectorOverview(
            DateTimeOffset.UtcNow,
            windowMinutes,
            !string.IsNullOrWhiteSpace(endpoint),
            SanitizeEndpoint(endpoint),
            GetAnalytics(windowMinutes),
            Architecture,
            Receivers,
            Processors,
            Exporters,
            Pipelines,
            new CollectorRuntimeSettings(BatchSize, "1s", MemorySoftLimitMib, MemoryHardLimitMib, "1s", "205MiB"));
    }

    private void EmitTelemetry(
        int run,
        int index,
        string signal,
        string protocol,
        string operation,
        int received,
        int exported,
        int refused,
        int batches,
        double duration,
        string memoryState)
    {
        var tags = new TagList
        {
            { "otel.signal", signal.ToLowerInvariant() },
            { "receiver", protocol },
            { "demo.operation", operation },
            { "memory_limiter.state", memoryState.ToLowerInvariant().Replace(' ', '_') }
        };
        _receivedRecords.Add(received, tags);
        _exportedRecords.Add(exported, tags);
        if (refused > 0) _refusedRecords.Add(refused, tags);
        _pipelineDuration.Record(duration, tags);

        if (signal == "Traces")
        {
            using var activity = _activitySource.Source.StartActivity(
                $"Collector pipeline {operation}",
                ActivityKind.Producer,
                default(ActivityContext),
                new ActivityTagsCollection
                {
                    { "demo.collector", true },
                    { "demo.seed.run", run },
                    { "demo.seed.index", index },
                    { "otel.signal", "traces" },
                    { "receiver", protocol },
                    { "processor.batch.count", batches },
                    { "memory_limiter.state", memoryState }
                });
            activity?.AddEvent(new ActivityEvent("collector.pipeline.exported"));
            activity?.SetStatus(memoryState == "Hard limit" ? ActivityStatusCode.Error : ActivityStatusCode.Ok);
        }

        if (refused > 0)
        {
            _logger.LogWarning(
                "Collector memory limiter temporarily refused {RecordCount} {Signal} records from {Protocol}; the receiver retried",
                refused, signal, protocol);
        }
        else if (signal == "Logs")
        {
            _logger.LogInformation(
                "Collector pipeline exported {RecordCount} log records in {BatchCount} batches over {Protocol}",
                exported, batches, protocol);
        }
    }

    private CollectorAnalytics GetAnalytics(int windowMinutes)
    {
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-windowMinutes);
        var samples = _samples.Where(sample => sample.Timestamp >= cutoff).OrderBy(sample => sample.Timestamp).ToArray();
        var durations = samples.Select(sample => sample.DurationMilliseconds).Order().ToArray();
        var batchSizes = samples.Select(sample => sample.AverageBatchSize).Order().ToArray();

        var timeline = samples
            .GroupBy(sample => new DateTimeOffset(sample.Timestamp.Year, sample.Timestamp.Month, sample.Timestamp.Day, sample.Timestamp.Hour, sample.Timestamp.Minute, 0, TimeSpan.Zero))
            .Select(group => new CollectorTimelinePoint(
                group.Key,
                group.Sum(item => item.ReceivedRecords),
                group.Sum(item => item.ExportedRecords),
                group.Sum(item => item.RefusedRecords),
                group.Max(item => item.MemoryMib)))
            .ToArray();

        var signals = samples
            .GroupBy(sample => sample.Signal)
            .OrderBy(group => group.Key)
            .Select(group => new CollectorSignalAnalytics(
                group.Key,
                group.Sum(item => item.ReceivedRecords),
                group.Sum(item => item.ExportedRecords),
                group.Sum(item => item.DroppedRecords),
                group.Sum(item => item.OutputBatches)))
            .ToArray();

        var protocols = samples
            .GroupBy(sample => sample.Protocol)
            .OrderBy(group => group.Key)
            .Select(group => new CollectorProtocolAnalytics(
                group.Key,
                group.Count(),
                group.Sum(item => item.ReceivedRecords),
                group.Sum(item => item.RefusedRecords),
                Math.Round(group.Average(item => item.DurationMilliseconds), 2)))
            .ToArray();

        var batches = samples
            .GroupBy(sample => sample.BatchTrigger)
            .OrderBy(group => group.Key)
            .Select(group => new CollectorBatchAnalytics(
                group.Key,
                group.Sum(item => item.OutputBatches),
                Math.Round(group.Average(item => item.AverageBatchSize), 1)))
            .ToArray();

        var recent = samples
            .OrderByDescending(sample => sample.Timestamp)
            .Take(12)
            .Select(sample => new CollectorRecentRun(
                sample.Timestamp,
                sample.Signal,
                sample.Protocol,
                sample.Exporter,
                sample.ReceivedRecords,
                sample.ExportedRecords,
                sample.OutputBatches,
                sample.BatchTrigger,
                sample.MemoryMib,
                sample.MemoryState))
            .ToArray();

        return new CollectorAnalytics(
            samples.Length,
            samples.Sum(sample => sample.ReceivedRecords),
            samples.Sum(sample => sample.AcceptedRecords),
            samples.Sum(sample => sample.RefusedRecords),
            samples.Sum(sample => sample.RetriedRecords),
            samples.Sum(sample => sample.DroppedRecords),
            samples.Sum(sample => sample.ExportedRecords),
            samples.Sum(sample => sample.OutputBatches),
            batchSizes.Length == 0 ? 0 : Math.Round(batchSizes.Average(), 1),
            Percentile(batchSizes, 0.95),
            durations.Length == 0 ? 0 : Math.Round(durations.Average(), 2),
            Percentile(durations, 0.95),
            samples.Length == 0 ? 0 : samples.Max(sample => sample.MemoryMib),
            samples.Count(sample => sample.MemoryState != "Normal"),
            timeline,
            signals,
            protocols,
            batches,
            recent);
    }

    private void AddSample(CollectorSample sample)
    {
        _samples.Enqueue(sample);
        int count = Interlocked.Increment(ref _sampleCount);
        while (count > MaximumSamples && _samples.TryDequeue(out _)) count = Interlocked.Decrement(ref _sampleCount);
    }

    private static double Percentile(double[] values, double percentile)
    {
        if (values.Length == 0) return 0;
        int index = (int)Math.Ceiling(values.Length * percentile) - 1;
        return Math.Round(values[Math.Clamp(index, 0, values.Length - 1)], 2);
    }

    private static string SanitizeEndpoint(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "Not configured";
        if (!Uri.TryCreate(value, UriKind.Absolute, out var endpoint)) return "Invalid endpoint";
        return new UriBuilder(endpoint) { UserName = string.Empty, Password = string.Empty, Query = string.Empty }.Uri.GetLeftPart(UriPartial.Path).TrimEnd('/');
    }

    private static readonly IReadOnlyList<CollectorComponent> Architecture =
    [
        new("Receive", "Receivers", "Accept telemetry from one or more protocols and translate it into the Collector data model."),
        new("Protect", "Memory limiter", "Apply backpressure before queued data can exhaust the process heap."),
        new("Shape", "Batch processor", "Group records by size or timeout to improve export efficiency."),
        new("Route", "Pipelines", "Connect signal-specific receiver, processor, and exporter chains."),
        new("Send", "Exporters", "Deliver processed telemetry to one or more observability backends.")
    ];

    private static readonly IReadOnlyList<CollectorComponentDetail> Receivers =
    [
        new("otlp/grpc", "OTLP Receiver", "gRPC", "0.0.0.0:4317", "Traces, metrics, logs", "Enabled"),
        new("otlp/http", "OTLP Receiver", "HTTP/protobuf", "0.0.0.0:4318", "Traces, metrics, logs", "Enabled")
    ];

    private static readonly IReadOnlyList<CollectorComponentDetail> Processors =
    [
        new("memory_limiter", "Memory Limiter", "Backpressure", "soft 192 MiB · hard 256 MiB", "Traces, metrics, logs", "First"),
        new("batch", "Batch Processor", "Buffer", "512 records · 1s timeout", "Traces, metrics, logs", "Second")
    ];

    private static readonly IReadOnlyList<CollectorComponentDetail> Exporters =
    [
        new("otlp_http/tempo", "Tempo", "OTLP/HTTP", "/v1/traces", "Traces", "Enabled"),
        new("prometheus", "Prometheus", "Pull endpoint", ":9464/metrics", "Metrics", "Enabled"),
        new("otlp_http/loki", "Loki", "OTLP/HTTP", "/otlp/v1/logs", "Logs", "Enabled"),
        new("debug", "Debug", "Collector log", "basic verbosity", "Traces, metrics, logs", "Enabled")
    ];

    private static readonly IReadOnlyList<CollectorPipeline> Pipelines =
    [
        new("traces", "otlp", ["memory_limiter", "batch"], ["otlp_http/tempo", "debug"]),
        new("metrics", "otlp", ["memory_limiter", "batch"], ["prometheus", "debug"]),
        new("logs", "otlp", ["memory_limiter", "batch"], ["otlp_http/loki", "debug"])
    ];
}

public sealed record CollectorOverview(DateTimeOffset GeneratedAt, int WindowMinutes, bool Configured, string CollectorEndpoint, CollectorAnalytics Analytics, IReadOnlyList<CollectorComponent> Architecture, IReadOnlyList<CollectorComponentDetail> Receivers, IReadOnlyList<CollectorComponentDetail> Processors, IReadOnlyList<CollectorComponentDetail> Exporters, IReadOnlyList<CollectorPipeline> Pipelines, CollectorRuntimeSettings Settings);
public sealed record CollectorSeedResult(int Seeded, int Run, CollectorAnalytics Analytics);
public sealed record CollectorAnalytics(int IngressRequestCount, int ReceivedRecordCount, int AcceptedRecordCount, int RefusedRecordCount, int RetriedRecordCount, int DroppedRecordCount, int ExportedRecordCount, int BatchCount, double AverageBatchSize, double P95BatchSize, double AverageDurationMilliseconds, double P95DurationMilliseconds, double PeakMemoryMib, int MemoryPressureEvents, IReadOnlyList<CollectorTimelinePoint> Timeline, IReadOnlyList<CollectorSignalAnalytics> Signals, IReadOnlyList<CollectorProtocolAnalytics> Protocols, IReadOnlyList<CollectorBatchAnalytics> Batches, IReadOnlyList<CollectorRecentRun> RecentRuns);
public sealed record CollectorTimelinePoint(DateTimeOffset Timestamp, int ReceivedRecords, int ExportedRecords, int RefusedRecords, double MemoryMib);
public sealed record CollectorSignalAnalytics(string Signal, int ReceivedRecords, int ExportedRecords, int DroppedRecords, int BatchCount);
public sealed record CollectorProtocolAnalytics(string Protocol, int RequestCount, int ReceivedRecords, int RefusedRecords, double AverageDurationMilliseconds);
public sealed record CollectorBatchAnalytics(string Trigger, int BatchCount, double AverageBatchSize);
public sealed record CollectorRecentRun(DateTimeOffset Timestamp, string Signal, string Protocol, string Exporter, int ReceivedRecords, int ExportedRecords, int BatchCount, string BatchTrigger, double MemoryMib, string MemoryState);
public sealed record CollectorComponent(string Stage, string Name, string Description);
public sealed record CollectorComponentDetail(string Id, string Name, string Type, string EndpointOrSetting, string Signals, string State);
public sealed record CollectorPipeline(string Signal, string Receiver, IReadOnlyList<string> Processors, IReadOnlyList<string> Exporters);
public sealed record CollectorRuntimeSettings(int SendBatchSize, string BatchTimeout, int MemorySoftLimitMib, int MemoryHardLimitMib, string MemoryCheckInterval, string GoMemoryLimit);

internal sealed record CollectorSample(DateTimeOffset Timestamp, string Signal, string Protocol, string Exporter, string Operation, int ReceivedRecords, int AcceptedRecords, int RefusedRecords, int RetriedRecords, int DroppedRecords, int ExportedRecords, int OutputBatches, double AverageBatchSize, string BatchTrigger, double DurationMilliseconds, double MemoryMib, string MemoryState);
