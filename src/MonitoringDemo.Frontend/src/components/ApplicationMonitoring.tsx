import {
  Activity,
  ArrowDown,
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  FileWarning,
  Fingerprint,
  Gauge,
  Layers3,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Tags,
  Workflow,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['application-http', 'HTTP'],
  ['application-database', 'Database'],
  ['application-cache', 'Cache'],
  ['application-dependencies', 'Dependencies'],
  ['application-custom-metrics', 'Custom metrics'],
  ['application-custom-spans', 'Custom spans'],
  ['application-errors', 'Errors'],
] as const;

const httpSignals = [
  { icon: Activity, name: 'Request rate', question: 'How much demand reaches each route and outcome?' },
  { icon: Clock3, name: 'Duration', question: 'How long does the full request take across its distribution?' },
  { icon: CircleAlert, name: 'Error rate', question: 'Which outcomes fail, and for what share of attempts?' },
  { icon: Gauge, name: 'In flight', question: 'How much work is currently competing for capacity?' },
] as const;

const databaseSignals = [
  ['Query duration', 'Separate queue, connection wait, and execution time when possible.'],
  ['Throughput', 'Read and write volume supplies the demand context for latency.'],
  ['Failures', 'Timeouts, constraint violations, and connection errors need distinct meaning.'],
  ['Pool pressure', 'Waiting, exhaustion, and acquisition time can expose the bottleneck before the database does.'],
] as const;

const customMetricTypes = [
  { name: 'Counter', description: 'Accumulates discrete events so rate and change can be derived.', cue: 'How often?' },
  { name: 'Gauge', description: 'Represents a current level that may rise or fall.', cue: 'How much now?' },
  { name: 'Histogram', description: 'Preserves a distribution of observed values.', cue: 'How is it spread?' },
] as const;

