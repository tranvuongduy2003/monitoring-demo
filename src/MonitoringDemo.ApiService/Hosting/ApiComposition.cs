using MonitoringDemo.ApiService.Features.ApplicationMonitoring;
using MonitoringDemo.ApiService.Features.Metrics;
using MonitoringDemo.ApiService.Features.MonitoringMethodologies;
using MonitoringDemo.ApiService.Features.Scenarios;
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
            .AddTelemetryFeatures()
            .AddScenarioGeneration()
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

    private static IServiceCollection AddScenarioGeneration(this IServiceCollection services) => services
        .AddSingleton<MetricsDemoSeeder>()
        .AddSingleton<MonitoringMethodologySeeder>()
        .AddSingleton<ApplicationMonitoringSeeder>()
        .AddSingleton<TracingDemoSeeder>()
        .AddSingleton<LearningTelemetry>()
        .AddScoped<ScenarioService>();

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
        routes.MapScenarioEndpoints();
    }
}
