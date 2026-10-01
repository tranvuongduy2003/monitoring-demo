import { useState, type ComponentType, type KeyboardEvent } from 'react';
import { Activity, BellRing, BookOpenText, Braces, ChartNoAxesCombined, Database, FileText, Gauge, LayoutDashboard, Link2, Map, Network, Orbit, RadioTower, Share2, Workflow, type LucideIcon } from 'lucide-react';
import { AlertingFundamentals } from '@/components/AlertingFundamentals';
import { ApplicationMonitoring } from '@/components/ApplicationMonitoring';
import { CorrelationFundamentals } from '@/components/CorrelationFundamentals';
import { ContextPropagation } from '@/components/ContextPropagation';
import { DistributedTracing } from '@/components/DistributedTracing';
import { GrafanaFundamentals } from '@/components/GrafanaFundamentals';
import { LearningMap } from '@/components/LearningMap';
import { LogsFundamentals } from '@/components/LogsFundamentals';
import { MetricsFundamentals } from '@/components/MetricsFundamentals';
import { MonitoringMethodologies } from '@/components/MonitoringMethodologies';
import { MonitoringLinks } from '@/components/MonitoringLinks';
import { ObservabilityFundamentals } from '@/components/ObservabilityFundamentals';
import { OpenTelemetryCollector } from '@/components/OpenTelemetryCollector';
import { OpenTelemetryFundamentals } from '@/components/OpenTelemetryFundamentals';
import { OtlpFundamentals } from '@/components/OtlpFundamentals';
import { PromQLBasics } from '@/components/PromQLBasics';
import { PrometheusFundamentals } from '@/components/PrometheusFundamentals';

type LearningTopic = {
  id: string;
  category: string;
  label: string;
  description: string;
  icon: LucideIcon;
  content: ComponentType;
};

function MapAndTools() {
  return <><LearningMap /><MonitoringLinks /></>;
}

// Add future topics here; navigation, mobile selection, and content rendering all
// derive from this single registry.
const learningTopics = [
  {
    id: 'fundamentals',
    category: 'Start here',
    label: 'Observability fundamentals',
    description: 'Monitoring, telemetry, signals, and the ideas that connect them.',
    icon: BookOpenText,
    content: ObservabilityFundamentals,
  },
  {
    id: 'logs',
    category: 'Signals',
    label: 'Logs',
    description: 'Structure, context, correlation, Loki, and LogQL.',
    icon: FileText,
    content: LogsFundamentals,
  },
  {
    id: 'metrics',
    category: 'Signals',
    label: 'Metrics',
    description: 'Time series, metric types, distributions, percentiles, and cardinality.',
    icon: ChartNoAxesCombined,
    content: MetricsFundamentals,
  },
  {
    id: 'prometheus',
    category: 'Metric systems',
    label: 'Prometheus',
    description: 'Pull-based collection, targets, discovery, storage, retention, and rules.',
    icon: Database,
    content: PrometheusFundamentals,
  },
  {
    id: 'promql',
    category: 'Query language',
    label: 'PromQL basics',
    description: 'Selectors, vectors, aggregation, counter change, grouping, and quantiles.',
    icon: Braces,
    content: PromQLBasics,
  },
  {
    id: 'distributed-tracing',
    category: 'Signals',
    label: 'Distributed tracing',
    description: 'Trace identity, span relationships, duration, context, events, and status.',
    icon: Network,
    content: DistributedTracing,
  },
  {
    id: 'context-propagation',
    category: 'Trace continuity',
    label: 'Context propagation',
    description: 'Distributed context, W3C trace fields, transport carriers, and baggage.',
    icon: Share2,
    content: ContextPropagation,
  },
  {
    id: 'opentelemetry',
    category: 'Telemetry framework',
    label: 'OpenTelemetry',
    description: 'Architecture, instrumentation, signal APIs, resources, conventions, and propagation.',
    icon: Orbit,
    content: OpenTelemetryFundamentals,
  },
  {
    id: 'otlp',
    category: 'Telemetry protocol',
    label: 'OTLP',
    description: 'The OpenTelemetry wire protocol, its gRPC and HTTP transports, and endpoint selection.',
    icon: RadioTower,
    content: OtlpFundamentals,
  },
  {
    id: 'opentelemetry-collector',
    category: 'Telemetry pipeline',
    label: 'OpenTelemetry Collector',
    description: 'Receivers, processors, exporters, pipelines, and the core components that shape telemetry flow.',
    icon: Workflow,
    content: OpenTelemetryCollector,
  },
  {
    id: 'grafana',
    category: 'Visualization & alerting',
    label: 'Grafana',
    description: 'Data sources, dashboards, panels, queries, variables, Explore, annotations, and alerting basics.',
    icon: LayoutDashboard,
    content: GrafanaFundamentals,
  },
  {
    id: 'correlation',
    category: 'Cross-signal investigation',
    label: 'Correlation',
    description: 'Logs to traces, metrics to traces, shared identifiers, and exemplars.',
    icon: Link2,
    content: CorrelationFundamentals,
  },
  {
    id: 'monitoring-methodologies',
    category: 'Monitoring strategy',
    label: 'Monitoring methodologies',
    description: 'RED, USE, and the Four Golden Signals as complementary investigation lenses.',
    icon: Gauge,
    content: MonitoringMethodologies,
  },
  {
    id: 'alerting-fundamentals',
    category: 'Response strategy',
    label: 'Alerting fundamentals',
    description: 'Thresholds, rule anatomy, alert states, notification routing, and fatigue prevention.',
    icon: BellRing,
    content: AlertingFundamentals,
  },
  {
    id: 'application-monitoring',
    category: 'Application signals',
    label: 'Application monitoring',
    description: 'HTTP, database, cache, dependency, custom telemetry, and error signals in application context.',
    icon: Activity,
    content: ApplicationMonitoring,
  },
  {
    id: 'map-tools',
    category: 'Reference',
    label: 'Learning map & tools',
    description: 'A quick concept index and links to the monitoring backends.',
    icon: Map,
    content: MapAndTools,
  },
] as const satisfies readonly LearningTopic[];

