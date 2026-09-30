import {
  Activity,
  AudioWaveform,
  BellRing,
  Binoculars,
  ChartNoAxesCombined,
  CircleDot,
  FileText,
  Gauge,
  GitBranch,
  RadioTower,
  Search,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const foundations = [
  {
    icon: BellRing,
    label: 'Monitoring',
    summary: 'Watches known indicators and tells you when a defined condition needs attention.',
    question: 'Is the system healthy?',
    tone: 'ocean',
  },
  {
    icon: Binoculars,
    label: 'Observability',
    summary: 'Lets you explore available evidence to explain both familiar and unexpected behavior.',
    question: 'Why is the system behaving this way?',
    tone: 'mint',
  },
  {
    icon: RadioTower,
    label: 'Telemetry',
    summary: 'The events, measurements, and operation records emitted by a system.',
    question: 'What evidence do we have?',
    tone: 'sun',
  },
] as const;

const signals = [
  {
    icon: FileText,
    label: 'Logs',
    description: 'Timestamped records of discrete events, enriched with the context needed to understand a particular occurrence.',
    strength: 'Detail and explanation',
    answers: 'What happened at this moment?',
    example: 'An operation was rejected because a dependency was unavailable.',
    tone: 'coral',
  },
  {
    icon: ChartNoAxesCombined,
    label: 'Metrics',
    description: 'Numeric measurements aggregated over time, giving a compact view of trends and system-wide behavior.',
    strength: 'Trends and alerting',
    answers: 'How much, how often, and is it changing?',
    example: 'The error rate rose while request volume remained stable.',
    tone: 'mint',
  },
  {
    icon: GitBranch,
    label: 'Traces',
    description: 'Connected spans that show how one request or operation moves through services and dependencies.',
    strength: 'End-to-end journeys',
    answers: 'Where did the time go?',
    example: 'Most latency came from one downstream operation.',
    tone: 'ocean',
  },
] as const;

const comparison = [
  ['Primary goal', 'Detect known unhealthy conditions', 'Explain system behavior'],
  ['Starting point', 'A predefined indicator or threshold', 'A question, symptom, or pattern'],
  ['Typical question', 'Is a known limit being exceeded?', 'Why is this happening?'],
  ['Interaction', 'Review indicators and respond', 'Explore, correlate, and narrow'],
  ['Best outcome', 'Reliable and timely awareness', 'A trustworthy explanation'],
] as const;

const jumpLinks = [
  ['core-ideas', 'Core ideas'],
  ['instrumentation', 'Instrumentation'],
  ['signals', 'Signals'],
  ['comparison', 'Monitoring vs observability'],
] as const;

export function ObservabilityFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="core-ideas" aria-labelledby="core-ideas-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">The vocabulary</p>
            <h2 id="core-ideas-heading">Three ideas, one connected practice</h2>
            <p>Monitoring and observability use telemetry differently. Knowing the role of each term makes the rest of the landscape easier to understand.</p>
          </div>
        </div>

        <div className="foundation-grid">
          {foundations.map(({ icon: Icon, label, summary, question, tone }) => (
            <Card asChild className={`foundation-card ${tone}`} key={label}>
              <article>
                <span className="foundation-icon" aria-hidden="true"><Icon /></span>
                <h3>{label}</h3>
                <p>{summary}</p>
                <div><Search aria-hidden="true" /><span>{question}</span></div>
              </article>
            </Card>
          ))}
        </div>
      </section>

      <section className="fundamentals-section" id="instrumentation" aria-labelledby="instrumentation-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Creating evidence</p>
            <h2 id="instrumentation-heading">Instrumentation gives behavior a voice</h2>
            <p>Instrumentation is the intentional process of making a system produce useful telemetry. It decides what is recorded and which context travels with it.</p>
          </div>
        </div>

        <Card asChild className="instrumentation-card">
          <article>
            <div className="instrumentation-lead">
              <span aria-hidden="true"><AudioWaveform /></span>
              <div>
                <p className="eyebrow">The essential context</p>
                <h3>Every useful signal tells a small, complete story</h3>
              </div>
            </div>
            <dl className="context-grid">
              <div><dt>What</dt><dd>The event, measurement, or operation</dd></div>
              <div><dt>When</dt><dd>An accurate time and, where relevant, duration</dd></div>
              <div><dt>Where</dt><dd>The service, environment, region, or dependency</dd></div>
              <div><dt>Who or what</dt><dd>The affected request, user group, or workload</dd></div>
              <div><dt>How it relates</dt><dd>Shared identifiers and attributes that connect evidence</dd></div>
            </dl>
            <p className="instrumentation-note">Good instrumentation is selective and consistent. It captures enough context to answer meaningful questions while keeping volume, sensitive information, and unbounded dimensions under control.</p>
          </article>
        </Card>
      </section>

      <section className="fundamentals-section" id="signals" aria-labelledby="signals-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">The primary signals</p>
            <h2 id="signals-heading">Logs, metrics, and traces</h2>
            <p>Each signal preserves a different shape of evidence. Their value grows when shared context lets an investigation move naturally between them.</p>
          </div>
        </div>

        <div className="signal-knowledge-grid">
          {signals.map(({ icon: Icon, label, description, strength, answers, example, tone }) => (
            <Card asChild className={`signal-knowledge-card ${tone}`} key={label}>
              <article>
                <div className="signal-knowledge-title">
                  <span aria-hidden="true"><Icon /></span>
                  <h3>{label}</h3>
                </div>
                <p>{description}</p>
                <dl>
                  <div><dt>Best at</dt><dd>{strength}</dd></div>
                  <div><dt>Answers</dt><dd>{answers}</dd></div>
                </dl>
                <div className="signal-example"><CircleDot aria-hidden="true" /><span>{example}</span></div>
              </article>
            </Card>
          ))}
        </div>

        <div className="correlation-story" aria-label="A correlated investigation">
          <div><Gauge aria-hidden="true" /><span>Metric</span><strong>Spot the change</strong></div>
          <i aria-hidden="true">→</i>
          <div><GitBranch aria-hidden="true" /><span>Trace</span><strong>Locate the path</strong></div>
          <i aria-hidden="true">→</i>
          <div><FileText aria-hidden="true" /><span>Log</span><strong>Explain the event</strong></div>
        </div>
      </section>

      <section className="fundamentals-section" id="comparison" aria-labelledby="comparison-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Related, not interchangeable</p>
            <h2 id="comparison-heading">Monitoring vs observability</h2>
            <p>Monitoring provides dependable awareness of conditions you already understand. Observability provides the freedom to investigate conditions you did not fully anticipate.</p>
          </div>
        </div>

        <Card className="comparison-card">
          <div className="comparison-table-wrap">
            <table>
              <thead><tr><th scope="col">Dimension</th><th scope="col">Monitoring</th><th scope="col">Observability</th></tr></thead>
              <tbody>
                {comparison.map(([dimension, monitoring, observability]) => (
                  <tr key={dimension}><th scope="row">{dimension}</th><td>{monitoring}</td><td>{observability}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="comparison-conclusion">
            <Activity aria-hidden="true" />
            <p><strong>You need both.</strong> Monitoring tells you when to look. Observability gives you the connected evidence needed to understand what you find.</p>
          </div>
        </Card>
      </section>
    </>
  );
}
