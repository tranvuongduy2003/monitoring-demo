import {
  Activity,
  ArrowRight,
  ChartNoAxesCombined,
  CircleAlert,
  Clock3,
  Gauge,
  HeartPulse,
  Layers3,
  Server,
  ShieldCheck,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['methodologies-orientation', 'Orientation'],
  ['methodologies-red', 'RED'],
  ['methodologies-use', 'USE'],
  ['methodologies-golden-signals', 'Golden signals'],
  ['methodologies-choosing', 'Choose a lens'],
] as const;

const redSignals = [
  { icon: Activity, name: 'Rate', question: 'How much demand is the service handling?', example: 'Requests, operations, or messages per unit of time', tone: 'rate' },
  { icon: CircleAlert, name: 'Errors', question: 'How much work is failing?', example: 'Failed requests as a count or proportion of attempts', tone: 'errors' },
  { icon: Clock3, name: 'Duration', question: 'How long does successful and failed work take?', example: 'Latency distributions and high-percentile response times', tone: 'duration' },
] as const;

const useSignals = [
  { letter: 'U', name: 'Utilization', description: 'The proportion of a resource that is busy over a time interval.', question: 'How much capacity is occupied?' },
  { letter: 'S', name: 'Saturation', description: 'The work that cannot be served immediately and must wait.', question: 'Is demand queuing beyond capacity?' },
  { letter: 'E', name: 'Errors', description: 'Failures attributable to the resource or its operation.', question: 'Is the resource producing incorrect outcomes?' },
] as const;

const goldenSignals = [
  { icon: Clock3, name: 'Latency', description: 'The time required to serve a request, separated by outcome when failures return differently.', relation: 'RED · Duration' },
  { icon: Users, name: 'Traffic', description: 'The demand placed on the system, expressed in a unit meaningful to that service.', relation: 'RED · Rate' },
  { icon: CircleAlert, name: 'Errors', description: 'The rate or proportion of requests that fail explicitly, implicitly, or by policy.', relation: 'RED + USE' },
  { icon: Gauge, name: 'Saturation', description: 'How close the system is to its limiting capacity, often revealed by queued work.', relation: 'USE · Saturation' },
] as const;

