using MonitoringDemo.ApiService.Data;
using MonitoringDemo.ApiService.Endpoints;
using MonitoringDemo.ApiService.Services;
using MonitoringDemo.ApiService.Telemetry;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<AppDbContext>("monitoringdb");

builder.Services.AddSingleton<AppMetrics>();
builder.Services.AddSingleton<AppActivitySource>();
builder.Services.AddHostedService<BackgroundOrderSimulator>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowAll");
app.MapDefaultEndpoints();

app.MapProductEndpoints();
app.MapOrderEndpoints();

try 
{
    await SeedData.InitializeAsync(app.Services);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "An error occurred while seeding the database.");
}

app.Run();
