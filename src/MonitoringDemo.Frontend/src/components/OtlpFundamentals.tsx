import {
  ArrowRight,
  Cable,
  CircleCheck,
  CircleDot,
  Database,
  Globe2,
  Layers3,
  Network,
  RadioTower,
  Route,
  Send,
  ShieldCheck,
  Split,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['otlp-overview', 'OTLP'],
  ['otlp-grpc', 'OTLP/gRPC'],
  ['otlp-http', 'OTLP/HTTP'],
  ['otlp-endpoints', 'Endpoint configuration'],
] as const;

const deliveryLayers = [
  {
    icon: Database,
    eyebrow: 'Data model',
    title: 'Telemetry batches',
    description: 'Traces, metrics, and logs retain their OpenTelemetry structure as they move between nodes.',
  },
  {
    icon: Layers3,
    eyebrow: 'Encoding',
    title: 'Protocol Buffers',
    description: 'A shared schema gives senders and receivers a consistent representation of each signal.',
  },
  {
    icon: Cable,
    eyebrow: 'Transport',
    title: 'gRPC or HTTP',
    description: 'Two transport bindings carry the same telemetry model through different network mechanisms.',
  },
  {
    icon: CircleCheck,
    eyebrow: 'Delivery response',
    title: 'Accepted or retryable',
    description: 'Each exchange returns a response so the sender can distinguish acceptance from backpressure or failure.',
  },
] as const;

