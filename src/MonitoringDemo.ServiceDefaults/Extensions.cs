using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Reflection;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Microsoft.Extensions.Hosting;

public static class Extensions
{
    public static IHostApplicationBuilder AddServiceDefaults(this IHostApplicationBuilder builder)
    {
        builder.ConfigureOpenTelemetry();
        builder.AddDefaultHealthChecks();
        builder.Services.AddServiceDiscovery();
        builder.Services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
        });

        return builder;
    }

    public static IHostApplicationBuilder ConfigureOpenTelemetry(this IHostApplicationBuilder builder)
    {
        var serviceName = builder.Environment.ApplicationName;
        var serviceVersion = Assembly.GetEntryAssembly()?.GetName().Version?.ToString();
        var serviceInstanceId = $"{Environment.MachineName}-{Environment.ProcessId}";
        Activity.DefaultIdFormat = ActivityIdFormat.W3C;
        Activity.ForceDefaultIdFormat = true;
        var hasAspireOtlpEndpoint =
            !string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);
        var hasSignalOtlpLogsEndpoint =
            !string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"]);
        var hasStandardOtlpLogsEndpoint = hasAspireOtlpEndpoint || hasSignalOtlpLogsEndpoint;
        var hasStandardOtlpMetricsEndpoint = hasAspireOtlpEndpoint ||
            !string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"]);
        var hasStandardOtlpTracesEndpoint = hasAspireOtlpEndpoint ||
            !string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"]);
        var hasLokiOtlpEndpoint = Uri.TryCreate(
            builder.Configuration["LOKI_OTLP_ENDPOINT"],
            UriKind.Absolute,
            out var lokiOtlpEndpoint);
        var hasTempoOtlpEndpoint = Uri.TryCreate(
            builder.Configuration["TEMPO_OTLP_ENDPOINT"],
            UriKind.Absolute,
            out var tempoOtlpEndpoint);
        var hasCollectorOtlpEndpoint = Uri.TryCreate(
            builder.Configuration["COLLECTOR_OTLP_ENDPOINT"],
            UriKind.Absolute,
            out var collectorOtlpEndpoint);

        builder.Logging.Configure(options =>
        {
            options.ActivityTrackingOptions =
                ActivityTrackingOptions.TraceId |
                ActivityTrackingOptions.SpanId |
                ActivityTrackingOptions.ParentId |
                ActivityTrackingOptions.Baggage |
                ActivityTrackingOptions.Tags;
        });

        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;

            if (hasCollectorOtlpEndpoint && collectorOtlpEndpoint is not null)
            {
                logging.AddOtlpExporter(exporter =>
                {
                    exporter.Endpoint = collectorOtlpEndpoint;
                    exporter.Protocol = OtlpExportProtocol.Grpc;
                });
            }
            else if (hasLokiOtlpEndpoint && lokiOtlpEndpoint is not null)
            {
                logging.AddOtlpExporter(exporter =>
                {
                    exporter.Endpoint = lokiOtlpEndpoint;
                    exporter.Protocol = OtlpExportProtocol.HttpProtobuf;
                });
            }
            if (hasSignalOtlpLogsEndpoint || (!hasLokiOtlpEndpoint && hasStandardOtlpLogsEndpoint))
            {
                logging.AddOtlpExporter();
            }
        });

        builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(
                    serviceName,
                    serviceVersion: serviceVersion,
                    serviceInstanceId: serviceInstanceId)
                .AddAttributes(
                [
                    new KeyValuePair<string, object>(
                        "deployment.environment.name",
                        builder.Environment.EnvironmentName)
                ]))
            .WithMetrics(metrics =>
            {
                metrics.SetExemplarFilter(ExemplarFilterType.TraceBased)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddMeter(serviceName)
                    .AddView(
                        "order_processing_duration_ms",
                        new ExplicitBucketHistogramConfiguration
                        {
                            Boundaries = [50, 100, 200, 500, 1_000, 2_000]
                        })
                    .AddView(
                        "methodology_service_request_duration_ms",
                        new ExplicitBucketHistogramConfiguration
                        {
                            Boundaries = [50, 100, 200, 500, 1_000, 2_000, 5_000]
                        })
                    .AddPrometheusExporter();

                if (hasStandardOtlpMetricsEndpoint)
                {
                    metrics.AddOtlpExporter();
                }

                if (hasCollectorOtlpEndpoint && collectorOtlpEndpoint is not null)
                {
                    metrics.AddOtlpExporter("collector", exporter =>
                    {
                        exporter.Endpoint = collectorOtlpEndpoint;
                        exporter.Protocol = OtlpExportProtocol.Grpc;
                    });
                }
            })
            .WithTracing(tracing =>
            {
                tracing.AddSource(serviceName)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();

                if (hasStandardOtlpTracesEndpoint)
                {
                    tracing.AddOtlpExporter();
                }

                if (hasCollectorOtlpEndpoint && collectorOtlpEndpoint is not null)
                {
                    tracing.AddOtlpExporter("collector", exporter =>
                    {
                        exporter.Endpoint = collectorOtlpEndpoint;
                        exporter.Protocol = OtlpExportProtocol.Grpc;
                    });
                }
                else if (hasTempoOtlpEndpoint && tempoOtlpEndpoint is not null)
                {
                    tracing.AddOtlpExporter("tempo", exporter =>
                    {
                        exporter.Endpoint = tempoOtlpEndpoint;
                        exporter.Protocol = OtlpExportProtocol.HttpProtobuf;
                    });
                }
            });

        return builder;
    }

    public static IHostApplicationBuilder AddDefaultHealthChecks(this IHostApplicationBuilder builder)
    {
        builder.Services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);

        return builder;
    }

    public static WebApplication MapDefaultEndpoints(this WebApplication app)
    {
        app.MapPrometheusScrapingEndpoint();
        app.MapHealthChecks("/health");
        app.MapHealthChecks("/alive", new HealthCheckOptions
        {
            Predicate = r => r.Tags.Contains("live")
        });

        return app;
    }
}
