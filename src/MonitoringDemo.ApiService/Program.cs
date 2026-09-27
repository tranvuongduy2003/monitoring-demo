using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Endpoints;
using MonitoringDemo.ApiService.Middleware;
using MonitoringDemo.ApiService.Observability;
using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;
using MonitoringDemo.ServiceDefaults;

EnvironmentFile.LoadForProject("MonitoringDemo.ApiService");
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<AppDbContext>("monitoringdb");

builder.Services.AddSingleton<AppMetrics>();
builder.Services.AddSingleton<AppActivitySource>();
builder.Services.AddSingleton<MetricsDemoSeeder>();
builder.Services.AddSingleton<TracingDemoSeeder>();
builder.Services.AddSingleton<OpenTelemetryLabService>();
builder.Services.AddSingleton<OtlpLabService>();
builder.Services.AddHostedService<BackgroundOrderSimulator>();
builder.Services.AddHostedService<LoggingSeedService>();
builder.Services.AddHostedService<MetricsSeedService>();
builder.Services.AddHostedService<TracingSeedService>();
builder.Services.AddHostedService<OpenTelemetrySeedService>();
builder.Services.AddHostedService<OtlpSeedService>();
builder.Services.AddHttpClient<LokiQueryService>();
builder.Services.AddHttpClient<PrometheusQueryService>();
builder.Services.AddHttpClient<TempoQueryService>();

builder.Services.AddCors(options =>
{
    string[] allowedOrigins = builder.Configuration
        .GetValue<string>("Cors:AllowedOrigins")?
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        ?? ["*"];

    options.AddPolicy("Frontend", policy =>
    {
        if (allowedOrigins.Contains("*"))
        {
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.WithOrigins(allowedOrigins);
        }

        policy.AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("Frontend");
app.UseMiddleware<LogContextMiddleware>();
app.MapDefaultEndpoints();

app.MapProductEndpoints();
app.MapOrderEndpoints();
app.MapLoggingEndpoints();
app.MapMetricsEndpoints();
app.MapPrometheusEndpoints();
app.MapTracingEndpoints();
app.MapOpenTelemetryEndpoints();
app.MapOtlpEndpoints();
app.MapDemoEndpoints();

try 
{
    await SeedData.InitializeAsync(app.Services);
}
catch (Exception ex)
{
    app.Logger.DatabaseSeedFailed(ex);
}

app.Run();