const httpSignals = [
  { signal: 'Traces', path: '/v1/traces', tone: 'trace' },
  { signal: 'Metrics', path: '/v1/metrics', tone: 'metric' },
  { signal: 'Logs', path: '/v1/logs', tone: 'log' },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function OtlpFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="otlp-overview" aria-labelledby="otlp-overview-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">OpenTelemetry Protocol</p>
            <h2 id="otlp-overview-heading">One delivery contract for telemetry in motion</h2>
            <p>OTLP defines how OpenTelemetry data is encoded, transported, and acknowledged between a telemetry source and a receiver. It lets applications, Collectors, and backends exchange signals without inventing a different wire format for every connection.</p>
          </div>
        </div>

        <Card asChild className="otlp-route-card">
          <article>
            <div className="otlp-route-heading">
              <RadioTower aria-hidden="true" />
              <div><p className="eyebrow">A hop-by-hop protocol</p><h3>OTLP connects senders and receivers</h3></div>
            </div>
            <div className="otlp-route" aria-label="Telemetry moves from an instrumented application through a Collector to an observability backend">
              <div><small>Source</small><strong>Instrumented service</strong><span>Creates telemetry</span></div>
              <span><Send aria-hidden="true" />OTLP</span>
              <div className="collector"><small>Intermediate node</small><strong>Collector</strong><span>Receives, processes, exports</span></div>
              <span><Send aria-hidden="true" />OTLP</span>
              <div><small>Destination</small><strong>Observability backend</strong><span>Stores and analyzes</span></div>
            </div>
          </article>
        </Card>

        <div className="otlp-layer-grid">
          {deliveryLayers.map(({ icon: Icon, eyebrow, title, description }) => (
            <article key={title}>
              <span aria-hidden="true"><Icon /></span>
              <p className="eyebrow">{eyebrow}</p>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>

        <div className="knowledge-callout otlp-context-callout">
          <Split aria-hidden="true" />
          <p><strong>OTLP is not context propagation.</strong> Propagation carries a small trace context with a live request. OTLP exports completed telemetry records through a separate delivery path.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="otlp-grpc" aria-labelledby="otlp-grpc-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">OTLP/gRPC</p>
            <h2 id="otlp-grpc-heading">Signal services share one gRPC destination</h2>
            <p>OTLP/gRPC sends Protocol Buffer messages through unary gRPC export calls. Traces, metrics, and logs use separate service methods while sharing the same connection target and transport behavior.</p>
          </div>
        </div>

        <div className="otlp-transport-layout">
          <Card asChild className="otlp-transport-card grpc">
            <article>
              <div className="otlp-transport-title"><span aria-hidden="true"><Network /></span><div><p className="eyebrow">Binary RPC transport</p><h3>gRPC binding</h3></div></div>
              <dl>
                <div><dt>Payload</dt><dd>Binary Protocol Buffers</dd></div>
                <div><dt>Signal routing</dt><dd>Dedicated export service methods</dd></div>
                <div><dt>Default port</dt><dd>4317</dd></div>
                <div><dt>Connection</dt><dd>Typically persistent and HTTP/2 based</dd></div>
              </dl>
            </article>
          </Card>

          <div className="otlp-service-stack" aria-label="Separate OTLP gRPC services for traces, metrics, and logs">
            <div><CircleDot aria-hidden="true" /><span><small>Trace service</small><strong>Export spans</strong></span></div>
            <div><CircleDot aria-hidden="true" /><span><small>Metrics service</small><strong>Export metric data</strong></span></div>
            <div><CircleDot aria-hidden="true" /><span><small>Logs service</small><strong>Export log records</strong></span></div>
          </div>
        </div>

        <div className="otlp-guidance-strip">
          <article><strong>Why choose it?</strong><span>Efficient binary messaging and established gRPC tooling make it a natural fit where gRPC is already supported.</span></article>
          <article><strong>What must align?</strong><span>The sender and receiver must agree on OTLP/gRPC; an HTTP endpoint is not interchangeable just because the data model is the same.</span></article>
          <article><strong>What is the endpoint?</strong><span>A gRPC target identifies the receiving host and port. It does not use the OTLP/HTTP signal paths.</span></article>
        </div>
      </section>

      <section className="fundamentals-section" id="otlp-http" aria-labelledby="otlp-http-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">OTLP/HTTP</p>
            <h2 id="otlp-http-heading">Signal-specific paths make the destination explicit</h2>
            <p>OTLP/HTTP sends export requests with HTTP POST. It can carry the shared Protocol Buffer schema as binary Protobuf or as JSON, and it works over HTTP/1.1 or HTTP/2.</p>
          </div>
        </div>

        <Card asChild className="otlp-http-card">
          <article>
            <div className="otlp-transport-title"><span aria-hidden="true"><Globe2 /></span><div><p className="eyebrow">HTTP request model</p><h3>One path per stable signal</h3></div></div>
            <div className="otlp-http-paths">
              {httpSignals.map(signal => (
                <div className={signal.tone} key={signal.signal}>
                  <small>{signal.signal}</small>
                  <strong>{signal.path}</strong>
                  <span>HTTP POST</span>
                </div>
              ))}
            </div>
            <div className="otlp-http-facts">
              <span><strong>4318</strong><small>default port</small></span>
              <span><strong>Protobuf</strong><small>binary or JSON encoding</small></span>
              <span><strong>HTTP</strong><small>familiar proxy and gateway path</small></span>
            </div>
          </article>
        </Card>

        <div className="knowledge-callout otlp-http-callout">
          <Route aria-hidden="true" />
          <p><strong>The path is part of OTLP/HTTP routing.</strong> A request can reach the correct host and port yet still fail if its signal path does not match what the receiver exposes.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="otlp-endpoints" aria-labelledby="otlp-endpoints-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Endpoint configuration</p>
            <h2 id="otlp-endpoints-heading">Choose the protocol first, then resolve where each signal goes</h2>
            <p>An endpoint is more than a hostname. The selected transport determines how the address is interpreted, while security, authentication, and per-signal overrides determine whether the sender can actually deliver telemetry.</p>
          </div>
        </div>

        <div className="otlp-endpoint-grid">
          <Card asChild className="otlp-endpoint-card">
            <article>
              <div className="otlp-endpoint-title"><Route aria-hidden="true" /><div><p className="eyebrow">Shared destination</p><h3>Base endpoint</h3></div></div>
              <p>Use one common destination when all signals go to the same receiver. For OTLP/HTTP, exporters derive the standard trace, metric, and log paths from that base.</p>
              <div className="otlp-endpoint-flow"><span>Base address</span><ArrowRight aria-hidden="true" /><strong>derive signal destination</strong></div>
            </article>
          </Card>
          <Card asChild className="otlp-endpoint-card override">
            <article>
              <div className="otlp-endpoint-title"><Split aria-hidden="true" /><div><p className="eyebrow">Selective routing</p><h3>Per-signal endpoint</h3></div></div>
              <p>Use an override when one signal needs a different receiver or route. The signal-specific value takes precedence; for OTLP/HTTP, its path is used as supplied.</p>
              <div className="otlp-endpoint-flow"><span>Signal override</span><ArrowRight aria-hidden="true" /><strong>use exact destination</strong></div>
            </article>
          </Card>
        </div>

        <div className="otlp-endpoint-checks">
          <article><Network aria-hidden="true" /><p><strong>Protocol</strong><span>gRPC and HTTP are different receiver bindings, not alternate spellings of one endpoint.</span></p></article>
          <article><Route aria-hidden="true" /><p><strong>Address shape</strong><span>gRPC uses a target; HTTP uses a URL whose path identifies the signal.</span></p></article>
          <article><ShieldCheck aria-hidden="true" /><p><strong>Trust and access</strong><span>TLS expectations, credentials, and request metadata must match the receiver.</span></p></article>
          <article><Cable aria-hidden="true" /><p><strong>Network reachability</strong><span>The configured host and port must be reachable from the exporting process, not only from an operator&apos;s machine.</span></p></article>
        </div>

        <div className="otlp-decision-line" aria-label="Endpoint configuration decision sequence">
          <span><small>1</small><strong>Pick transport</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><small>2</small><strong>Resolve destination</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><small>3</small><strong>Apply signal overrides</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><small>4</small><strong>Verify trust and reachability</strong></span>
        </div>
      </section>
    </>
  );
}
