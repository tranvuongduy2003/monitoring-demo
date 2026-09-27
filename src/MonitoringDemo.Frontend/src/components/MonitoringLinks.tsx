const grafanaUrl = trimTrailingSlash(import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3000');
const prometheusUrl = trimTrailingSlash(import.meta.env.VITE_PROMETHEUS_URL ?? 'http://localhost:9090');
const apiUrl = trimTrailingSlash(import.meta.env.VITE_API_PUBLIC_URL ?? 'http://localhost:5000');

const tools = [
  ['Grafana', grafanaUrl],
  ['Loki Explore', `${grafanaUrl}/explore`],
  ['Tempo Traces', `${grafanaUrl}/a/grafana-exploretraces-app/explore?var-ds=tempo`],
  ['Prometheus', prometheusUrl],
  ['Raw metrics', `${apiUrl}/metrics`],
];

export function MonitoringLinks() {
  return (
    <nav className="links" aria-label="Monitoring tools">
      <span>Monitoring tools</span>
      {tools.map(([label, href]) => (
        <a href={href} target="_blank" rel="noreferrer" key={label}>{label}</a>
      ))}
    </nav>
  );
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}
