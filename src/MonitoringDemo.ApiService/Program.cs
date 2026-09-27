using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Endpoints;
using MonitoringDemo.ApiService.Middleware;
using MonitoringDemo.ApiService.Observability;
using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<AppDbContext>("monitoringdb");

builder.Services.AddSingleton<AppMetrics>();
builder.Services.AddSingleton<AppActivitySource>();
builder.Services.AddSingleton<MetricsDemoSeeder>();
builder.Services.AddHostedService<BackgroundOrderSimulator>();
builder.Services.AddHostedService<LoggingSeedService>();
builder.Services.AddHostedService<MetricsSeedService>();
builder.Services.AddHttpClient<LokiQueryService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseMiddleware<LogContextMiddleware>();
app.MapDefaultEndpoints();

app.MapProductEndpoints();
app.MapOrderEndpoints();
app.MapLoggingEndpoints();
app.MapMetricsEndpoints();

try 
{
    await SeedData.InitializeAsync(app.Services);
}
catch (Exception ex)
{
    app.Logger.DatabaseSeedFailed(ex);
}

app.Run();
