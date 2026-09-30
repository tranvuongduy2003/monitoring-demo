import { useState, type ComponentType, type KeyboardEvent } from 'react';
import { BookOpenText, FileText, Map, type LucideIcon } from 'lucide-react';
import { LearningMap } from '@/components/LearningMap';
import { LogsFundamentals } from '@/components/LogsFundamentals';
import { MonitoringLinks } from '@/components/MonitoringLinks';
import { ObservabilityFundamentals } from '@/components/ObservabilityFundamentals';

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
