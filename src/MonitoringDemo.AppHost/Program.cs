using MonitoringDemo.AppHost.Configuration;
using MonitoringDemo.AppHost.Orchestration;
using MonitoringDemo.ServiceDefaults;

EnvironmentFile.LoadForProject("MonitoringDemo.AppHost");

var builder = DistributedApplication.CreateBuilder(args);
var settings = AppHostSettings.FromConfiguration(builder.Configuration);

builder.AddMonitoringDemo(settings);
builder.Build().Run();
