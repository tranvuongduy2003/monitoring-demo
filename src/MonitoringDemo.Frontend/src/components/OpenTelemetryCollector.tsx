import {
  ArrowRight,
  Boxes,
  Braces,
  CircleCheck,
  Clock3,
  Database,
  Gauge,
  HardDrive,
  Inbox,
  Layers3,
  MemoryStick,
  Network,
  PackageCheck,
  RadioTower,
  Route,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['collector-architecture', 'Architecture'],
  ['collector-receivers', 'Receivers'],
  ['collector-processors', 'Processors'],
  ['collector-exporters', 'Exporters'],
  ['collector-pipelines', 'Pipelines'],
] as const;

const processorQuestions = [
  {
    icon: ShieldAlert,
    title: 'Protect the process',
    description: 'The memory limiter reacts to memory pressure before the Collector becomes unstable.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Shape the data',
    description: 'Other processors can enrich, filter, transform, sample, or route telemetry.',
  },
  {
    icon: PackageCheck,
    title: 'Prepare delivery',
    description: 'The batch processor groups records so exporters can make fewer, larger requests.',
  },
] as const;

const signalPipelines = [
  { signal: 'Traces', description: 'Spans and their relationships', className: 'trace' },
  { signal: 'Metrics', description: 'Metric data points and series', className: 'metric' },
  { signal: 'Logs', description: 'Log records and event context', className: 'log' },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function OpenTelemetryCollector() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="collector-architecture" aria-labelledby="collector-architecture-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">Collector architecture</p>
            <h2 id="collector-architecture-heading">A programmable relay between telemetry producers and destinations</h2>
            <p>The OpenTelemetry Collector is a vendor-neutral service that receives telemetry, applies ordered processing, and exports the result. It keeps routing and delivery policy outside the applications that create the data.</p>
          </div>
        </div>

        <Card asChild className="collector-architecture-card">
          <article>
            <div className="collector-architecture-heading">
              <Workflow aria-hidden="true" />
              <div><p className="eyebrow">The three-stage path</p><h3>Accept, shape, deliver</h3></div>
            </div>
            <div className="collector-architecture-flow" aria-label="Telemetry sources send data through Collector receivers, processors, and exporters to observability backends">
              <div className="collector-edge-node"><small>Producers</small><strong>Apps · agents · peers</strong><span>Create or forward telemetry</span></div>
              <ArrowRight aria-hidden="true" />
              <div className="collector-core">
                <small>OpenTelemetry Collector</small>
                <div><span><Inbox aria-hidden="true" /><strong>Receivers</strong><small>Accept</small></span><ArrowRight aria-hidden="true" /><span><SlidersHorizontal aria-hidden="true" /><strong>Processors</strong><small>Shape</small></span><ArrowRight aria-hidden="true" /><span><Send aria-hidden="true" /><strong>Exporters</strong><small>Deliver</small></span></div>
              </div>
              <ArrowRight aria-hidden="true" />
              <div className="collector-edge-node"><small>Destinations</small><strong>Backends · peers</strong><span>Store, analyze, or relay</span></div>
            </div>
          </article>
        </Card>

        <div className="collector-architecture-principles">
          <article><Route aria-hidden="true" /><p><strong>Policy belongs in the path</strong><span>Applications describe their work; the Collector decides how telemetry moves onward.</span></p></article>
          <article><Boxes aria-hidden="true" /><p><strong>Components are building blocks</strong><span>Receivers, processors, and exporters become useful when a pipeline connects them.</span></p></article>
          <article><Network aria-hidden="true" /><p><strong>Topology stays flexible</strong><span>A Collector can run near a workload, as a shared gateway, or in both roles.</span></p></article>
        </div>

        <div className="knowledge-callout collector-architecture-callout">
          <CircleCheck aria-hidden="true" />
          <p><strong>The Collector is not a telemetry database.</strong> It is built to move and shape data in flight; durable storage and analysis remain the responsibility of downstream systems.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="collector-receivers" aria-labelledby="collector-receivers-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Receivers</p>
            <h2 id="collector-receivers-heading">Receivers define how telemetry enters</h2>
            <p>A receiver listens, scrapes, or otherwise accepts data from a source and translates it into the Collector&apos;s internal signal model. Each receiver supports particular protocols and signal types.</p>
          </div>
        </div>

        <div className="collector-receiver-grid">
          <Card asChild className="collector-role-card">
            <article>
              <div className="collector-role-title"><span><Inbox aria-hidden="true" /></span><div><p className="eyebrow">Ingress role</p><h3>Receiver</h3></div></div>
              <p>A receiver answers three questions: which protocol arrives, where it arrives, and which telemetry signals it can produce for a pipeline.</p>
              <dl>
                <div><dt>Faces</dt><dd>Telemetry producers</dd></div>
                <div><dt>Does</dt><dd>Accepts and decodes data</dd></div>
                <div><dt>Does not</dt><dd>Choose the final destination</dd></div>
              </dl>
            </article>
          </Card>

          <Card asChild className="collector-otlp-receiver-card">
            <article>
              <div className="collector-role-title"><span><RadioTower aria-hidden="true" /></span><div><p className="eyebrow">Core receiver</p><h3>OTLP Receiver</h3></div></div>
              <p>The OTLP Receiver accepts native OpenTelemetry data over either OTLP/gRPC or OTLP/HTTP. It can feed traces, metrics, and logs into their matching pipelines.</p>
              <div className="collector-otlp-transports">
                <span><Network aria-hidden="true" /><small>OTLP/gRPC</small><strong>Binary RPC ingress</strong></span>
                <span><Braces aria-hidden="true" /><small>OTLP/HTTP</small><strong>Signal-specific HTTP ingress</strong></span>
              </div>
            </article>
          </Card>
        </div>

        <div className="collector-boundary-strip">
          <span><strong>Protocol boundary</strong><small>The sender and receiver must agree on a transport.</small></span>
          <ArrowRight aria-hidden="true" />
          <span><strong>Signal boundary</strong><small>Only enabled signal pipelines can consume the accepted data.</small></span>
          <ArrowRight aria-hidden="true" />
          <span><strong>Pipeline boundary</strong><small>Declaring a receiver alone does not make it active.</small></span>
        </div>
      </section>

      <section className="fundamentals-section" id="collector-processors" aria-labelledby="collector-processors-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">Processors</p>
            <h2 id="collector-processors-heading">Processors apply policy in a deliberate order</h2>
            <p>Processors sit between reception and export. Because each one receives the output of the previous one, their order expresses operational intent rather than a simple inventory.</p>
          </div>
        </div>

        <div className="collector-processor-sequence" aria-label="Typical processor sequence: protect memory, shape telemetry, then batch for delivery">
          {processorQuestions.map(({ icon: Icon, title, description }, index) => (
            <div className="collector-processor-step" key={title}>
              <article><span><Icon aria-hidden="true" /></span><small>Step {index + 1}</small><strong>{title}</strong><p>{description}</p></article>
              {index < processorQuestions.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
            </div>
          ))}
        </div>

        <div className="collector-feature-grid">
          <Card asChild className="collector-feature-card memory">
            <article>
              <div className="collector-feature-title"><span><MemoryStick aria-hidden="true" /></span><div><p className="eyebrow">Memory Limiter</p><h3>Preserve stability under pressure</h3></div></div>
              <p>The memory limiter watches the Collector&apos;s memory use and applies backpressure when configured limits are crossed. Its job is to prevent sustained overload from becoming an out-of-memory failure.</p>
              <ul>
                <li><Gauge aria-hidden="true" /><span><strong>Soft pressure</strong> starts refusing new data so retry-capable senders can slow down.</span></li>
                <li><ShieldAlert aria-hidden="true" /><span><strong>Hard pressure</strong> can trigger more aggressive memory recovery.</span></li>
                <li><Route aria-hidden="true" /><span><strong>Early placement</strong> protects the rest of the processor chain from excess load.</span></li>
              </ul>
              <div><strong>Tradeoff</strong><span>Backpressure only protects data when upstream components can retry; otherwise refused telemetry may be lost.</span></div>
            </article>
          </Card>

          <Card asChild className="collector-feature-card batch">
            <article>
              <div className="collector-feature-title"><span><PackageCheck aria-hidden="true" /></span><div><p className="eyebrow">Batch Processor</p><h3>Amortize the cost of export</h3></div></div>
              <p>The batch processor groups telemetry before handing it to an exporter. Batches are normally released when they reach a target size or when a timeout expires.</p>
              <ul>
                <li><Layers3 aria-hidden="true" /><span><strong>Request efficiency</strong> improves because many records share one export operation.</span></li>
                <li><Clock3 aria-hidden="true" /><span><strong>Bounded waiting</strong> ensures low traffic does not remain buffered forever.</span></li>
                <li><HardDrive aria-hidden="true" /><span><strong>Buffered data</strong> consumes memory while it waits for delivery.</span></li>
              </ul>
              <div><strong>Tradeoff</strong><span>Larger batches reduce request overhead but can increase memory use and delivery latency.</span></div>
            </article>
          </Card>
        </div>
      </section>

      <section className="fundamentals-section" id="collector-exporters" aria-labelledby="collector-exporters-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Exporters</p>
            <h2 id="collector-exporters-heading">Exporters adapt pipeline output to its destination</h2>
            <p>An exporter encodes and sends telemetry to another system. It owns the destination-facing protocol, connection, and delivery behavior—not the meaning of the telemetry itself.</p>
          </div>
        </div>

        <Card asChild className="collector-export-card">
          <article>
            <div className="collector-export-heading"><Send aria-hidden="true" /><div><p className="eyebrow">Egress role</p><h3>One internal model, different destination contracts</h3></div></div>
            <div className="collector-export-destinations">
              <span><RadioTower aria-hidden="true" /><small>Collector or backend</small><strong>OTLP exporter</strong></span>
              <span><Database aria-hidden="true" /><small>Storage system</small><strong>Backend-specific exporter</strong></span>
              <span><Network aria-hidden="true" /><small>Another tier</small><strong>Gateway or relay</strong></span>
            </div>
          </article>
        </Card>

        <div className="collector-export-facts">
          <article><strong>Destination</strong><span>Where should this signal go?</span></article>
          <article><strong>Protocol</strong><span>How does that destination accept it?</span></article>
          <article><strong>Trust</strong><span>Which credentials and transport security apply?</span></article>
          <article><strong>Delivery</strong><span>How are timeouts, retries, and backpressure handled?</span></article>
        </div>

        <div className="knowledge-callout collector-export-callout">
          <Route aria-hidden="true" />
          <p><strong>An exporter is not automatically active.</strong> It sends data only when at least one enabled pipeline references it, and it receives only the signals carried by those pipelines.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="collector-pipelines" aria-labelledby="collector-pipelines-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">05</span>
          <div>
            <p className="eyebrow">Pipelines</p>
            <h2 id="collector-pipelines-heading">Pipelines turn components into a running data path</h2>
            <p>A pipeline is a signal-specific ordered path from one or more receivers, through zero or more processors, to one or more exporters. It is the composition—not the component list—that defines actual behavior.</p>
          </div>
        </div>

        <div className="collector-pipeline-list">
          {signalPipelines.map(({ signal, description, className }) => (
            <article className={className} key={signal}>
              <span><small>{signal} pipeline</small><strong>{description}</strong></span>
              <div><span><Inbox aria-hidden="true" />Receive</span><ArrowRight aria-hidden="true" /><span><SlidersHorizontal aria-hidden="true" />Process in order</span><ArrowRight aria-hidden="true" /><span><Send aria-hidden="true" />Export</span></div>
            </article>
          ))}
        </div>

        <div className="collector-pipeline-rules">
          <Card asChild><article><span>01</span><div><h3>Signals stay explicit</h3><p>A traces pipeline handles traces; a metrics pipeline handles metrics; a logs pipeline handles logs.</p></div></article></Card>
          <Card asChild><article><span>02</span><div><h3>Order changes outcomes</h3><p>Processors run in the listed order, so filtering before enrichment is not equivalent to filtering after it.</p></div></article></Card>
          <Card asChild><article><span>03</span><div><h3>Reuse is intentional</h3><p>One component instance can participate in multiple compatible pipelines and serve shared policy.</p></div></article></Card>
          <Card asChild><article><span>04</span><div><h3>Fan-in and fan-out are normal</h3><p>Several receivers can feed one pipeline, while several exporters can send its result to different destinations.</p></div></article></Card>
        </div>

        <div className="collector-mental-model">
          <Workflow aria-hidden="true" />
          <p><strong>Read every pipeline as a sentence:</strong> accept this signal from these sources, apply these policies in this order, then deliver the result to these destinations.</p>
        </div>
      </section>
    </>
  );
}
