using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
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
        var hasAspireOtlpEndpoint =
            !string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);
        var hasLokiOtlpEndpoint = Uri.TryCreate(
            builder.Configuration["LOKI_OTLP_ENDPOINT"],
            UriKind.Absolute,
            out var lokiOtlpEndpoint);
        var hasTempoOtlpEndpoint = Uri.TryCreate(
            builder.Configuration["TEMPO_OTLP_ENDPOINT"],
            UriKind.Absolute,
            out var tempoOtlpEndpoint);

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

            if (hasLokiOtlpEndpoint && lokiOtlpEndpoint is not null)
            {
                logging.AddOtlpExporter(exporter =>
                {
                    exporter.Endpoint = lokiOtlpEndpoint;
                    exporter.Protocol = OtlpExportProtocol.HttpProtobuf;
                });
            }
            else if (hasAspireOtlpEndpoint)
            {
                logging.AddOtlpExporter();
            }
        });

        builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(serviceName)
                .AddAttributes(
                [
                    new KeyValuePair<string, object>(
                        "deployment.environment.name",
                        builder.Environment.EnvironmentName)
                ]))
            .WithMetrics(metrics =>
            {
                metrics.AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddMeter(serviceName)
                    .AddView(
                        "order_processing_duration_ms",
                        new ExplicitBucketHistogramConfiguration
                        {
                            Boundaries = [50, 100, 200, 500, 1_000, 2_000]
                        })
                    .AddPrometheusExporter();

                if (hasAspireOtlpEndpoint)
                {
                    metrics.AddOtlpExporter();
                }
            })
            .WithTracing(tracing =>
            {
                tracing.AddSource(serviceName)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();

                if (hasAspireOtlpEndpoint)
                {
                    tracing.AddOtlpExporter();
                }

                if (hasTempoOtlpEndpoint && tempoOtlpEndpoint is not null)
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
