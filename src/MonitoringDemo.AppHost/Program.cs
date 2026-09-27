using MonitoringDemo.ServiceDefaults;

EnvironmentFile.LoadForProject("MonitoringDemo.AppHost");
var builder = DistributedApplication.CreateBuilder(args);

var postgresUser = builder.AddParameterFromConfiguration(
    "postgres-username",
    "POSTGRES_USER");
var postgresPassword = builder.AddParameterFromConfiguration(
    "postgres-password",
    "POSTGRES_PASSWORD",
    secret: true);
var postgres = builder.AddPostgres(
    "postgres",
    postgresUser,
    postgresPassword,
    port: GetInt("POSTGRES_PORT", 5432));

var monitoringdb = postgres.AddDatabase("monitoringdb", Get("POSTGRES_DATABASE", "monitoringdb"));

var lokiPort = GetInt("LOKI_PORT", 3100);
var prometheusPort = GetInt("PROMETHEUS_PORT", 9090);
var grafanaPort = GetInt("GRAFANA_PORT", 3000);
var apiPort = GetInt("API_PORT", 5000);
var frontendPort = GetInt("FRONTEND_PORT", 5173);
var apiMetricsTarget = $"{Get("PROMETHEUS_API_HOST", "host.docker.internal")}:{apiPort}";
var defaultPrometheusDataSourceUrl = $"http://host.docker.internal:{prometheusPort}";
var defaultLokiDataSourceUrl = $"http://host.docker.internal:{lokiPort}";
var defaultLokiBaseUrl = $"http://localhost:{lokiPort}";
var defaultFrontendUrl = $"http://localhost:{frontendPort}";
var defaultApiUrl = $"http://localhost:{apiPort}";
var defaultGrafanaUrl = $"http://localhost:{grafanaPort}";
var defaultPrometheusUrl = $"http://localhost:{prometheusPort}";
var prometheusRetentionArgument = $"--storage.tsdb.retention.time={Get("PROMETHEUS_RETENTION_TIME", "15d")}";

var loki = builder.AddContainer("loki", "grafana/loki", Get("LOKI_IMAGE_TAG", "3.6.3"))
    .WithBindMount("loki", "/etc/loki", isReadOnly: true)
    .WithHttpEndpoint(port: lokiPort, targetPort: 3100, name: "http")
    .WithEnvironment("LOKI_RETENTION_PERIOD", Get("LOKI_RETENTION_PERIOD", "168h"))
    .WithArgs("-config.file=/etc/loki/loki-config.yaml", "-config.expand-env=true");

var prometheus = builder.AddContainer("prometheus", "prom/prometheus", Get("PROMETHEUS_IMAGE_TAG", "latest"))
    .WithBindMount("prometheus", "/etc/prometheus", isReadOnly: true)
    .WithHttpEndpoint(port: prometheusPort, targetPort: 9090, name: "http")
    .WithEnvironment("PROMETHEUS_SCRAPE_INTERVAL", Get("PROMETHEUS_SCRAPE_INTERVAL", "15s"))
    .WithEnvironment("PROMETHEUS_EVALUATION_INTERVAL", Get("PROMETHEUS_EVALUATION_INTERVAL", "15s"))
    .WithEnvironment("PROMETHEUS_API_SCRAPE_INTERVAL", Get("PROMETHEUS_API_SCRAPE_INTERVAL", "5s"))
    .WithEnvironment("API_METRICS_TARGET", apiMetricsTarget)
    .WithEntrypoint("/bin/sh")
    .WithArgs(
        "-c",
        "sed -e \"s|__SCRAPE_INTERVAL__|${PROMETHEUS_SCRAPE_INTERVAL}|g\" " +
        "-e \"s|__EVALUATION_INTERVAL__|${PROMETHEUS_EVALUATION_INTERVAL}|g\" " +
        "-e \"s|__API_SCRAPE_INTERVAL__|${PROMETHEUS_API_SCRAPE_INTERVAL}|g\" " +
        "/etc/prometheus/prometheus.yml > /tmp/prometheus.yml && " +
        "sed -e \"s|__API_METRICS_TARGET__|${API_METRICS_TARGET}|g\" " +
        "/etc/prometheus/targets/apiservice.json > /tmp/apiservice-targets.json && " +
        $"exec /bin/prometheus --config.file=/tmp/prometheus.yml {prometheusRetentionArgument}");

