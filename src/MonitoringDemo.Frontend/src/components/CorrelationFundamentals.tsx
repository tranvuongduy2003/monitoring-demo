import {
  ArrowRight,
  ChartNoAxesCombined,
  CircleAlert,
  CircleCheck,
  CircleDot,
  FileText,
  Fingerprint,
  Gauge,
  Link2,
  Search,
  Timer,
  Workflow,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['correlation-logs-traces', 'Logs ↔ Traces'],
  ['correlation-metrics-traces', 'Metrics ↔ Traces'],
  ['correlation-trace-id', 'Trace ID'],
  ['correlation-span-id', 'Span ID'],
  ['correlation-exemplars', 'Exemplars'],
] as const;

const traceSpans = [
  { service: 'web', operation: 'POST /checkout', width: '100%', offset: '0%' },
  { service: 'orders', operation: 'create order', width: '72%', offset: '12%' },
  { service: 'payments', operation: 'authorize', width: '38%', offset: '46%' },
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

export function CorrelationFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="correlation-logs-traces" aria-labelledby="correlation-logs-traces-heading">
        <SectionHeading
          index="01"
          eyebrow="Logs ↔ Traces"
          title="A log explains the moment; a trace explains the journey"
          description="Logs capture discrete events and local detail. Traces place those events inside the request path. Correlation works best when a log records the active trace and span identifiers as structured fields."
          id="correlation-logs-traces-heading"
        />

        <Card asChild className="learning-correlation-log-trace-card">
          <article>
            <div className="learning-correlation-log-record">
              <div className="learning-correlation-card-title">
                <span><FileText aria-hidden="true" /></span>
                <div><p className="eyebrow">Log event</p><h3>Payment authorization timed out</h3></div>
              </div>
              <dl>
                <div><dt>Time</dt><dd>10:42:18.271</dd></div>
                <div><dt>Service</dt><dd>payments</dd></div>
                <div><dt>Trace ID</dt><dd className="learning-correlation-id">4bf9…4736</dd></div>
                <div><dt>Span ID</dt><dd className="learning-correlation-id">a17c…81e2</dd></div>
              </dl>
            </div>

            <div className="learning-correlation-bridge" aria-label="Shared identifiers connect the log event to its trace">
              <Link2 aria-hidden="true" />
              <strong>same context</strong>
              <span>trace + span</span>
              <ArrowRight aria-hidden="true" />
            </div>

            <div className="learning-correlation-trace-preview">
              <div className="learning-correlation-card-title">
                <span><Workflow aria-hidden="true" /></span>
                <div><p className="eyebrow">Distributed trace</p><h3>Checkout request</h3></div>
              </div>
              <div className="learning-correlation-waterfall" aria-label="Three spans in a checkout trace">
                {traceSpans.map(span => (
                  <div key={span.service}>
                    <p><strong>{span.service}</strong><small>{span.operation}</small></p>
                    <span><i style={{ width: span.width, marginLeft: span.offset }} /></span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </Card>

        <div className="learning-correlation-principles">
          <article><Fingerprint aria-hidden="true" /><p><strong>Exact link</strong><span>Trace ID finds the journey; Span ID finds the operation that was active when the log was written.</span></p></article>
          <article><Timer aria-hidden="true" /><p><strong>Useful fallback</strong><span>Time range, service, environment, and request attributes can narrow a search when identifiers are absent.</span></p></article>
          <article><CircleAlert aria-hidden="true" /><p><strong>Not proof by proximity</strong><span>Events close in time may be related, but matching timestamps alone does not establish shared execution context.</span></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="correlation-metrics-traces" aria-labelledby="correlation-metrics-traces-heading">
        <SectionHeading
          index="02"
          eyebrow="Metrics ↔ Traces"
          title="Start with the population, then inspect one request"
          description="Metrics reveal that a population changed: latency rose, errors increased, or throughput shifted. A trace explains one concrete execution inside that population. Moving between them changes the question from “how much?” to “what happened here?”"
          id="correlation-metrics-traces-heading"
        />

        <div className="learning-correlation-metric-layout">
          <Card asChild className="learning-correlation-metric-card">
            <article>
              <div className="learning-correlation-card-title">
                <span><ChartNoAxesCombined aria-hidden="true" /></span>
                <div><p className="eyebrow">Aggregated signal</p><h3>Checkout latency</h3></div>
                <strong>p95 · 1.8 s</strong>
              </div>
              <div className="learning-correlation-chart" aria-label="Latency rises and an exemplar marks a high-latency observation">
                {[28, 32, 30, 38, 41, 47, 55, 82, 68, 52, 46, 43].map((height, index) => (
                  <i style={{ height: `${height}%` }} key={`${height}-${index}`} />
                ))}
                <span><CircleDot aria-hidden="true" /><b>exemplar</b></span>
              </div>
              <div className="learning-correlation-chart-axis"><span>10:35</span><span>10:45</span><span>10:55</span></div>
            </article>
          </Card>

          <div className="learning-correlation-question-shift">
            <article><Gauge aria-hidden="true" /><small>Metric asks</small><strong>Is this widespread?</strong><span>Measure rate, duration, and distribution across many operations.</span></article>
            <ArrowRight aria-hidden="true" />
            <article><Search aria-hidden="true" /><small>Trace asks</small><strong>Why was this request slow?</strong><span>Inspect the services, spans, timings, events, and status of one execution.</span></article>
          </div>
        </div>

        <div className="knowledge-callout learning-correlation-callout">
          <CircleAlert aria-hidden="true" />
          <p><strong>Do not make trace IDs regular metric labels.</strong> A unique identifier for every request creates unbounded metric cardinality. Keep metrics aggregated; use bounded dimensions, time, and exemplars to reach trace detail.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="correlation-trace-id" aria-labelledby="correlation-trace-id-heading">
        <SectionHeading
          index="03"
          eyebrow="Trace ID correlation"
          title="One Trace ID names the end-to-end journey"
          description="Every span in a trace carries the same Trace ID. That shared identity crosses service and process boundaries, so it is the strongest join key for all telemetry produced during one distributed request."
          id="correlation-trace-id-heading"
        />

        <Card asChild className="learning-correlation-identity-card">
          <article>
            <header>
              <Fingerprint aria-hidden="true" />
              <div><p className="eyebrow">Shared journey identity</p><h3>Trace ID · 4bf9…4736</h3></div>
              <span>same on every span</span>
            </header>
            <div className="learning-correlation-service-path" aria-label="The same trace ID connects work across three services">
              {[
                ['web', 'Receive checkout'],
                ['orders', 'Create order'],
                ['payments', 'Authorize payment'],
              ].map(([service, operation], index) => (
                <div className="learning-correlation-service-step" key={service}>
                  <article><small>Service {index + 1}</small><strong>{service}</strong><span>{operation}</span><em>trace 4bf9…4736</em></article>
                  {index < 2 ? <ArrowRight aria-hidden="true" /> : null}
                </div>
              ))}
            </div>
          </article>
        </Card>

        <div className="learning-correlation-fact-grid">
          <article><span>01</span><p><strong>Scope</strong><small>The whole distributed operation, not just one service or one span.</small></p></article>
          <article><span>02</span><p><strong>Continuity</strong><small>Propagation preserves the ID while each participant creates its own span.</small></p></article>
          <article><span>03</span><p><strong>Navigation</strong><small>A trace-linked log or exemplar can open the full request story.</small></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="correlation-span-id" aria-labelledby="correlation-span-id-heading">
        <SectionHeading
          index="04"
          eyebrow="Span ID correlation"
          title="Span ID narrows the journey to one operation"
          description="Each span has its own Span ID. When a log records both identifiers, the Trace ID selects the journey and the Span ID points to the precise operation whose context was active at that moment."
          id="correlation-span-id-heading"
        />

        <div className="learning-correlation-span-layout">
          <Card asChild className="learning-correlation-span-card">
            <article>
              <p className="eyebrow">Two-part locator</p>
              <div className="learning-correlation-locator">
                <span><small>Trace ID</small><strong>4bf9…4736</strong><em>which journey?</em></span>
                <b>+</b>
                <span><small>Span ID</small><strong>a17c…81e2</strong><em>which operation?</em></span>
              </div>
              <div className="learning-correlation-locator-result"><CircleCheck aria-hidden="true" /><p><small>Matched operation</small><strong>payments · authorize</strong></p></div>
            </article>
          </Card>

          <div className="learning-correlation-id-comparison">
            <article><span className="trace"><Fingerprint aria-hidden="true" /></span><p><strong>Trace ID stays the same</strong><small>All related spans share the journey identifier.</small></p></article>
            <article><span className="span"><CircleDot aria-hidden="true" /></span><p><strong>Span ID changes</strong><small>Every operation receives its own identity.</small></p></article>
            <article><span className="parent"><Link2 aria-hidden="true" /></span><p><strong>Parent ID connects structure</strong><small>A child records which span directly caused it.</small></p></article>
          </div>
        </div>

        <div className="knowledge-callout learning-correlation-callout">
          <CircleAlert aria-hidden="true" />
          <p><strong>Keep the pair together.</strong> Span ID is the precise pointer, while Trace ID supplies the complete search scope and surrounding request context. A log with a Span ID should also carry its Trace ID.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="correlation-exemplars" aria-labelledby="correlation-exemplars-heading">
        <SectionHeading
          index="05"
          eyebrow="Exemplars basics"
          title="An exemplar is a sample with a door into a trace"
          description="A metric point or histogram bucket summarizes many observations. An exemplar preserves one representative observation beside that aggregate, often with a Trace ID, so an investigator can move from the shape of the population to a concrete request."
          id="correlation-exemplars-heading"
        />

        <Card asChild className="learning-correlation-exemplar-card">
          <article>
            <div className="learning-correlation-exemplar-visual">
              <div className="learning-correlation-distribution" aria-label="A latency distribution with one exemplar in the slow tail">
                {[18, 31, 54, 78, 96, 83, 61, 39, 23, 13, 7].map((height, index) => <i style={{ height: `${height}%` }} key={`${height}-${index}`} />)}
                <span><CircleDot aria-hidden="true" /><b>1.82 s</b></span>
              </div>
              <div className="learning-correlation-exemplar-caption"><span>fast requests</span><strong>latency distribution</strong><span>slow tail</span></div>
            </div>
            <ArrowRight aria-hidden="true" />
            <div className="learning-correlation-exemplar-detail">
              <p className="eyebrow">Representative observation</p>
              <h3>Exemplar</h3>
              <dl><div><dt>Observed value</dt><dd>1.82 s</dd></div><div><dt>Observed at</dt><dd>10:42:18</dd></div><div><dt>Trace ID</dt><dd className="learning-correlation-id">4bf9…4736</dd></div></dl>
              <span><Workflow aria-hidden="true" />Open the matching trace</span>
            </div>
          </article>
        </Card>

        <div className="learning-correlation-exemplar-steps">
          <article><span>1</span><p><strong>See the symptom</strong><small>Find the unusual region of a rate, counter, or latency distribution.</small></p></article>
          <ArrowRight aria-hidden="true" />
          <article><span>2</span><p><strong>Choose a sample</strong><small>Select an exemplar near the time and value that need explanation.</small></p></article>
          <ArrowRight aria-hidden="true" />
          <article><span>3</span><p><strong>Inspect the trace</strong><small>Follow its Trace ID to study the actual request behind that observation.</small></p></article>
        </div>

        <div className="knowledge-callout learning-correlation-callout caution">
          <CircleAlert aria-hidden="true" />
          <p><strong>An exemplar is representative, not exhaustive.</strong> It does not explain every observation in the aggregate, and its trace must still be retained by the tracing system for the link to resolve.</p>
        </div>
      </section>
    </>
  );
}
