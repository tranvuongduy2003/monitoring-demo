import { LearningTabs } from '@/components/LearningTabs';

export function LearnPage() {
  return (
    <div className="learn-page">
      <section className="learn-hero">
        <p className="eyebrow">Learn & tools</p>
        <h1>Understand the signals you generate.</h1>
        <p>Build a clear mental model for observability, then continue the investigation in the real monitoring backends.</p>
      </section>
      <LearningTabs />
      <footer>Learning stays here. Telemetry investigation stays in Grafana, Prometheus, Loki, and Tempo.</footer>
    </div>
  );
}
