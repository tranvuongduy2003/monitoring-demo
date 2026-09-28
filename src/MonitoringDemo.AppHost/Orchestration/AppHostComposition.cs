using Aspire.Hosting.ApplicationModel;
using MonitoringDemo.AppHost.Configuration;

namespace MonitoringDemo.AppHost.Orchestration;

public static class AppHostComposition
{
    public static IDistributedApplicationBuilder AddMonitoringDemo(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings)
    {
        IResourceBuilder<PostgresDatabaseResource> database = builder.AddDatabase(settings);
        ObservabilityResources observability = builder.AddObservabilityStack(settings);
        builder.AddApplicationWorkloads(settings, database, observability);
        return builder;
    }
}