var grafana = builder.AddContainer("grafana", "grafana/grafana", Get("GRAFANA_IMAGE_TAG", "latest"))
    .WithBindMount("grafana/provisioning", "/etc/grafana/provisioning", isReadOnly: true)
    .WithBindMount("grafana/dashboards", "/etc/grafana/dashboards", isReadOnly: true)
    .WithHttpEndpoint(port: grafanaPort, targetPort: 3000, name: "http")
    .WithEnvironment("GF_SECURITY_ADMIN_USER", Get("GRAFANA_ADMIN_USER", "admin"))
    .WithEnvironment("GF_SECURITY_ADMIN_PASSWORD", Get("GRAFANA_ADMIN_PASSWORD", "admin"))
    .WithEnvironment("GF_USERS_ALLOW_SIGN_UP", Get("GRAFANA_ALLOW_SIGN_UP", "false"))
    .WithEnvironment("PROMETHEUS_DATASOURCE_URL", Get("PROMETHEUS_DATASOURCE_URL", defaultPrometheusDataSourceUrl))
    .WithEnvironment("LOKI_DATASOURCE_URL", Get("LOKI_DATASOURCE_URL", defaultLokiDataSourceUrl))
    .WaitFor(prometheus)
    .WaitFor(loki);

var apiService = builder.AddProject<Projects.MonitoringDemo_ApiService>("apiservice")
    .WithReference(monitoringdb)
    .WithEnvironment("LOKI_OTLP_ENDPOINT", Get("LOKI_OTLP_ENDPOINT", $"{defaultLokiBaseUrl}/otlp/v1/logs"))
    .WithEnvironment("Loki__BaseUrl", Get("LOKI_BASE_URL", defaultLokiBaseUrl))
    .WithEnvironment("Prometheus__BaseUrl", Get("PROMETHEUS_BASE_URL", defaultPrometheusUrl))
    .WithEnvironment("Prometheus__Retention", Get("PROMETHEUS_RETENTION_TIME", "15d"))
    .WithEnvironment("Prometheus__ScrapeInterval", Get("PROMETHEUS_SCRAPE_INTERVAL", "15s"))
    .WithEnvironment("Prometheus__ApiScrapeInterval", Get("PROMETHEUS_API_SCRAPE_INTERVAL", "5s"))
    .WithEnvironment("Prometheus__EvaluationInterval", Get("PROMETHEUS_EVALUATION_INTERVAL", "15s"))
    .WithEnvironment("Cors__AllowedOrigins", Get("CORS_ALLOWED_ORIGINS", defaultFrontendUrl))
    .WaitFor(monitoringdb)
    .WaitFor(loki)
    .WithHttpEndpoint(port: apiPort);

var frontend = builder.AddViteApp("frontend", "../MonitoringDemo.Frontend")
    .WithReference(apiService)
    .WithEnvironment("VITE_GRAFANA_URL", Get("VITE_GRAFANA_URL", defaultGrafanaUrl))
    .WithEnvironment("VITE_PROMETHEUS_URL", Get("VITE_PROMETHEUS_URL", defaultPrometheusUrl))
    .WithEnvironment("VITE_API_PUBLIC_URL", Get("VITE_API_PUBLIC_URL", defaultApiUrl))
    .WaitFor(apiService)
    .WithHttpEndpoint(port: frontendPort, env: "PORT")
    .WithExternalHttpEndpoints();

builder.Build().Run();

static string Get(string name, string fallback) =>
    Environment.GetEnvironmentVariable(name) is { Length: > 0 } value ? value : fallback;

static int GetInt(string name, int fallback) =>
    int.TryParse(Environment.GetEnvironmentVariable(name), out int value) ? value : fallback;
