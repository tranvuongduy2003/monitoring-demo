import {
  AlignLeft,
  Braces,
  Bug,
  Database,
  Filter,
  Fingerprint,
  GitCommitHorizontal,
  Layers3,
  Link2,
  ListFilter,
  Search,
  ShieldAlert,
  Tags,
  Workflow,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['logs-shape', 'Log shape'],
  ['logs-context', 'Levels & context'],
  ['logs-correlation', 'Correlation'],
  ['logs-discovery', 'Loki & LogQL'],
] as const;

const levels = [
  ['Trace', 'Finest-grained execution detail', 'trace'],
  ['Debug', 'Diagnostic detail for investigation', 'debug'],
  ['Information', 'Expected, meaningful progress', 'info'],
  ['Warning', 'Unexpected behavior with recovery', 'warning'],
  ['Error', 'A failed operation that needs attention', 'error'],
  ['Critical', 'A severe failure threatening the system', 'critical'],
] as const;

const attributeGroups = [
  {
    icon: Tags,
    title: 'Event attributes',
    description: 'Name the action, outcome, duration, reason, and domain details that explain the event.',
  },
  {
    icon: Layers3,
    title: 'Resource attributes',
    description: 'Identify the service, version, environment, region, and instance that produced the record.',
  },
  {
    icon: Fingerprint,
    title: 'Correlation attributes',
    description: 'Connect the event to a request, trace, span, session, job, or other shared unit of work.',
  },
] as const;

const identities = [
  {
    label: 'Correlation ID',
    description: 'A broad application-defined identifier that groups events belonging to the same business operation or workflow.',
    scope: 'Workflow or operation',
  },
  {
    label: 'Request ID',
    description: 'Identifies one request as it enters a boundary. It is useful even when distributed tracing is unavailable.',
    scope: 'Single request boundary',
  },
  {
    label: 'Trace ID',
    description: 'Connects every span and correlated log across the complete path of a distributed operation.',
    scope: 'End-to-end journey',
  },
  {
    label: 'Span ID',
    description: 'Points to one unit of work within a trace, locating a log at the exact operation that emitted it.',
    scope: 'One operation in a trace',
  },
] as const;

