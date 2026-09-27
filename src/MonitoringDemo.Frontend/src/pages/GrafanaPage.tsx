import { GrafanaDashboard } from '@/domains/grafana/components/GrafanaDashboard';
import { useGrafanaDashboard } from '@/domains/grafana/hooks/useGrafanaDashboard';
import { PageHeader } from '@/shared/components/PageHeader';

export function GrafanaPage() {
  const model = useGrafanaDashboard();
  return <><PageHeader eyebrow="Visualization workspace" title="Grafana" description="Build observability views from provisioned data sources, reusable queries, variables, annotations, Explore workflows, and actionable alerts." /><GrafanaDashboard model={model} /></>;
}
