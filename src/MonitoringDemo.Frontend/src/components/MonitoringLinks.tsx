import { ArrowUpRight } from 'lucide-react';

const grafanaUrl = trimTrailingSlash(import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3000');
const prometheusUrl = trimTrailingSlash(import.meta.env.VITE_PROMETHEUS_URL ?? 'http://localhost:9090');
const apiUrl = trimTrailingSlash(import.meta.env.VITE_API_PUBLIC_URL ?? 'http://localhost:5000');

const tools = [
  ['Grafana home', grafanaUrl],
  ['API metrics', `${grafanaUrl}/d/monitoring-demo`],
  ['Application monitoring', `${grafanaUrl}/d/application-monitoring`],
  ['Monitoring methodologies', `${grafanaUrl}/d/monitoring-methodologies`],
  ['Logs & correlation', `${grafanaUrl}/d/monitoring-demo-logs`],
  ['Signal correlation', `${grafanaUrl}/d/signal-correlation`],
  ['Grafana fundamentals', `${grafanaUrl}/d/grafana-fundamentals`],
  ['Fundamental alerting', `${grafanaUrl}/d/fundamental-alerting`],
  ['Prometheus', prometheusUrl],
  ['Raw metrics', `${apiUrl}/metrics`],
];

export function MonitoringLinks() {
  return (
    <nav className="tool-links" aria-label="Monitoring tools">
      {tools.map(([label, href]) => (
        <a href={href} target="_blank" rel="noreferrer" key={label}>{label}<ArrowUpRight /></a>
      ))}
    </nav>
  );
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}