const errorQuestions = [
  { icon: Activity, title: 'Frequency', description: 'Is the failure isolated, recurring, or increasing?' },
  { icon: Layers3, title: 'Affected scope', description: 'Which routes, versions, tenants, or dependencies share it?' },
  { icon: Fingerprint, title: 'Identity', description: 'Which events are instances of the same underlying defect?' },
  { icon: Workflow, title: 'Execution context', description: 'What happened immediately before and after the failure?' },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function SectionHeading({ index, eyebrow, title, description, id }: {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="fundamentals-section-heading">
      <span className="fundamentals-index">{index}</span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function ApplicationMonitoring() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="application-http" aria-labelledby="application-http-heading">
        <SectionHeading
          index="01"
          eyebrow="HTTP metrics"
          title="Read the request boundary from demand to outcome"
          description="HTTP metrics describe a population of requests. Rate, duration, errors, and work in progress become useful when route, method, status class, and service boundaries preserve meaning without creating unbounded dimensions."
          id="application-http-heading"
        />

        <Card asChild className="app-monitor-request-card">
          <article>
            <div className="app-monitor-request-path" aria-label="An HTTP request passes from a client through an application to an outcome">
              <span><Network aria-hidden="true" /><small>Demand</small><strong>Client request</strong></span>
              <ArrowRight aria-hidden="true" />
              <span><Server aria-hidden="true" /><small>Work</small><strong>Application route</strong></span>
              <ArrowRight aria-hidden="true" />
              <span><CheckCircle2 aria-hidden="true" /><small>Outcome</small><strong>Status + duration</strong></span>
            </div>
            <p>Measure at a consistent boundary so the numerator, denominator, and elapsed time describe the same request population.</p>
          </article>
        </Card>

        <div className="app-monitor-signal-grid">
          {httpSignals.map(({ icon: Icon, name, question }) => (
            <article key={name}><Icon aria-hidden="true" /><p><strong>{name}</strong><span>{question}</span></p></article>
          ))}
        </div>
      </section>

      <section className="fundamentals-section" id="application-database" aria-labelledby="application-database-heading">
        <SectionHeading
          index="02"
          eyebrow="Database metrics"
          title="Observe the wait around the query, not only the query"
          description="Application-visible database health includes connection acquisition, query execution, timeouts, and returned outcomes. This separates database work from pressure in the pool or application queue."
          id="application-database-heading"
        />

        <div className="app-monitor-database-layout">
          <Card asChild className="app-monitor-database-timeline">
            <article>
              <header><Database aria-hidden="true" /><div><p className="eyebrow">Observed duration</p><h3>One operation, several waits</h3></div></header>
              <div aria-label="Database operation duration split into pool wait, execution, and result handling">
                <span className="pool"><small>Pool wait</small><i /></span>
                <span className="query"><small>Execution</small><i /></span>
                <span className="result"><small>Result</small><i /></span>
              </div>
              <p>A slow database call may be slow before a query reaches the database. Keep acquisition and execution visible as separate phases.</p>
            </article>
          </Card>

          <div className="app-monitor-database-signals">
            {databaseSignals.map(([name, description], index) => (
              <article key={name}><span>{String(index + 1).padStart(2, '0')}</span><p><strong>{name}</strong><small>{description}</small></p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="fundamentals-section" id="application-cache" aria-labelledby="application-cache-heading">
        <SectionHeading
          index="03"
          eyebrow="Cache metrics"
          title="A hit ratio needs its cost and pressure context"
          description="A cache changes the path that work takes. Monitor whether lookups hit, what a miss costs, why entries leave, and whether the cache is approaching a capacity boundary."
          id="application-cache-heading"
        />

        <Card asChild className="app-monitor-cache-card">
          <article>
            <div className="app-monitor-cache-origin">
              <span><Search aria-hidden="true" /><small>Lookup</small><strong>Ask the cache</strong></span>
              <ArrowRight aria-hidden="true" />
              <span className="cache"><Boxes aria-hidden="true" /><small>Decision</small><strong>Hit or miss</strong></span>
            </div>
            <div className="app-monitor-cache-branches">
              <article className="hit"><CheckCircle2 aria-hidden="true" /><p><small>Hit path</small><strong>Return nearby</strong><span>Observe lookup duration and useful hit proportion.</span></p></article>
              <ArrowDown aria-hidden="true" />
              <article className="miss"><RefreshCw aria-hidden="true" /><p><small>Miss path</small><strong>Fetch from origin</strong><span>Observe miss penalty, origin load, and refill behavior.</span></p></article>
            </div>
          </article>
        </Card>

        <div className="app-monitor-cache-notes">
          <article><Gauge aria-hidden="true" /><p><strong>Capacity pressure</strong><span>Memory use and entry count explain when useful data competes for limited space.</span></p></article>
          <article><RefreshCw aria-hidden="true" /><p><strong>Evictions</strong><span>Turnover may be normal policy, capacity pressure, or ineffective retention.</span></p></article>
          <article><Clock3 aria-hidden="true" /><p><strong>Miss penalty</strong><span>The cost of a miss determines how strongly hit-ratio changes affect users.</span></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="application-dependencies" aria-labelledby="application-dependencies-heading">
        <SectionHeading
          index="04"
          eyebrow="Dependency monitoring"
          title="Monitor every remote boundary as part of the application"
          description="An application can be healthy internally and still fail through a remote service, queue, identity provider, or external API. Dependency signals describe calls from the caller's point of view."
          id="application-dependencies-heading"
        />

        <div className="app-monitor-dependency-layout">
          <Card asChild className="app-monitor-dependency-map">
            <article aria-label="Application connected to payment, search, and messaging dependencies">
              <div className="app-monitor-center"><Server aria-hidden="true" /><strong>Application</strong><small>Caller boundary</small></div>
              <div className="app-monitor-spoke payment"><Database aria-hidden="true" /><strong>Payments</strong><small>Outcome</small></div>
              <div className="app-monitor-spoke search"><Search aria-hidden="true" /><strong>Search</strong><small>Latency</small></div>
              <div className="app-monitor-spoke message"><Workflow aria-hidden="true" /><strong>Messaging</strong><small>Availability</small></div>
            </article>
          </Card>

          <div className="app-monitor-dependency-questions">
            <article><span>01</span><p><strong>Which target?</strong><small>Preserve a stable dependency identity and operation boundary.</small></p></article>
            <article><span>02</span><p><strong>What outcome?</strong><small>Separate success, refusal, timeout, cancellation, and invalid response.</small></p></article>
            <article><span>03</span><p><strong>How long?</strong><small>Measure caller-observed duration, including network and retry cost.</small></p></article>
            <article><span>04</span><p><strong>How much amplification?</strong><small>Retries and fan-out can turn one user action into many dependency calls.</small></p></article>
          </div>
        </div>
      </section>

      <section className="fundamentals-section" id="application-custom-metrics" aria-labelledby="application-custom-metrics-heading">
        <SectionHeading
          index="05"
          eyebrow="Custom metrics"
          title="Measure a domain event only when its meaning is stable"
          description="Custom metrics translate application behavior into aggregatable signals. Begin with the question, choose the value type that preserves its meaning, and add only dimensions that support a real comparison."
          id="application-custom-metrics-heading"
        />

        <div className="app-monitor-metric-flow" aria-label="A custom metric begins with a question, measures an event, and adds bounded dimensions">
          <span><Search aria-hidden="true" /><small>Question</small><strong>What decision?</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><ChartNoAxesCombined aria-hidden="true" /><small>Measurement</small><strong>What value?</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><Tags aria-hidden="true" /><small>Dimensions</small><strong>Which comparisons?</strong></span>
        </div>

        <div className="app-monitor-metric-types">
          {customMetricTypes.map(({ name, description, cue }, index) => (
            <Card asChild className="app-monitor-metric-type" key={name}>
              <article><span>{String(index + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{description}</p><small>{cue}</small></article>
            </Card>
          ))}
        </div>

        <div className="knowledge-callout app-monitor-callout caution">
          <CircleAlert aria-hidden="true" />
          <p><strong>Dimensions multiply the number of time series.</strong> Prefer bounded categories that support aggregation. Request IDs, user IDs, and other nearly unique values belong in traces or logs.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="application-custom-spans" aria-labelledby="application-custom-spans-heading">
        <SectionHeading
          index="06"
          eyebrow="Custom spans"
          title="Create a span around meaningful units of work"
          description="Automatic instrumentation reveals common framework boundaries. Custom spans add domain operations that would otherwise remain invisible, while preserving parent-child relationships in the request journey."
          id="application-custom-spans-heading"
        />

        <Card asChild className="app-monitor-span-card">
          <article>
            <div className="app-monitor-span-header"><Workflow aria-hidden="true" /><p><small>Trace</small><strong>Complete checkout</strong></p><span>parent context</span></div>
            <div className="app-monitor-span-waterfall" aria-label="A checkout trace with validation, inventory reservation, and payment authorization spans">
              <div><p><strong>Validate basket</strong><small>domain operation</small></p><span><i style={{ width: '24%', marginLeft: '4%' }} /></span></div>
              <div><p><strong>Reserve inventory</strong><small>custom span</small></p><span><i style={{ width: '43%', marginLeft: '27%' }} /></span></div>
              <div><p><strong>Authorize payment</strong><small>dependency child</small></p><span><i style={{ width: '31%', marginLeft: '64%' }} /></span></div>
            </div>
          </article>
        </Card>

        <div className="app-monitor-span-details">
          <article><Tags aria-hidden="true" /><p><strong>Attributes</strong><span>Describe stable facts used to filter and compare spans.</span></p></article>
          <article><Activity aria-hidden="true" /><p><strong>Events</strong><span>Mark meaningful moments that occur during the operation.</span></p></article>
          <article><CircleAlert aria-hidden="true" /><p><strong>Status</strong><span>Represent the operation outcome without treating every exception as failure.</span></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="application-errors" aria-labelledby="application-errors-heading">
        <SectionHeading
          index="07"
          eyebrow="Error monitoring"
          title="Turn failure events into incident-shaped evidence"
          description="Error monitoring connects exceptions and failed outcomes with frequency, affected scope, release context, and execution history. The goal is not merely to count stack traces, but to understand impact and priority."
          id="application-errors-heading"
        />

        <div className="app-monitor-error-layout">
          <Card asChild className="app-monitor-error-funnel">
            <article>
              <div><FileWarning aria-hidden="true" /><p><small>Observe</small><strong>Failure event</strong></p></div>
              <ArrowDown aria-hidden="true" />
              <div><Fingerprint aria-hidden="true" /><p><small>Group</small><strong>Error identity</strong></p></div>
              <ArrowDown aria-hidden="true" />
              <div><ShieldCheck aria-hidden="true" /><p><small>Prioritize</small><strong>Impact + urgency</strong></p></div>
            </article>
          </Card>

          <div className="app-monitor-error-questions">
            {errorQuestions.map(({ icon: Icon, title, description }) => (
              <article key={title}><Icon aria-hidden="true" /><p><strong>{title}</strong><span>{description}</span></p></article>
            ))}
          </div>
        </div>

        <div className="knowledge-callout app-monitor-callout">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Correlate before escalating.</strong> An error becomes far more actionable when the same context links it to the request, trace, deployment, dependency behavior, and user-visible outcome.</p>
        </div>
      </section>
    </>
  );
}
