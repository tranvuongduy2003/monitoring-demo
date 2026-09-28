using MonitoringDemo.ApiService.Features.ApplicationMonitoring;
using MonitoringDemo.ApiService.Features.Collector;
using MonitoringDemo.ApiService.Features.Demo;
using MonitoringDemo.ApiService.Features.Grafana;
using MonitoringDemo.ApiService.Features.Logging;
using MonitoringDemo.ApiService.Features.Metrics;
using MonitoringDemo.ApiService.Features.MonitoringMethodologies;
using MonitoringDemo.ApiService.Features.OpenTelemetry;
using MonitoringDemo.ApiService.Features.Orders;
using MonitoringDemo.ApiService.Features.Otlp;
using MonitoringDemo.ApiService.Features.Products;
using MonitoringDemo.ApiService.Features.Prometheus;
using MonitoringDemo.ApiService.Features.Tracing;
using MonitoringDemo.ApiService.Infrastructure.Observability;
using MonitoringDemo.ApiService.Infrastructure.Persistence;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Hosting;

public static class ApiComposition
{
    public const string FrontendCorsPolicy = "Frontend";

    public static WebApplicationBuilder AddApiServices(this WebApplicationBuilder builder)
    {
        builder.AddNpgsqlDbContext<AppDbContext>("monitoringdb");

        builder.Services
            .AddSingleton(TimeProvider.System)
            .AddScoped<IProductService, ProductService>()
            .AddScoped<IOrderService, OrderService>()
            .AddTelemetryFeatures()
            .AddMonitoringLabs()
            .AddBackgroundWorkers()
            .AddBackendClients()
            .AddFrontendCors(builder.Configuration);

        return builder;
    }

    public static WebApplication UseApi(this WebApplication app)
    {
        app.UseCors(FrontendCorsPolicy);
        app.UseMiddleware<LogContextMiddleware>();
        app.MapDefaultEndpoints();
        app.MapApiEndpoints();
        return app;
    }

    public static async Task InitializeApiAsync(this WebApplication app)
    {
        try
        {
            await SeedData.InitializeAsync(app.Services, app.Lifetime.ApplicationStopping);
        }
        catch (OperationCanceledException) when (app.Lifetime.ApplicationStopping.IsCancellationRequested)
        {
            // Normal shutdown while startup initialization is still in progress.
        }
        catch (Exception exception)
        {
            app.Logger.DatabaseSeedFailed(exception);
        }
    }

    private static IServiceCollection AddTelemetryFeatures(this IServiceCollection services) => services
        .AddSingleton<AppActivitySource>()
        .AddSingleton<AppMetrics>()
        .AddSingleton<MonitoringMethodologyMetrics>()
        .AddSingleton<ApplicationMonitoringMetrics>();

    private static IServiceCollection AddMonitoringLabs(this IServiceCollection services) => services
        .AddSingleton<MetricsDemoSeeder>()
        .AddSingleton<MonitoringMethodologySeeder>()
        .AddSingleton<ApplicationMonitoringSeeder>()
        .AddSingleton<TracingDemoSeeder>()
        .AddSingleton<OpenTelemetryLabService>()
        .AddSingleton<OtlpLabService>()
        .AddSingleton<CollectorLabService>()
        .AddSingleton<GrafanaLabService>()
        .AddSingleton<FundamentalAlertingService>();

    private static IServiceCollection AddBackgroundWorkers(this IServiceCollection services) => services
        .AddHostedService<BackgroundOrderSimulator>()
        .AddHostedService<LoggingSeedWorker>()
        .AddHostedService<MetricsSeedWorker>()
        .AddHostedService<MonitoringMethodologySeedWorker>()
        .AddHostedService<ApplicationMonitoringSeedWorker>()
        .AddHostedService<TracingSeedWorker>()
        .AddHostedService<OpenTelemetrySeedWorker>()
        .AddHostedService<OtlpSeedWorker>()
        .AddHostedService<CollectorSeedWorker>()
        .AddHostedService<GrafanaSeedWorker>()
        .AddHostedService<FundamentalAlertingSeedWorker>();

    private static IServiceCollection AddBackendClients(this IServiceCollection services)
    {
        services.AddOptions<LokiOptions>()
            .BindConfiguration(LokiOptions.SectionName)
            .Validate(options => IsAbsoluteUrl(options.BaseUrl), "Loki:BaseUrl must be an absolute URL.")
            .ValidateOnStart();
        services.AddOptions<PrometheusOptions>()
            .BindConfiguration(PrometheusOptions.SectionName)
            .Validate(options => IsAbsoluteUrl(options.BaseUrl), "Prometheus:BaseUrl must be an absolute URL.")
            .ValidateOnStart();
        services.AddOptions<TempoOptions>()
            .BindConfiguration(TempoOptions.SectionName)
            .Validate(options => IsAbsoluteUrl(options.BaseUrl), "Tempo:BaseUrl must be an absolute URL.")
            .ValidateOnStart();

        services.AddHttpClient<ILokiQueryService, LokiQueryService>();
        services.AddHttpClient<IPrometheusQueryService, PrometheusQueryService>();
        services.AddHttpClient<ITempoQueryService, TempoQueryService>();
        return services;
    }

    private static bool IsAbsoluteUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

    private static IServiceCollection AddFrontendCors(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var originsSection = configuration.GetSection("Cors:AllowedOrigins");
        string[] allowedOrigins = originsSection.GetChildren().Any()
            ? originsSection.Get<string[]>() ?? ["*"]
            : originsSection.Value?
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                ?? ["*"];

        services.AddCors(options => options.AddPolicy(FrontendCorsPolicy, policy =>
        {
            if (allowedOrigins.Contains("*", StringComparer.Ordinal))
            {
                policy.AllowAnyOrigin();
            }
            else
            {
                policy.WithOrigins(allowedOrigins);
            }

            policy.AllowAnyMethod().AllowAnyHeader();
        }));

        return services;
    }

    private static void MapApiEndpoints(this IEndpointRouteBuilder routes)
    {
        routes.MapProductEndpoints();
        routes.MapOrderEndpoints();
        routes.MapLoggingEndpoints();
        routes.MapMetricsEndpoints();
        routes.MapMonitoringMethodologyEndpoints();
        routes.MapApplicationMonitoringEndpoints();
        routes.MapPrometheusEndpoints();
        routes.MapTracingEndpoints();
        routes.MapOpenTelemetryEndpoints();
        routes.MapOtlpEndpoints();
        routes.MapCollectorEndpoints();
        routes.MapGrafanaEndpoints();
        routes.MapDemoEndpoints();
    }
}
