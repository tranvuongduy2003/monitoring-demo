import {
  ArrowRight,
  Boxes,
  Braces,
  CircleAlert,
  CircleCheck,
  Globe2,
  Network,
  PackageOpen,
  Route,
  Tags,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['propagation-context', 'Distributed context'],
  ['propagation-w3c', 'W3C Trace Context'],
  ['propagation-transports', 'HTTP & gRPC'],
  ['propagation-baggage', 'Baggage basics'],
] as const;

const traceparentParts = [
  { label: 'Version', value: '00', meaning: 'Format version' },
  { label: 'Trace ID', value: '4bf9...4736', meaning: 'Shared journey' },
  { label: 'Parent ID', value: '00f0...567', meaning: 'Calling span' },
  { label: 'Flags', value: '01', meaning: 'Trace options' },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function ContextPropagation() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="propagation-context" aria-labelledby="propagation-context-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">Distributed context and context propagation</p>
            <h2 id="propagation-context-heading">A request keeps its identity when work crosses a boundary</h2>
            <p>Distributed context is the small set of metadata that accompanies an operation between processes. Context propagation is the mechanism that carries that metadata so the receiving service can connect new work to the journey already in progress.</p>
          </div>
        </div>

        <Card asChild className="propagation-flow-card">
          <article>
            <div className="propagation-flow-heading">
              <Route aria-hidden="true" />
              <div><p className="eyebrow">The propagation cycle</p><h3>Inject before sending, extract before continuing</h3></div>
            </div>
            <div className="context-flow" aria-label="Context moves from a caller to a receiving service">
              <div><strong>Current operation</strong><small>Trace and active span establish the starting context</small></div>
              <ArrowRight aria-hidden="true" />
              <div><strong>Inject</strong><small>Encode context into the transport carrier</small></div>
              <ArrowRight aria-hidden="true" />
              <div><strong>Cross boundary</strong><small>The request travels to another process</small></div>
              <ArrowRight aria-hidden="true" />
              <div><strong>Extract</strong><small>Read and validate the incoming context</small></div>
              <ArrowRight aria-hidden="true" />
              <div><strong>Continue</strong><small>Create a child span in the same trace</small></div>
            </div>
          </article>
        </Card>

        <div className="propagation-concepts propagation-concepts-primary">
          <article><Network aria-hidden="true" /><strong>Distributed context</strong><span>Trace identity, trace options, optional vendor state, and carefully chosen application baggage.</span></article>
          <article><PackageOpen aria-hidden="true" /><strong>Carrier</strong><span>The transport-owned container that moves context, such as HTTP headers or gRPC metadata.</span></article>
          <article><Boxes aria-hidden="true" /><strong>Continuity</strong><span>The receiver preserves the trace ID and uses the caller&apos;s span ID as the parent of its new server span.</span></article>
        </div>

        <div className="knowledge-callout propagation-boundary-callout">
          <CircleAlert aria-hidden="true" />
          <p><strong>Propagation does not move the span itself.</strong> It moves enough context for the next process to create a related span. If context is missing or invalid, the receiver starts a new trace and continuity is lost.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="propagation-w3c" aria-labelledby="propagation-w3c-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">W3C Trace Context</p>
            <h2 id="propagation-w3c-heading">A shared format lets different systems continue the same trace</h2>
            <p>W3C Trace Context defines interoperable fields for carrying trace identity across service boundaries. <strong>traceparent</strong> provides the common foundation; <strong>tracestate</strong> can accompany it with ordered, vendor-specific state.</p>
          </div>
        </div>

        <div className="w3c-lab propagation-w3c-grid">
          <Card asChild className="carrier-card traceparent-card">
            <article>
              <div className="propagation-carrier-heading"><Braces aria-hidden="true" /><div><p className="eyebrow">Required field</p><h3>traceparent</h3></div></div>
              <p>Provides a compact, vendor-neutral description of the trace and the immediate caller. Its four parts have fixed positions.</p>
              <div className="carrier-value" aria-label="Example traceparent value">00-4bf9...4736-00f0...567-01</div>
              <div className="traceparent-parts">
                {traceparentParts.map(part => (
                  <span key={part.label}><small>{part.label}</small><code>{part.value}</code><em>{part.meaning}</em></span>
                ))}
              </div>
            </article>
          </Card>

          <Card asChild className="carrier-card tracestate-card">
            <article>
              <div className="propagation-carrier-heading"><Tags aria-hidden="true" /><div><p className="eyebrow">Optional companion</p><h3>tracestate</h3></div></div>
              <p>Carries an ordered list of vendor-specific entries that may influence how participating systems process the trace.</p>
              <div className="carrier-value" aria-label="Example tracestate value">vendor-a=opaque-value, vendor-b=state</div>
              <ul className="propagation-principles">
                <li><CircleCheck aria-hidden="true" /><span>Complements traceparent; it does not replace trace identity.</span></li>
                <li><CircleCheck aria-hidden="true" /><span>Values are meaningful to their owners and opaque to other vendors.</span></li>
                <li><CircleCheck aria-hidden="true" /><span>Ordering matters: the entry matching the system that last updated traceparent moves to the left.</span></li>
              </ul>
            </article>
          </Card>
        </div>

        <div className="propagation-identity-strip" aria-label="Trace identity across a service boundary">
          <div><small>Caller span</small><strong>span 00f0...567</strong><span>trace 4bf9...4736</span></div>
          <ArrowRight aria-hidden="true" />
          <div><small>traceparent crosses boundary</small><strong>same trace ID</strong><span>caller span becomes parent</span></div>
          <ArrowRight aria-hidden="true" />
          <div><small>Receiver span</small><strong>new span 7a3c...910</strong><span>trace 4bf9...4736</span></div>
        </div>
      </section>

      <section className="fundamentals-section" id="propagation-transports" aria-labelledby="propagation-transports-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">HTTP propagation and gRPC propagation</p>
            <h2 id="propagation-transports-heading">The carrier changes; the propagation model stays the same</h2>
            <p>HTTP and gRPC expose different carrier APIs, but both transport the same logical fields. The sender injects context into the outgoing request, and the receiver extracts it before starting server-side work.</p>
          </div>
        </div>

        <div className="transport-grid propagation-transport-grid">
          <Card asChild className="transport-card propagation-transport-card">
            <article>
              <div><span className="propagation-transport-icon"><Globe2 aria-hidden="true" /></span><strong>HTTP propagation</strong></div>
              <p>W3C fields travel as request headers. Header names are case-insensitive, and intermediaries should preserve valid context as the request advances.</p>
              <dl><div><dt>Carrier</dt><dd>HTTP request headers</dd></div><div><dt>Boundary</dt><dd>Client request → server request</dd></div><div><dt>Result</dt><dd>Server span continues the trace</dd></div></dl>
            </article>
          </Card>
          <Card asChild className="transport-card propagation-transport-card">
            <article>
              <div><span className="propagation-transport-icon"><Network aria-hidden="true" /></span><strong>gRPC propagation</strong></div>
              <p>W3C fields travel as gRPC metadata. Text keys use lowercase names, while the receiving interceptor extracts context before invoking the operation.</p>
              <dl><div><dt>Carrier</dt><dd>gRPC metadata</dd></div><div><dt>Boundary</dt><dd>Client call → server call</dd></div><div><dt>Result</dt><dd>Server span continues the trace</dd></div></dl>
            </article>
          </Card>
        </div>

        <div className="propagation-concepts">
          <article><strong>Same semantics</strong><span>traceparent, tracestate, and baggage retain their roles regardless of transport.</span></article>
          <article><strong>New span per hop</strong><span>Each receiving service creates its own span; services do not share one span across the network.</span></article>
          <article><strong>Trust at the edge</strong><span>Incoming context should be validated because external callers can supply malformed or untrusted values.</span></article>
        </div>
      </section>

      <section className="fundamentals-section" id="propagation-baggage" aria-labelledby="propagation-baggage-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Baggage basics</p>
            <h2 id="propagation-baggage-heading">Application context can travel beside trace context</h2>
            <p>Baggage is a separate set of key–value properties that can propagate through a distributed operation. It can help downstream services make telemetry more meaningful, but it is not trace identity and is not automatically recorded on every span.</p>
          </div>
        </div>

        <Card asChild className="carrier-card baggage-card propagation-baggage-card">
          <article>
            <div className="propagation-carrier-heading"><Tags aria-hidden="true" /><div><p className="eyebrow">Small, bounded, non-sensitive</p><h3>Choose baggage deliberately</h3></div></div>
            <div className="baggage-chips" aria-label="Illustrative baggage keys">
              <code>tenant.tier=standard</code>
              <code>workflow=checkout</code>
              <code>region=ap-southeast</code>
            </div>
            <div className="propagation-baggage-guidance">
              <div><CircleCheck aria-hidden="true" /><p><strong>Good fit</strong><span>Stable, low-cardinality context that downstream participants genuinely need.</span></p></div>
              <div><CircleAlert aria-hidden="true" /><p><strong>Avoid</strong><span>Secrets, personal data, large values, and identifiers that grow without a practical bound.</span></p></div>
              <div><CircleCheck aria-hidden="true" /><p><strong>Remember</strong><span>Baggage propagates independently; copy selected values to span attributes only when useful and safe.</span></p></div>
            </div>
          </article>
        </Card>
      </section>
    </>
  );
}
