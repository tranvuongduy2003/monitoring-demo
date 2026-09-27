import { useEffect, useState, type ReactNode } from 'react';
import { AppShell, type AppRoute } from '@/shared/components/AppShell';
import { CollectorPage } from '@/pages/CollectorPage';
import { LearnPage } from '@/pages/LearnPage';
import { LogsPage } from '@/pages/LogsPage';
import { MetricsPage } from '@/pages/MetricsPage';
import { OpenTelemetryPage } from '@/pages/OpenTelemetryPage';
import { OtlpPage } from '@/pages/OtlpPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { PrometheusPage } from '@/pages/PrometheusPage';
import { TracesPage } from '@/pages/TracesPage';
import { GrafanaPage } from '@/pages/GrafanaPage';

const pages: Record<AppRoute, { title: string; content: ReactNode }> = {
  overview: { title: 'Overview', content: <OverviewPage /> },
  orders: { title: 'Orders', content: <OrdersPage /> },
  opentelemetry: { title: 'OpenTelemetry', content: <OpenTelemetryPage /> },
  otlp: { title: 'OTLP', content: <OtlpPage /> },
  collector: { title: 'OpenTelemetry Collector', content: <CollectorPage /> },
  metrics: { title: 'Metrics', content: <MetricsPage /> },
  prometheus: { title: 'Prometheus', content: <PrometheusPage /> },
  logs: { title: 'Logs', content: <LogsPage /> },
  traces: { title: 'Traces', content: <TracesPage /> },
  grafana: { title: 'Grafana', content: <GrafanaPage /> },
  learn: { title: 'Learn & tools', content: <LearnPage /> },
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', handleRouteChange);
    return () => window.removeEventListener('hashchange', handleRouteChange);
  }, []);

  useEffect(() => {
    document.title = `${pages[route].title} · Pulseboard`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);

  return <AppShell activeRoute={route}>{pages[route].content}</AppShell>;
}

function readRoute(): AppRoute {
  const candidate = window.location.hash.replace(/^#\/?/, '') || 'overview';
  return candidate in pages ? candidate as AppRoute : 'overview';
}
