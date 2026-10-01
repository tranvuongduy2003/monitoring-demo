import {
  Activity,
  ArrowRight,
  BookOpen,
  Boxes,
  Cable,
  CircleCheck,
  CodeXml,
  Gauge,
  Library,
  Network,
  PackageSearch,
  ScrollText,
  Send,
  Settings2,
  Tags,
  Workflow,
  Wrench,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['otel-architecture', 'Architecture'],
  ['otel-api-sdk', 'API & SDK'],
  ['otel-instrumentation', 'Instrumentation'],
  ['otel-identity', 'Resource & conventions'],
  ['otel-signals', 'Signals & propagators'],
] as const;

const architectureStages = [
  {
    icon: CodeXml,
    role: 'Create',
    title: 'Application & libraries',
    description: 'Business code and dependencies perform work worth observing.',
  },
  {
    icon: Library,
    role: 'Describe',
    title: 'OpenTelemetry API',
    description: 'Stable interfaces let instrumentation express telemetry without choosing its destination.',
  },
  {
    icon: Settings2,
    role: 'Process',
    title: 'OpenTelemetry SDK',
    description: 'Providers, sampling, processing, and export policy turn recorded activity into signal data.',
  },
  {
    icon: Send,
    role: 'Move',
    title: 'Exporter or Collector',
    description: 'Telemetry leaves the process directly or through a shared collection layer.',
  },
  {
    icon: Activity,
    role: 'Analyze',
    title: 'Observability backend',
    description: 'One or more systems store, correlate, query, and visualize the signals.',
  },
] as const;

const instrumentationTypes = [
  {
    icon: PackageSearch,
    eyebrow: 'Broad coverage',
    title: 'Automatic instrumentation',
    description: 'Observes common frameworks, libraries, and runtimes with little or no change to application logic.',
    strengths: ['Fast baseline', 'Consistent common operations', 'Wide dependency coverage'],
    tradeoff: 'It understands technical boundaries well, but not every business meaning.',
  },
  {
    icon: Wrench,
    eyebrow: 'Domain meaning',
    title: 'Manual instrumentation',
    description: 'Adds telemetry where the application has knowledge that a general-purpose library cannot infer.',
    strengths: ['Business operations', 'Purposeful attributes', 'Important outcomes and events'],
    tradeoff: 'It provides richer meaning, but requires deliberate design and maintenance.',
  },
] as const;