const comparisonRows = [
  ['RED', 'Request-driven services', 'Rate · Errors · Duration', 'Is the service healthy from the request path?'],
  ['USE', 'Infrastructure and finite resources', 'Utilization · Saturation · Errors', 'Which resource is approaching or exceeding capacity?'],
  ['Four Golden Signals', 'Service health with capacity context', 'Latency · Traffic · Errors · Saturation', 'Are users affected, and is load or capacity involved?'],
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

export function MonitoringMethodologies() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="methodologies-orientation" aria-labelledby="methodologies-orientation-heading">
        <SectionHeading
          index="01"
          eyebrow="Orientation"
          title="A methodology gives every investigation a starting point"
          description="RED, USE, and the Four Golden Signals are question sets, not competing rulebooks. Each lens keeps attention on a small group of signals so an important failure mode is less likely to be missed."
          id="methodologies-orientation-heading"
        />

        <Card asChild className="methodology-orientation-card">
          <article>
            <div className="methodology-orientation-path">
              <span><Users aria-hidden="true" /><small>Outside in</small><strong>Follow user work</strong><em>Requests, outcomes, and waiting time</em></span>
              <ArrowRight aria-hidden="true" />
              <span className="answer"><HeartPulse aria-hidden="true" /><small>Service question</small><strong>Is the experience healthy?</strong><em>RED and Golden Signals begin here</em></span>
            </div>
            <div className="methodology-orientation-path resource">
              <span><Server aria-hidden="true" /><small>Inside out</small><strong>Inspect finite resources</strong><em>Capacity, queues, and resource failures</em></span>
              <ArrowRight aria-hidden="true" />
              <span className="answer"><Gauge aria-hidden="true" /><small>Resource question</small><strong>Where is the constraint?</strong><em>USE makes this search systematic</em></span>
            </div>
          </article>
        </Card>

        <div className="knowledge-callout methodology-callout">
          <ShieldCheck aria-hidden="true" />
          <p><strong>The value is coverage, not a fixed dashboard layout.</strong> Apply the questions at every meaningful boundary, then choose measurements that reflect how that system actually performs work.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="methodologies-red" aria-labelledby="methodologies-red-heading">
        <SectionHeading
          index="02"
          eyebrow="RED method"
          title="Read a service through the work it accepts"
          description="RED focuses on request-driven or event-driven services. It reveals demand, unsuccessful outcomes, and the time taken to complete work without requiring the investigator to know the internal resource layout first."
          id="methodologies-red-heading"
        />

        <div className="methodology-red-grid">
          {redSignals.map(({ icon: Icon, name, question, example, tone }) => (
            <Card asChild className={`methodology-red-card ${tone}`} key={name}>
              <article>
                <span aria-hidden="true"><Icon /></span>
                <div><p className="eyebrow">RED</p><h3>{name}</h3></div>
                <strong>{question}</strong>
                <p>{example}</p>
              </article>
            </Card>
          ))}
        </div>

        <div className="methodology-story" aria-label="RED investigation sequence">
          <article><span>1</span><p><strong>Rate changes</strong><small>Demand rose, fell, or shifted.</small></p></article>
          <ArrowRight aria-hidden="true" />
          <article><span>2</span><p><strong>Errors diverge</strong><small>Outcomes reveal whether the service is coping.</small></p></article>
          <ArrowRight aria-hidden="true" />
          <article><span>3</span><p><strong>Duration spreads</strong><small>Latency shows the experience before and during failure.</small></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="methodologies-use" aria-labelledby="methodologies-use-heading">
        <SectionHeading
          index="03"
          eyebrow="USE method"
          title="Inspect every finite resource for pressure and failure"
          description="USE applies the same three questions to each resource that can become constrained: processors, memory, storage, network links, connection pools, worker pools, and other bounded capacity."
          id="methodologies-use-heading"
        />

        <div className="methodology-use-layout">
          <Card asChild className="methodology-resource-card">
            <article>
              <header><Server aria-hidden="true" /><div><p className="eyebrow">Resource inventory</p><h3>Repeat the method at every boundary</h3></div></header>
              <div className="methodology-resource-stack">
                {['Processor', 'Memory', 'Storage', 'Network', 'Pools & queues'].map((resource, index) => (
                  <span style={{ '--resource-index': index } as React.CSSProperties} key={resource}><Layers3 aria-hidden="true" />{resource}</span>
                ))}
              </div>
              <p>A healthy average can hide one saturated partition, device, instance, or pool. Keep the resource boundary visible when interpreting the signal.</p>
            </article>
          </Card>

          <div className="methodology-use-questions">
            {useSignals.map(signal => (
              <article key={signal.letter}>
                <span>{signal.letter}</span>
                <div><h3>{signal.name}</h3><strong>{signal.question}</strong><p>{signal.description}</p></div>
              </article>
            ))}
          </div>
        </div>

        <div className="knowledge-callout methodology-callout caution">
          <CircleAlert aria-hidden="true" />
          <p><strong>Utilization and saturation are related, but not interchangeable.</strong> A resource can be highly utilized with no queue, or show waiting and rejection before a simple utilization percentage reaches 100%.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="methodologies-golden-signals" aria-labelledby="methodologies-golden-signals-heading">
        <SectionHeading
          index="04"
          eyebrow="Four Golden Signals"
          title="Connect user-visible health to demand and capacity"
          description="The Four Golden Signals combine a service view with a capacity warning. Together they show the experience of work, the amount of demand, the failed outcomes, and whether a limiting resource is running out of room."
          id="methodologies-golden-signals-heading"
        />

        <div className="methodology-golden-grid">
          {goldenSignals.map(({ icon: Icon, name, description, relation }, index) => (
            <Card asChild className="methodology-golden-card" key={name}>
              <article>
                <div><span>{String(index + 1).padStart(2, '0')}</span><Icon aria-hidden="true" /></div>
                <h3>{name}</h3>
                <p>{description}</p>
                <small>{relation}</small>
              </article>
            </Card>
          ))}
        </div>

        <Card asChild className="methodology-signal-flow">
          <article>
            <span><Users aria-hidden="true" /><small>Demand</small><strong>Traffic arrives</strong></span>
            <ArrowRight aria-hidden="true" />
            <span><Workflow aria-hidden="true" /><small>Experience</small><strong>Latency + errors</strong></span>
            <ArrowRight aria-hidden="true" />
            <span><Zap aria-hidden="true" /><small>Constraint</small><strong>Saturation emerges</strong></span>
          </article>
        </Card>
      </section>

      <section className="fundamentals-section" id="methodologies-choosing" aria-labelledby="methodologies-choosing-heading">
        <SectionHeading
          index="05"
          eyebrow="Choosing a lens"
          title="Start with the boundary you are responsible for"
          description="The methods overlap deliberately. Choose the clearest starting lens, then cross into another when the evidence moves from user-facing symptoms to resource constraints or back again."
          id="methodologies-choosing-heading"
        />

        <Card asChild className="methodology-comparison-card">
          <div className="methodology-table-scroll">
            <table>
              <thead><tr><th>Method</th><th>Best starting boundary</th><th>Core signals</th><th>Primary question</th></tr></thead>
              <tbody>
                {comparisonRows.map(([method, boundary, signals, question]) => (
                  <tr key={method}><th scope="row">{method}</th><td>{boundary}</td><td>{signals}</td><td>{question}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="methodology-decision-grid">
          <article><Activity aria-hidden="true" /><p><strong>Begin with RED</strong><span>when the unit of concern is a request, operation, event, or message.</span></p></article>
          <article><Server aria-hidden="true" /><p><strong>Begin with USE</strong><span>when the unit of concern is a finite resource or capacity pool.</span></p></article>
          <article><ChartNoAxesCombined aria-hidden="true" /><p><strong>Use Golden Signals</strong><span>when a service overview must connect experience, demand, failure, and capacity.</span></p></article>
        </div>
      </section>
    </>
  );
}
