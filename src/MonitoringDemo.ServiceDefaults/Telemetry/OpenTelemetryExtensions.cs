using System.Diagnostics;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MonitoringDemo.ServiceDefaults.Telemetry;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Microsoft.Extensions.Hosting;

public static class OpenTelemetryExtensions
{
    public static IHostApplicationBuilder ConfigureOpenTelemetry(this IHostApplicationBuilder builder)
    {
        Activity.DefaultIdFormat = ActivityIdFormat.W3C;
        Activity.ForceDefaultIdFormat = true;

        string serviceName = builder.Environment.ApplicationName;
        var endpoints = TelemetryExporterEndpoints.FromConfiguration(builder.Configuration);

        builder.ConfigureOpenTelemetryLogging(endpoints);
        builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => ConfigureResource(builder, resource, serviceName))
            .WithMetrics(metrics => ConfigureMetrics(metrics, serviceName, endpoints))
            .WithTracing(tracing => ConfigureTracing(tracing, serviceName, endpoints));

        return builder;
    }

    private static void ConfigureOpenTelemetryLogging(
        this IHostApplicationBuilder builder,
        TelemetryExporterEndpoints endpoints)
    {
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

            if (endpoints.Collector is not null)
            {
                logging.AddOtlpExporter(exporter =>
                {
                    exporter.Endpoint = endpoints.Collector;
                    exporter.Protocol = OtlpExportProtocol.Grpc;
                });
            }
            else if (endpoints.Loki is not null)
            {
                logging.AddOtlpExporter(exporter =>
                {
                    exporter.Endpoint = endpoints.Loki;
                    exporter.Protocol = OtlpExportProtocol.HttpProtobuf;
                });
            }

            if (endpoints.HasSignalLogs || (endpoints.Loki is null && endpoints.HasStandardLogs))
            {
                logging.AddOtlpExporter();
            }
        });
    }

    private static void ConfigureResource(
        IHostApplicationBuilder builder,
        ResourceBuilder resource,
        string serviceName)
    {
        string? serviceVersion = Assembly.GetEntryAssembly()?.GetName().Version?.ToString();
        string serviceInstanceId = $"{Environment.MachineName}-{Environment.ProcessId}";

        resource
            .AddService(serviceName, serviceVersion: serviceVersion, serviceInstanceId: serviceInstanceId)
            .AddAttributes(
            [
                new KeyValuePair<string, object>(
                    "deployment.environment.name",
                    builder.Environment.EnvironmentName)
            ]);
    }

    private static void ConfigureMetrics(
        MeterProviderBuilder metrics,
        string serviceName,
        TelemetryExporterEndpoints endpoints)
    {
        metrics.SetExemplarFilter(ExemplarFilterType.TraceBased)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddMeter(serviceName)
            .AddView(
                "order_processing_duration_ms",
                Histogram([50, 100, 200, 500, 1_000, 2_000]))
            .AddView(
                "methodology_service_request_duration_ms",
                Histogram([50, 100, 200, 500, 1_000, 2_000, 5_000]))
            .AddView(instrument =>
                instrument.Name.EndsWith("_duration_ms", StringComparison.Ordinal) &&
                instrument.Name.StartsWith("application_", StringComparison.Ordinal)
                    ? Histogram([1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_500])
                    : null)
            .AddPrometheusExporter();

        if (endpoints.HasStandardMetrics)
        {
            metrics.AddOtlpExporter();
        }

        if (endpoints.Collector is not null)
        {
            metrics.AddOtlpExporter("collector", exporter =>
            {
                exporter.Endpoint = endpoints.Collector;
                exporter.Protocol = OtlpExportProtocol.Grpc;
            });
        }
    }

    private static void ConfigureTracing(
        TracerProviderBuilder tracing,
        string serviceName,
        TelemetryExporterEndpoints endpoints)
    {
        tracing.AddSource(serviceName)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation();

        if (endpoints.HasStandardTraces)
        {
            tracing.AddOtlpExporter();
        }

        if (endpoints.Collector is not null)
        {
            tracing.AddOtlpExporter("collector", exporter =>
            {
                exporter.Endpoint = endpoints.Collector;
                exporter.Protocol = OtlpExportProtocol.Grpc;
            });
        }
        else if (endpoints.Tempo is not null)
        {
            tracing.AddOtlpExporter("tempo", exporter =>
            {
                exporter.Endpoint = endpoints.Tempo;
                exporter.Protocol = OtlpExportProtocol.HttpProtobuf;
            });
        }
    }

    private static ExplicitBucketHistogramConfiguration Histogram(double[] boundaries) =>
        new() { Boundaries = boundaries };
}
