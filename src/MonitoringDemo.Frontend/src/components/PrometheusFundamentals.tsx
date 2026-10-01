import {
  Activity,
  Bell,
  Boxes,
  Clock,
  Database,
  Download,
  FileOutput,
  HardDrive,
  Network,
  RefreshCw,
  Server,
  Target,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['prometheus-architecture', 'Architecture & pull'],
  ['prometheus-scraping', 'Scraping'],
  ['prometheus-targets', 'Targets & discovery'],
  ['prometheus-storage-rules', 'Storage & rules'],
] as const;

const architectureSteps = [
  {
    icon: Server,
    label: 'Instrumented systems',
    detail: 'Applications and exporters expose current measurements.',
  },
  {
    icon: Download,
    label: 'Prometheus server',
    detail: 'Discovers targets and pulls samples on a schedule.',
  },
  {
    icon: Database,
    label: 'Local TSDB',
    detail: 'Organizes labeled samples into time series.',
  },
  {
    icon: Activity,
    label: 'Queries and rules',
    detail: 'Turns stored series into views, derived series, and alerts.',
  },
] as const;

const identityConcepts = [
  {
    icon: Boxes,
    title: 'Job',
    description: 'A logical group of targets that serve the same purpose, such as every instance of one service.',
    example: 'The shared role',
  },
  {
    icon: Server,
    title: 'Instance',
    description: 'One concrete endpoint within a job. It identifies the particular process or host being scraped.',
    example: 'One member of the group',
  },
  {
    icon: Target,
    title: 'Target',
    description: 'An endpoint Prometheus intends to scrape, together with the labels that describe its identity.',
    example: 'The scrape destination',
  },
] as const;