const signalApis = [
  {
    icon: Network,
    title: 'Tracer',
    output: 'Traces and spans',
    description: 'Represents timed operations and their causal relationships across a distributed journey.',
    question: 'Where did this request spend time?',
    tone: 'trace',
  },
  {
    icon: Gauge,
    title: 'Meter',
    output: 'Metrics',
    description: 'Creates measurements that can be aggregated across time and many operations.',
    question: 'How is the system behaving overall?',
    tone: 'metric',
  },
  {
    icon: ScrollText,
    title: 'Logger',
    output: 'Log records',
    description: 'Emits event records that can carry the active trace context for cross-signal correlation.',
    question: 'What happened at this moment?',
    tone: 'log',
  },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function OpenTelemetryFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="otel-architecture" aria-labelledby="otel-architecture-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">OpenTelemetry architecture</p>
            <h2 id="otel-architecture-heading">A shared language and pipeline for telemetry</h2>
            <p>OpenTelemetry is a vendor-neutral observability framework. It standardizes how software describes, creates, enriches, and moves telemetry while leaving storage and analysis to observability backends.</p>
          </div>
        </div>

        <Card asChild className="otel-learning-architecture-card">
          <article>
            <div className="otel-learning-flow" aria-label="Telemetry moves from application code through the API, SDK, exporter or Collector, and into a backend">
              {architectureStages.map(({ icon: Icon, role, title, description }, index) => (
                <div className="otel-learning-flow-step" key={title}>
                  <div>
                    <span aria-hidden="true"><Icon /></span>
                    <small>{role}</small>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                  {index < architectureStages.length - 1 && <ArrowRight aria-hidden="true" />}
                </div>
              ))}
            </div>
          </article>
        </Card>

        <div className="knowledge-callout otel-learning-callout">
          <Workflow aria-hidden="true" />
          <p><strong>OpenTelemetry is not the backend.</strong> It makes telemetry portable; a separate system is still responsible for durable storage, querying, alerting, and visualization.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="otel-api-sdk" aria-labelledby="otel-api-sdk-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">API and SDK</p>
            <h2 id="otel-api-sdk-heading">Instrumentation describes intent; the application chooses policy</h2>
            <p>The API and SDK are separated so reusable instrumentation can remain portable while each application controls how telemetry is processed and exported.</p>
          </div>
        </div>

        <div className="otel-learning-api-grid">
          <Card asChild className="otel-learning-role-card api">
            <article>
              <div className="otel-learning-role-title"><BookOpen aria-hidden="true" /><div><p className="eyebrow">Stable contract</p><h3>API</h3></div></div>
              <p>The API is the vocabulary instrumentation uses to create spans, measurements, log records, and context. Libraries can depend on it without deciding sampling, batching, or destination.</p>
              <div className="otel-learning-role-question"><small>Primary responsibility</small><strong>What should be recorded?</strong></div>
            </article>
          </Card>
          <div className="otel-learning-separation" aria-hidden="true"><span>separation of concerns</span><ArrowRight /></div>
          <Card asChild className="otel-learning-role-card sdk">
            <article>
              <div className="otel-learning-role-title"><Settings2 aria-hidden="true" /><div><p className="eyebrow">Runtime implementation</p><h3>SDK</h3></div></div>
              <p>The SDK implements the API and owns collection policy: providers, processors, sampling, aggregation, resource association, and export.</p>
              <div className="otel-learning-role-question"><small>Primary responsibility</small><strong>How should it be handled?</strong></div>
            </article>
          </Card>
        </div>

        <div className="otel-learning-principles">
          <article><CircleCheck aria-hidden="true" /><p><strong>Library authors</strong><span>Instrument against the API so applications retain control.</span></p></article>
          <article><CircleCheck aria-hidden="true" /><p><strong>Application owners</strong><span>Configure the SDK once and combine telemetry from many libraries.</span></p></article>
          <article><CircleCheck aria-hidden="true" /><p><strong>Without an SDK</strong><span>API calls remain safe, but normally produce no exported telemetry.</span></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="otel-instrumentation" aria-labelledby="otel-instrumentation-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">Automatic and manual instrumentation</p>
            <h2 id="otel-instrumentation-heading">Coverage and meaning work best together</h2>
            <p>Automatic instrumentation reveals common technical activity. Manual instrumentation adds the domain context needed to explain why that activity matters.</p>
          </div>
        </div>

        <div className="otel-learning-instrument-grid">
          {instrumentationTypes.map(({ icon: Icon, eyebrow, title, description, strengths, tradeoff }) => (
            <Card asChild className="otel-learning-instrument-card" key={title}>
              <article>
                <div className="otel-learning-instrument-title"><span aria-hidden="true"><Icon /></span><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div></div>
                <p>{description}</p>
                <ul>{strengths.map(strength => <li key={strength}><CircleCheck aria-hidden="true" />{strength}</li>)}</ul>
                <div><small>Tradeoff</small><span>{tradeoff}</span></div>
              </article>
            </Card>
          ))}
        </div>

        <div className="otel-learning-overlap" aria-label="Automatic and manual instrumentation overlap">
          <span>Automatic<br /><small>technical breadth</small></span>
          <strong>Useful<br />telemetry</strong>
          <span>Manual<br /><small>domain depth</small></span>
        </div>
      </section>

      <section className="fundamentals-section" id="otel-identity" aria-labelledby="otel-identity-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Resource and Semantic Conventions</p>
            <h2 id="otel-identity-heading">Consistent context makes telemetry understandable across systems</h2>
            <p>A resource identifies the entity that produced telemetry. Semantic Conventions give commonly observed concepts shared names and meanings.</p>
          </div>
        </div>

        <div className="otel-learning-identity-grid">
          <Card asChild className="otel-learning-identity-card resource">
            <article>
              <div className="otel-learning-identity-title"><Boxes aria-hidden="true" /><div><p className="eyebrow">Resource</p><h3>Who produced it?</h3></div></div>
              <p>A resource is attached to telemetry as a set of attributes describing its source entity. Many spans, measurements, and log records can share the same resource.</p>
              <dl>
                <div><dt>Service</dt><dd>Name, version, and instance</dd></div>
                <div><dt>Runtime</dt><dd>Process, host, container, or function</dd></div>
                <div><dt>Environment</dt><dd>Deployment and cloud context</dd></div>
              </dl>
            </article>
          </Card>
          <Card asChild className="otel-learning-identity-card conventions">
            <article>
              <div className="otel-learning-identity-title"><Tags aria-hidden="true" /><div><p className="eyebrow">Semantic Conventions</p><h3>What does it mean?</h3></div></div>
              <p>Semantic Conventions standardize names, value meanings, units, span naming, and other signal details for common technologies and operations.</p>
              <dl>
                <div><dt>HTTP</dt><dd>Requests, routes, methods, and outcomes</dd></div>
                <div><dt>Database</dt><dd>Systems, operations, and server context</dd></div>
                <div><dt>Messaging</dt><dd>Publish, receive, process, and destinations</dd></div>
              </dl>
            </article>
          </Card>
        </div>

        <div className="otel-learning-context-formula">
          <span><Boxes aria-hidden="true" /><small>Resource</small><strong>producer identity</strong></span>
          <i aria-hidden="true">+</i>
          <span><Tags aria-hidden="true" /><small>Conventions</small><strong>shared meaning</strong></span>
          <i aria-hidden="true">=</i>
          <span className="result"><Cable aria-hidden="true" /><small>Portable telemetry</small><strong>comparable context</strong></span>
        </div>
      </section>

      <section className="fundamentals-section" id="otel-signals" aria-labelledby="otel-signals-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">05</span>
          <div>
            <p className="eyebrow">Tracer, Meter, Logger, and Propagators</p>
            <h2 id="otel-signals-heading">Signal APIs record the work; propagators preserve its continuity</h2>
            <p>OpenTelemetry exposes a focused API for each signal. Propagators complement those APIs by carrying context across process and transport boundaries.</p>
          </div>
        </div>

        <div className="otel-learning-signal-grid">
          {signalApis.map(({ icon: Icon, title, output, description, question, tone }) => (
            <Card asChild className={`otel-learning-signal-card ${tone}`} key={title}>
              <article>
                <div><span aria-hidden="true"><Icon /></span><small>{output}</small></div>
                <h3>{title}</h3>
                <p>{description}</p>
                <strong>{question}</strong>
              </article>
            </Card>
          ))}
        </div>

        <Card asChild className="otel-learning-propagator-card">
          <article>
            <div className="otel-learning-propagator-heading"><Cable aria-hidden="true" /><div><p className="eyebrow">Propagators</p><h3>Encode and decode context at boundaries</h3></div></div>
            <p>A propagator injects the current trace context and optional baggage into a transport carrier before a request leaves. The receiver extracts that context so new telemetry can continue the same distributed operation.</p>
            <div className="otel-learning-propagation-flow" aria-label="Propagator injects context at the sender and extracts it at the receiver">
              <div><small>Sender</small><strong>Current context</strong></div>
              <span><Send aria-hidden="true" />Inject</span>
              <div className="carrier"><small>Carrier</small><strong>Headers or metadata</strong></div>
              <span><PackageSearch aria-hidden="true" />Extract</span>
              <div><small>Receiver</small><strong>Continued context</strong></div>
            </div>
          </article>
        </Card>
      </section>
    </>
  );
}