const logQlStages = [
  ['1', 'Select streams', 'Start with indexed labels that narrow the search to relevant sources.'],
  ['2', 'Filter lines', 'Keep or exclude records by matching their content.'],
  ['3', 'Parse fields', 'Turn structured content into fields that later stages can evaluate.'],
  ['4', 'Refine', 'Compare parsed values, format results, or remove noisy fields.'],
  ['5', 'Measure', 'Convert matching logs into rates, counts, or other time-based views.'],
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function LogsFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="logs-shape" aria-labelledby="logs-shape-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">The shape of an event</p>
            <h2 id="logs-shape-heading">Structured and unstructured logging</h2>
            <p>A log records a discrete event. Its shape determines how reliably people and tools can find, compare, and connect the details later.</p>
          </div>
        </div>

        <div className="log-shape-grid">
          <Card asChild className="log-shape-card structured">
            <article>
              <div className="log-card-title"><span aria-hidden="true"><Braces /></span><div><p className="eyebrow">Named fields</p><h3>Structured logging</h3></div></div>
              <p>Stores important details as consistent attributes, so each value keeps its meaning independently of the human-readable message.</p>
              <dl className="log-record structured-record">
                <div><dt>Level</dt><dd>Warning</dd></div>
                <div><dt>Event</dt><dd>Payment delayed</dd></div>
                <div><dt>Service</dt><dd>Checkout</dd></div>
                <div><dt>Duration</dt><dd>2.4 seconds</dd></div>
              </dl>
              <strong>Best for reliable filtering, grouping, and correlation.</strong>
            </article>
          </Card>

          <Card asChild className="log-shape-card unstructured">
            <article>
              <div className="log-card-title"><span aria-hidden="true"><AlignLeft /></span><div><p className="eyebrow">Free-form text</p><h3>Unstructured logging</h3></div></div>
              <p>Expresses the event primarily as prose. It is easy to read, but meaning must be inferred from wording and position.</p>
              <div className="plain-log-record">
                <span aria-hidden="true">10:42</span>
                <p>Warning: payment for checkout was delayed for 2.4 seconds.</p>
              </div>
              <strong>Useful for narrative detail, but fragile for consistent analysis.</strong>
            </article>
          </Card>
        </div>
        <div className="knowledge-callout"><Braces aria-hidden="true" /><p><strong>Structure and readability are compatible.</strong> A structured record can still include a clear message for people while preserving stable attributes for tools.</p></div>
      </section>

      <section className="fundamentals-section" id="logs-context" aria-labelledby="logs-context-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Meaning and urgency</p>
            <h2 id="logs-context-heading">Levels, attributes, and context</h2>
            <p>A useful record says how significant an event is and carries enough stable context to explain where it happened, what it affected, and why it matters.</p>
          </div>
        </div>

        <Card className="log-level-card">
          <div className="log-level-heading"><ShieldAlert aria-hidden="true" /><div><h3>Log levels express severity</h3><p>Choose the level from the meaning of the event, not from how much detail the message contains.</p></div></div>
          <div className="log-level-scale">
            {levels.map(([level, description, tone]) => (
              <div className={tone} key={level}><span>{level}</span><p>{description}</p></div>
            ))}
          </div>
          <p className="log-level-note">Production visibility commonly begins at Information or Warning, while Trace and Debug are enabled selectively. A noisy level loses its ability to signal importance.</p>
        </Card>

        <div className="log-attribute-grid">
          {attributeGroups.map(({ icon: Icon, title, description }) => (
            <Card asChild className="log-attribute-card" key={title}>
              <article><span aria-hidden="true"><Icon /></span><h3>{title}</h3><p>{description}</p></article>
            </Card>
          ))}
        </div>

        <div className="log-practice-grid">
          <Card asChild className="log-practice-card contextual">
            <article><div><Workflow aria-hidden="true" /><h3>Contextual logging</h3></div><p>Attach shared context once at the boundary of an operation and let it travel with every event. This keeps service, request, tenant, and workflow details consistent without repeating them manually.</p></article>
          </Card>
          <Card asChild className="log-practice-card exception">
            <article><div><Bug aria-hidden="true" /><h3>Exception logging</h3></div><p>Record an exception where it is handled or changes the outcome. Preserve its type, message, stack information, and operation context, while avoiding duplicate records at every layer.</p></article>
          </Card>
        </div>
      </section>

      <section className="fundamentals-section" id="logs-correlation" aria-labelledby="logs-correlation-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">Identity across events</p>
            <h2 id="logs-correlation-heading">Correlation connects the story</h2>
            <p>Shared identifiers turn isolated records into a sequence. Their different scopes help an investigation move from a business workflow to one request and then to one operation.</p>
          </div>
        </div>

        <div className="log-identity-grid">
          {identities.map(({ label, description, scope }, index) => (
            <Card asChild className="log-identity-card" key={label}>
              <article><div><span>{index + 1}</span><Fingerprint aria-hidden="true" /></div><h3>{label}</h3><p>{description}</p><strong>{scope}</strong></article>
            </Card>
          ))}
        </div>

        <Card asChild className="log-correlation-card">
          <article>
            <div className="log-correlation-heading"><Link2 aria-hidden="true" /><div><p className="eyebrow">Log correlation</p><h3>Follow one operation through many records</h3></div></div>
            <div className="correlation-chain" aria-label="A correlated path from request to trace to span and logs">
              <div><span>Request</span><strong>Entry point</strong></div><GitCommitHorizontal aria-hidden="true" />
              <div><span>Trace</span><strong>Whole journey</strong></div><GitCommitHorizontal aria-hidden="true" />
              <div><span>Span</span><strong>Exact operation</strong></div><GitCommitHorizontal aria-hidden="true" />
              <div><span>Logs</span><strong>Detailed events</strong></div>
            </div>
            <p>Correlation works when identifiers are propagated across service boundaries and added as structured attributes. Matching timestamps alone is helpful evidence, but it is not a dependable identity strategy.</p>
          </article>
        </Card>
      </section>

      <section className="fundamentals-section" id="logs-discovery" aria-labelledby="logs-discovery-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Finding useful evidence</p>
            <h2 id="logs-discovery-heading">Filtering, querying, Loki, and LogQL</h2>
            <p>Good discovery narrows the search early, extracts meaning only when needed, and keeps indexed dimensions deliberately small.</p>
          </div>
        </div>

        <div className="log-discovery-grid">
          <Card asChild className="log-discovery-card">
            <article><span aria-hidden="true"><Filter /></span><div><p className="eyebrow">Log filtering</p><h3>Reduce the current result set</h3></div><p>Include or exclude records by level, service, identifier, field value, or text. Filtering answers a focused question inside an already chosen scope.</p></article>
          </Card>
          <Card asChild className="log-discovery-card">
            <article><span aria-hidden="true"><Search /></span><div><p className="eyebrow">Log querying</p><h3>Describe the evidence you need</h3></div><p>Select sources, combine conditions, parse fields, group results, and derive measurements. A query can form a complete investigation rather than a single filter.</p></article>
          </Card>
        </div>

        <Card asChild className="loki-mental-model">
          <article>
            <div className="loki-heading"><Database aria-hidden="true" /><div><p className="eyebrow">Loki mental model</p><h3>Index labels, keep log content compressed</h3></div></div>
            <div className="loki-flow">
              <div><Tags aria-hidden="true" /><span>Labels</span><strong>Choose streams</strong><p>Small, stable dimensions such as service and environment.</p></div>
              <GitCommitHorizontal aria-hidden="true" />
              <div><AlignLeft aria-hidden="true" /><span>Log lines</span><strong>Search content</strong><p>Detailed records are scanned only within the selected streams.</p></div>
              <GitCommitHorizontal aria-hidden="true" />
              <div><ListFilter aria-hidden="true" /><span>Results</span><strong>Refine or measure</strong><p>Parsed fields and time ranges answer the investigation question.</p></div>
            </div>
            <p className="loki-note"><strong>Keep labels bounded.</strong> Values such as request IDs, trace IDs, or user IDs create too many streams when used as labels; preserve them as structured fields instead.</p>
          </article>
        </Card>

        <div className="logql-block">
          <div className="logql-intro"><span><ListFilter aria-hidden="true" /></span><div><p className="eyebrow">Fundamental LogQL</p><h3>A query is a narrowing pipeline</h3><p>LogQL begins by selecting Loki streams, then applies optional stages from left to right. Each stage receives the result of the previous one.</p></div></div>
          <ol className="logql-stages">
            {logQlStages.map(([number, title, description]) => (
              <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{description}</p></div></li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
