using Aspire.Hosting.ApplicationModel;
using MonitoringDemo.AppHost.Configuration;

namespace MonitoringDemo.AppHost.Orchestration;

internal static class DatabaseResources
{
    public static IResourceBuilder<PostgresDatabaseResource> AddDatabase(
        this IDistributedApplicationBuilder builder,
        AppHostSettings settings)
    {
        var username = builder.AddParameterFromConfiguration(
            "postgres-username",
            "POSTGRES_USER");
        var password = builder.AddParameterFromConfiguration(
            "postgres-password",
            "POSTGRES_PASSWORD",
            secret: true);

        return builder
            .AddPostgres(ResourceNames.Postgres, username, password, port: settings.Ports.Postgres)
            .AddDatabase(ResourceNames.Database, settings.Database.Name);
    }
}
