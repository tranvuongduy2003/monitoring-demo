import type { ComponentType } from 'react';
import { Activity, Boxes, ChartNoAxesCombined, CircleGauge, DatabaseZap, Gauge, LayoutDashboard, LibraryBig, ListTree, RadioTower, ReceiptText, Route, ScrollText } from 'lucide-react';
import { ApplicationMonitoringPage } from '@/pages/ApplicationMonitoringPage';
import { CollectorPage } from '@/pages/CollectorPage';
import { GrafanaPage } from '@/pages/GrafanaPage';
import { LearnPage } from '@/pages/LearnPage';
import { LogsPage } from '@/pages/LogsPage';
import { MethodologiesPage } from '@/pages/MethodologiesPage';
import { MetricsPage } from '@/pages/MetricsPage';
import { OpenTelemetryPage } from '@/pages/OpenTelemetryPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OtlpPage } from '@/pages/OtlpPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { PrometheusPage } from '@/pages/PrometheusPage';
import { TracesPage } from '@/pages/TracesPage';

export type AppRoute = 'overview' | 'orders' | 'application' | 'opentelemetry' | 'otlp' | 'collector' | 'metrics' | 'methodologies' | 'prometheus' | 'logs' | 'traces' | 'grafana' | 'learn';

export type RouteDefinition = {
  title: string;
  label: string;
  group: 'Workspace' | 'Telemetry' | 'Reference';
  icon: ComponentType<{ className?: string }>;
  component: ComponentType;
};

export const routes: Record<AppRoute, RouteDefinition> = {
  overview: { title: 'Overview', label: 'Overview', group: 'Workspace', icon: LayoutDashboard, component: OverviewPage },
  orders: { title: 'Orders', label: 'Orders', group: 'Workspace', icon: ReceiptText, component: OrdersPage },
  opentelemetry: { title: 'OpenTelemetry', label: 'OpenTelemetry', group: 'Telemetry', icon: RadioTower, component: OpenTelemetryPage },
  otlp: { title: 'OTLP', label: 'OTLP', group: 'Telemetry', icon: Route, component: OtlpPage },
  collector: { title: 'OpenTelemetry Collector', label: 'Collector', group: 'Telemetry', icon: Boxes, component: CollectorPage },
  metrics: { title: 'Metrics', label: 'Metrics', group: 'Telemetry', icon: ChartNoAxesCombined, component: MetricsPage },
  application: { title: 'Application Monitoring', label: 'Application', group: 'Telemetry', icon: Activity, component: ApplicationMonitoringPage },
  methodologies: { title: 'Monitoring Methodologies', label: 'Methodologies', group: 'Telemetry', icon: ListTree, component: MethodologiesPage },
  prometheus: { title: 'Prometheus', label: 'Prometheus', group: 'Telemetry', icon: DatabaseZap, component: PrometheusPage },
  logs: { title: 'Logs', label: 'Logs', group: 'Telemetry', icon: ScrollText, component: LogsPage },
  traces: { title: 'Traces', label: 'Traces', group: 'Telemetry', icon: Gauge, component: TracesPage },
  grafana: { title: 'Grafana', label: 'Grafana', group: 'Telemetry', icon: CircleGauge, component: GrafanaPage },
  learn: { title: 'Learn & tools', label: 'Learn & tools', group: 'Reference', icon: LibraryBig, component: LearnPage },
};

export const navigationGroups = (['Workspace', 'Telemetry', 'Reference'] as const).map(label => ({
  label,
  items: (Object.entries(routes) as [AppRoute, RouteDefinition][]).filter(([, route]) => route.group === label),
}));

export function readRoute(): AppRoute {
  const candidate = window.location.hash.replace(/^#\/?/, '') || 'overview';
  return candidate in routes ? candidate as AppRoute : 'overview';
}