const ruleTypes = [
  {
    icon: FileOutput,
    title: 'Recording rules',
    question: 'What should be calculated ahead of time?',
    description: 'Evaluate an expression repeatedly and save its result as a new time series. This makes frequently reused or expensive views faster and gives teams a consistent derived metric.',
    outcome: 'Outcome: a new stored series',
    tone: 'recording',
  },
  {
    icon: Bell,
    title: 'Alerting rules',
    question: 'What condition needs attention?',
    description: 'Evaluate whether a condition is true and track how long it remains true. The result is alert state that can be routed for grouping, silencing, and notification.',
    outcome: 'Outcome: inactive, pending, or firing state',
    tone: 'alerting',
  },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function PrometheusFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="prometheus-architecture" aria-labelledby="prometheus-architecture-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">Prometheus architecture</p>
            <h2 id="prometheus-architecture-heading">A pull-based loop from exposure to insight</h2>
            <p>Prometheus is a metrics monitoring system. Its server repeatedly finds endpoints, pulls their current measurements, stores the samples as time series, and evaluates queries and rules over that history.</p>
          </div>
        </div>

        <Card asChild className="prom-architecture-card">
          <article>
            <div className="prom-architecture-flow">
              {architectureSteps.map(({ icon: Icon, label, detail }, index) => (
                <div className="prom-architecture-step-wrap" key={label}>
                  <div className="prom-architecture-step">
                    <span aria-hidden="true"><Icon /></span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </div>
                  {index < architectureSteps.length - 1 && <i aria-hidden="true">&#8594;</i>}
                </div>
              ))}
            </div>
          </article>
        </Card>

        <div className="prom-pull-grid">
          <Card asChild className="prom-pull-card">
            <article>
              <Download aria-hidden="true" />
              <div>
                <p className="eyebrow">Pull model</p>
                <h3>Prometheus starts each scrape</h3>
                <p>Prometheus controls when and where collection happens. The monitored system only needs to expose its latest metric values at a reachable endpoint.</p>
              </div>
            </article>
          </Card>
          <Card asChild className="prom-pull-card">
            <article>
              <RefreshCw aria-hidden="true" />
              <div>
                <p className="eyebrow">Why it matters</p>
                <h3>Collection health is visible</h3>
                <p>Because Prometheus knows the expected targets and schedule, a failed scrape is itself observable. A missing response is different from a valid zero value.</p>
              </div>
            </article>
          </Card>
        </div>
      </section>

      <section className="fundamentals-section" id="prometheus-scraping" aria-labelledby="prometheus-scraping-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Scraping</p>
            <h2 id="prometheus-scraping-heading">One interval creates one stream of samples</h2>
            <p>At every scrape interval, Prometheus requests an endpoint, reads its exposed metric families, attaches target labels, and appends timestamped samples to the matching series.</p>
          </div>
        </div>

        <Card asChild className="prom-scrape-card">
          <article>
            <div className="prom-scrape-endpoint">
              <span aria-hidden="true"><Network /></span>
              <div><small>Exposition endpoint</small><strong>/metrics</strong></div>
              <p>A conventional HTTP endpoint that presents the current metric snapshot in a format Prometheus can read.</p>
            </div>
            <div className="prom-scrape-timeline" aria-label="A target is scraped once every fifteen seconds">
              {[0, 15, 30, 45].map((second, index) => (
                <div key={second}>
                  <span className={index === 3 ? 'current' : undefined} aria-hidden="true" />
                  <strong>{second}s</strong>
                  <small>{index === 3 ? 'next scrape' : 'sample stored'}</small>
                </div>
              ))}
            </div>
          </article>
        </Card>

        <div className="prom-scrape-concepts">
          <Card asChild><article><Download aria-hidden="true" /><div><h3>Scrape</h3><p>One collection attempt against one target. Success adds samples; failure records target health without inventing metric values.</p></div></article></Card>
          <Card asChild><article><Clock aria-hidden="true" /><div><h3>Scrape interval</h3><p>The time between attempts. Short intervals provide finer detail but increase network, ingestion, storage, and query cost.</p></div></article></Card>
          <Card asChild><article><Activity aria-hidden="true" /><div><h3>Snapshot to series</h3><p>Each response is a snapshot. Repeated snapshots give every labeled metric identity its history over time.</p></div></article></Card>
        </div>
      </section>

      <section className="fundamentals-section" id="prometheus-targets" aria-labelledby="prometheus-targets-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">Targets, jobs, and instances</p>
            <h2 id="prometheus-targets-heading">Discovery finds endpoints; labels preserve identity</h2>
            <p>Prometheus needs both a changing list of reachable endpoints and stable labels that explain what each endpoint represents.</p>
          </div>
        </div>

        <div className="prom-identity-grid">
          {identityConcepts.map(({ icon: Icon, title, description, example }) => (
            <Card asChild className="prom-identity-card" key={title}>
              <article>
                <span aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <small>{example}</small>
              </article>
            </Card>
          ))}
        </div>

        <div className="prom-discovery-grid">
          <Card asChild className="prom-discovery-card">
            <article>
              <div className="prom-discovery-heading"><RefreshCw aria-hidden="true" /><div><p className="eyebrow">Service discovery</p><h3>A continuously refreshed target catalog</h3></div></div>
              <p>Discovery reads an external source of service membership instead of relying on a fixed list. As workloads start, stop, or move, Prometheus updates the active target set and its metadata.</p>
              <div className="prom-target-lifecycle" aria-label="Target lifecycle">
                <span>Discovered</span><i aria-hidden="true">&#8594;</i><span>Labeled</span><i aria-hidden="true">&#8594;</i><span>Active</span><i aria-hidden="true">&#8594;</i><span>Scraped</span>
              </div>
            </article>
          </Card>
          <Card asChild className="prom-discovery-card exporter">
            <article>
              <div className="prom-discovery-heading"><FileOutput aria-hidden="true" /><div><p className="eyebrow">Exporters</p><h3>Adapters for systems without native metrics</h3></div></div>
              <p>An exporter reads a system's own statistics and presents them as Prometheus metrics. Prometheus scrapes the exporter as a target; the exporter bridges the monitored system and the pull model.</p>
              <div className="prom-exporter-flow"><span>System statistics</span><i aria-hidden="true">&#8594;</i><strong>Exporter</strong><i aria-hidden="true">&#8594;</i><span>Prometheus</span></div>
            </article>
          </Card>
        </div>
      </section>

      <section className="fundamentals-section" id="prometheus-storage-rules" aria-labelledby="prometheus-storage-rules-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">TSDB, retention, and rules</p>
            <h2 id="prometheus-storage-rules-heading">Keep useful history and evaluate it repeatedly</h2>
            <p>The time-series database turns incoming samples into queryable history. Retention bounds that history, while rules convert recurring questions into continuously evaluated results.</p>
          </div>
        </div>

        <div className="prom-storage-grid">
          <Card asChild className="prom-storage-card">
            <article>
              <HardDrive aria-hidden="true" />
              <div>
                <p className="eyebrow">TSDB</p>
                <h3>Series identity first, samples second</h3>
                <p>The metric name and complete label set identify a time series. The TSDB stores timestamp-value samples for that identity in time-ordered blocks optimized for recent writes and time-range queries.</p>
              </div>
            </article>
          </Card>
          <Card asChild className="prom-retention-card">
            <article>
              <div className="prom-retention-heading"><Clock aria-hidden="true" /><div><p className="eyebrow">Basic retention</p><h3>A moving window of local history</h3></div></div>
              <div className="prom-retention-window" aria-label="Older data expires as new data enters the retention window">
                <span className="expired">Expired</span><span>Older</span><span>Recent</span><span className="new">Now</span>
              </div>
              <p>A longer window supports comparisons further into the past but consumes more disk. When data ages beyond the configured boundary, it becomes eligible for removal.</p>
            </article>
          </Card>
        </div>

        <div className="prom-rule-grid">
          {ruleTypes.map(({ icon: Icon, title, question, description, outcome, tone }) => (
            <Card asChild className={`prom-rule-card ${tone}`} key={title}>
              <article>
                <div className="prom-rule-title"><span aria-hidden="true"><Icon /></span><div><p className="eyebrow">{question}</p><h3>{title}</h3></div></div>
                <p>{description}</p>
                <strong>{outcome}</strong>
              </article>
            </Card>
          ))}
        </div>

        <div className="knowledge-callout prom-rule-callout">
          <RefreshCw aria-hidden="true" />
          <p><strong>Rules run on an evaluation interval.</strong> The scrape interval controls how often new source samples arrive; the evaluation interval controls how often rule expressions reconsider the available data.</p>
        </div>
      </section>
    </>
  );
}
