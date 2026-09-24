var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres");

var monitoringdb = postgres.AddDatabase("monitoringdb");

var prometheus = builder.AddContainer("prometheus", "prom/prometheus", "latest")
    .WithBindMount("prometheus", "/etc/prometheus", isReadOnly: true)
    .WithHttpEndpoint(port: 9090, targetPort: 9090, name: "http")
    .WithArgs("--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.retention.time=15d");

var grafana = builder.AddContainer("grafana", "grafana/grafana", "latest")
    .WithBindMount("grafana/provisioning", "/etc/grafana/provisioning", isReadOnly: true)
    .WithBindMount("grafana/dashboards", "/etc/grafana/dashboards", isReadOnly: true)
    .WithHttpEndpoint(port: 3000, targetPort: 3000, name: "http")
    .WithEnvironment("GF_SECURITY_ADMIN_USER", "admin")
    .WithEnvironment("GF_SECURITY_ADMIN_PASSWORD", "admin")
    .WithEnvironment("GF_USERS_ALLOW_SIGN_UP", "false")
    .WaitFor(prometheus);

var apiService = builder.AddProject<Projects.MonitoringDemo_ApiService>("apiservice")
    .WithReference(monitoringdb)
    .WaitFor(monitoringdb)
    .WithHttpEndpoint(port: 5000);

var frontend = builder.AddViteApp("frontend", "../MonitoringDemo.Frontend")
    .WithReference(apiService)
    .WaitFor(apiService)
    .WithHttpEndpoint(port: 5173, env: "PORT")
    .WithExternalHttpEndpoints();

builder.Build().Run();