type LearningTopicId = (typeof learningTopics)[number]['id'];

export function LearningTabs() {
  const [activeTopicId, setActiveTopicId] = useState<LearningTopicId>('fundamentals');
  const activeTopic = learningTopics.find(topic => topic.id === activeTopicId) ?? learningTopics[0];
  const ActiveContent = activeTopic.content;

  function selectTopic(topicId: LearningTopicId) {
    setActiveTopicId(topicId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % learningTopics.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + learningTopics.length) % learningTopics.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = learningTopics.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTopic = learningTopics[nextIndex];
    setActiveTopicId(nextTopic.id);
    document.getElementById(`learning-tab-${nextTopic.id}`)?.focus();
  }

  return (
    <section className="learning-library" aria-label="Learning library">
      <aside className="learning-navigation">
        <div className="learning-navigation-heading">
          <div>
            <p className="eyebrow">Browse the library</p>
            <h2>Topics</h2>
          </div>
          <span>{learningTopics.length}</span>
        </div>
        <p className="learning-navigation-summary">Choose a topic and work through it at your own pace.</p>

        <div className="learning-tablist" role="tablist" aria-label="Learning topics">
          {learningTopics.map((topic, index) => {
            const Icon = topic.icon;
            const isActive = topic.id === activeTopicId;

            return (
              <button
                type="button"
                role="tab"
                id={`learning-tab-${topic.id}`}
                aria-controls="learning-topic-panel"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={isActive ? 'active' : undefined}
                onClick={() => selectTopic(topic.id)}
                onKeyDown={event => handleKeyDown(event, index)}
                key={topic.id}
              >
                <span className="learning-tab-icon" aria-hidden="true"><Icon /></span>
                <span>
                  <small>{topic.category}</small>
                  <strong>{topic.label}</strong>
                  <em>{topic.description}</em>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div
        className="learning-tabpanel"
        role="tabpanel"
        id="learning-topic-panel"
        aria-labelledby={`learning-tab-${activeTopic.id}`}
        tabIndex={0}
      >
        <header className="learning-topic-header">
          <p className="eyebrow">{activeTopic.category}</p>
          <h2>{activeTopic.label}</h2>
          <p>{activeTopic.description}</p>
        </header>
        <ActiveContent />
      </div>
    </section>
  );
}
