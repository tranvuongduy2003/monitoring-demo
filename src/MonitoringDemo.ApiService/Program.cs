using MonitoringDemo.ApiService.Hosting;
using MonitoringDemo.ServiceDefaults;

EnvironmentFile.LoadForProject("MonitoringDemo.ApiService");
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddApiServices();

var app = builder.Build();
app.UseApi();
await app.InitializeApiAsync();

app.Run();
