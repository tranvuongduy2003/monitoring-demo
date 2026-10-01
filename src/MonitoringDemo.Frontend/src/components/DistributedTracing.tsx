import {
  Activity,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock3,
  Fingerprint,
  GitBranch,
  ListTree,
  Network,
  Tags,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['tracing-identity', 'Trace & span identity'],
  ['tracing-hierarchy', 'Span hierarchy'],
  ['tracing-duration', 'Duration & overlap'],
  ['tracing-details', 'Attributes, events & status'],
] as const;

const waterfallSpans = [
  { name: 'Checkout request', service: 'web', offset: 0, width: 100, duration: '840 ms', tone: 'root' },
  { name: 'Reserve inventory', service: 'inventory', offset: 7, width: 31, duration: '260 ms', tone: 'child' },
  { name: 'Charge payment', service: 'payments', offset: 43, width: 44, duration: '370 ms', tone: 'child' },
  { name: 'Write receipt', service: 'orders-db', offset: 89, width: 9, duration: '76 ms', tone: 'child' },
] as const;

const statuses = [
  {
    icon: CircleDashed,
    name: 'Unset',
    description: 'No explicit success or failure conclusion was recorded. This is the normal default, not automatically an error.',
    className: 'unset',
  },
  {
    icon: CircleCheck,
    name: 'OK',
    description: 'The operation was explicitly marked successful when that extra conclusion is useful.',
    className: 'ok',
  },
  {
    icon: CircleX,
    name: 'Error',
    description: 'The operation failed. A description or recorded event can preserve useful failure context.',
    className: 'error',
  },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function DistributedTracing() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="tracing-identity" aria-labelledby="tracing-identity-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">Trace, trace ID, span, and span ID</p>
            <h2 id="tracing-identity-heading">One journey, described as individual operations</h2>
            <p>A distributed trace follows one request or workflow across service boundaries. Each operation contributes a span, so the trace reveals both the complete journey and the work performed along the way.</p>
          </div>
        </div>

        <div className="tracing-identity-grid">
          <Card asChild className="tracing-definition-card trace">
            <article>
              <div className="tracing-definition-title"><span aria-hidden="true"><Network /></span><div><p className="eyebrow">End-to-end story</p><h3>Trace</h3></div></div>
              <p>A collection of related spans representing one distributed operation from its entry point to its final downstream work.</p>
              <dl><div><dt>Identity</dt><dd>Trace ID</dd></div><div><dt>Scope</dt><dd>The entire journey</dd></div></dl>
            </article>
          </Card>
          <Card asChild className="tracing-definition-card span">
            <article>
              <div className="tracing-definition-title"><span aria-hidden="true"><Activity /></span><div><p className="eyebrow">Unit of work</p><h3>Span</h3></div></div>
              <p>A timed operation within the trace, such as handling a request, calling a dependency, or running a database query.</p>
              <dl><div><dt>Identity</dt><dd>Span ID</dd></div><div><dt>Scope</dt><dd>One operation</dd></div></dl>
            </article>
          </Card>
        </div>

        <Card asChild className="tracing-id-story">
          <article>
            <div className="tracing-id-heading"><Fingerprint aria-hidden="true" /><div><p className="eyebrow">Identity and correlation</p><h3>Shared trace ID, unique span IDs</h3></div></div>
            <div className="tracing-id-flow" aria-label="Three spans share one trace ID and each has a unique span ID">
              {['web · a1f0', 'inventory · b7c2', 'payments · c9e4'].map((span, index) => (
                <div key={span}>
                  <small>Span {index + 1}</small>
                  <strong>{span}</strong>
                  <span>trace 7d3a…91be</span>
                </div>
              ))}
            </div>
            <p>Every span in the journey carries the same trace ID. Each span also gets its own span ID so it can be addressed and connected to a parent.</p>
          </article>
        </Card>
      </section>

      <section className="fundamentals-section" id="tracing-hierarchy" aria-labelledby="tracing-hierarchy-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Root span and parent / child spans</p>
            <h2 id="tracing-hierarchy-heading">Span relationships reconstruct the call tree</h2>
            <p>The root span represents the trace entry point and has no parent inside that trace. Every child span names its parent span, preserving causality even when work crosses processes or runs concurrently.</p>
          </div>
        </div>

        <div className="tracing-hierarchy-layout">
          <Card asChild className="tracing-tree-card">
            <article>
              <div className="tracing-tree-row root">
                <span aria-hidden="true"><GitBranch /></span>
                <div><small>Root span · no parent</small><strong>Checkout request</strong><code>span a1f0</code></div>
              </div>
              <div className="tracing-tree-children">
                <div className="tracing-tree-row">
                  <span aria-hidden="true"><Activity /></span>
                  <div><small>Child of a1f0</small><strong>Reserve inventory</strong><code>span b7c2</code></div>
                </div>
                <div className="tracing-tree-row">
                  <span aria-hidden="true"><Activity /></span>
                  <div><small>Child of a1f0</small><strong>Charge payment</strong><code>span c9e4</code></div>
                </div>
                <div className="tracing-tree-grandchild">
                  <div className="tracing-tree-row">
                    <span aria-hidden="true"><Activity /></span>
                    <div><small>Child of c9e4</small><strong>Write payment record</strong><code>span d4a8</code></div>
                  </div>
                </div>
              </div>
            </article>
          </Card>

          <div className="tracing-relationship-cards">
            <Card asChild><article><ListTree aria-hidden="true" /><div><h3>Root establishes the boundary</h3><p>Its start and end usually define the overall trace duration and the top of the operation tree.</p></div></article></Card>
            <Card asChild><article><GitBranch aria-hidden="true" /><div><h3>Parent describes cause</h3><p>A parent initiated or logically owns the child work; the relationship is about causality, not merely start time.</p></div></article></Card>
            <Card asChild><article><Network aria-hidden="true" /><div><h3>Children may overlap</h3><p>Sibling spans can run sequentially or concurrently while remaining children of the same parent.</p></div></article></Card>
          </div>
        </div>
      </section>

      <section className="fundamentals-section" id="tracing-duration" aria-labelledby="tracing-duration-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">Span duration</p>
            <h2 id="tracing-duration-heading">Duration measures elapsed time, while the waterfall reveals where it went</h2>
            <p>A span duration is the interval between its start and end. Placing child spans on their parent&apos;s timeline exposes ordering, overlap, waiting, and the path that most influences end-to-end latency.</p>
          </div>
        </div>

        <Card asChild className="tracing-waterfall-card">
          <article>
            <div className="tracing-waterfall-heading">
              <div><p className="eyebrow">Illustrative trace waterfall</p><h3>840 ms from entry to completion</h3></div>
              <div className="tracing-scale" aria-hidden="true"><span>0 ms</span><span>420 ms</span><span>840 ms</span></div>
            </div>
            <div className="tracing-waterfall" aria-label="Trace waterfall showing four spans and their relative duration">
              {waterfallSpans.map(span => (
                <div className="tracing-waterfall-row" key={span.name}>
                  <div><strong>{span.name}</strong><small>{span.service}</small></div>
                  <div className="tracing-waterfall-track">
                    <i className={span.tone} style={{ left: `${span.offset}%`, width: `${span.width}%` }}><span>{span.duration}</span></i>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </Card>

        <div className="knowledge-callout tracing-duration-callout">
          <Clock3 aria-hidden="true" />
          <p><strong>Do not add every span duration.</strong> Parent spans include time spent waiting for children, and concurrent children overlap. The trace duration follows wall-clock time from the root start to root end.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="tracing-details" aria-labelledby="tracing-details-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Span attributes, events, and status</p>
            <h2 id="tracing-details-heading">A span pairs timing with searchable context</h2>
            <p>Attributes describe the operation, events mark meaningful moments during it, and status records its final outcome. Together they explain what happened without changing the span&apos;s identity or place in the trace.</p>
          </div>
        </div>

        <div className="tracing-detail-grid">
          <Card asChild className="tracing-detail-card attributes">
            <article>
              <div className="tracing-detail-title"><span aria-hidden="true"><Tags /></span><div><p className="eyebrow">Key–value context</p><h3>Span attributes</h3></div></div>
              <p>Facts that describe the operation and make spans filterable or groupable. Stable, meaningful dimensions are more useful than unbounded values.</p>
              <dl>
                <div><dt>service.name</dt><dd>payments</dd></div>
                <div><dt>http.request.method</dt><dd>POST</dd></div>
                <div><dt>server.address</dt><dd>pay.internal</dd></div>
              </dl>
            </article>
          </Card>

          <Card asChild className="tracing-detail-card events">
            <article>
              <div className="tracing-detail-title"><span aria-hidden="true"><Activity /></span><div><p className="eyebrow">Timestamped moments</p><h3>Span events</h3></div></div>
              <p>Named occurrences at a specific instant inside the span. They are useful for exceptions, retries, state transitions, or other moments that do not need their own duration.</p>
              <ol>
                <li><time>+ 84 ms</time><strong>retry scheduled</strong></li>
                <li><time>+ 172 ms</time><strong>connection restored</strong></li>
                <li><time>+ 368 ms</time><strong>charge accepted</strong></li>
              </ol>
            </article>
          </Card>
        </div>

        <div className="tracing-status-section">
          <div className="tracing-status-heading"><CircleCheck aria-hidden="true" /><div><p className="eyebrow">Final outcome</p><h3>Span status is a conclusion, not a timeline</h3></div></div>
          <div className="tracing-status-grid">
            {statuses.map(({ icon: Icon, name, description, className }) => (
              <Card asChild className={`tracing-status-card ${className}`} key={name}>
                <article><Icon aria-hidden="true" /><div><h4>{name}</h4><p>{description}</p></div></article>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
