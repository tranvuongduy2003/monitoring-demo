import {
  ArrowRight,
  BellRing,
  CircleDot,
  Clock3,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  Search,
  SlidersHorizontal,
  Table2,
  Tags,
  Timer,
  Workflow,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['grafana-data-sources', 'Data sources'],
  ['grafana-dashboards', 'Dashboards'],
  ['grafana-panels', 'Panels'],
  ['grafana-queries', 'Queries'],
  ['grafana-variables', 'Variables'],
  ['grafana-explore', 'Explore'],
  ['grafana-annotations', 'Annotations'],
  ['grafana-alerting', 'Alerting'],
] as const;

const dataSources = [
  {
    icon: Gauge,
    signal: 'Metrics',
    source: 'Prometheus',
    description: 'Numeric time series for rates, saturation, latency, and other measurements.',
    tone: 'metric',
  },
  {
    icon: FileText,
    signal: 'Logs',
    source: 'Loki',
    description: 'Timestamped records for events, errors, and the context around a change.',
    tone: 'log',
  },
  {
    icon: Workflow,
    signal: 'Traces',
    source: 'Tempo',
    description: 'End-to-end request paths for locating slow spans and failing dependencies.',
    tone: 'trace',
  },
] as const;

const panelLayers = [
  ['Question', 'What should the reader understand?'],
  ['Data', 'Which query returns the needed evidence?'],
  ['Visual', 'Which form makes the pattern easiest to see?'],
  ['Meaning', 'Which units, labels, thresholds, and links explain it?'],
] as const;

const variableTypes = [
  ['Query', 'Values discovered from a data source, such as services or regions.'],
  ['Custom', 'A maintained set of meaningful choices for the dashboard.'],
  ['Data source', 'A controlled way to switch among compatible backends.'],
  ['Interval', 'A reusable time grouping that can adapt to the selected range.'],
] as const;

const alertStates = [
  ['Normal', 'The condition is not met.'],
  ['Pending', 'The condition is met, but the required duration has not elapsed.'],
  ['Alerting', 'The condition has remained true long enough to fire.'],
  ['No data', 'The evaluation returned no usable series or rows.'],
  ['Error', 'Grafana could not complete the evaluation.'],
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function GrafanaFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="grafana-data-sources" aria-labelledby="grafana-data-sources-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">Data sources</p>
            <h2 id="grafana-data-sources-heading">Grafana asks other systems for evidence</h2>
            <p>A data source is the connection and query capability Grafana uses to reach an observability backend. Grafana presents the results; the source remains responsible for storing and searching its own data.</p>
          </div>
        </div>

        <Card asChild className="grafana-connection-card">
          <article>
            <div className="grafana-connection-flow" aria-label="A dashboard sends a query through a data source to a backend and receives results">
              <span><LayoutDashboard aria-hidden="true" /><small>View</small><strong>Dashboard or Explore</strong></span>
              <ArrowRight aria-hidden="true" />
              <span className="source"><Database aria-hidden="true" /><small>Connection</small><strong>Data source</strong></span>
              <ArrowRight aria-hidden="true" />
              <span><Search aria-hidden="true" /><small>System of record</small><strong>Observability backend</strong></span>
            </div>
            <p><strong>The boundary matters:</strong> adding a data source does not copy the backend into Grafana. It gives Grafana a way to send source-specific queries and interpret the results.</p>
          </article>
        </Card>

        <div className="grafana-source-grid">
          {dataSources.map(({ icon: Icon, signal, source, description, tone }) => (
            <Card asChild className={`grafana-source-card ${tone}`} key={signal}>
              <article>
                <span aria-hidden="true"><Icon /></span>
                <div><p className="eyebrow">{signal}</p><h3>{source}</h3></div>
                <p>{description}</p>
              </article>
            </Card>
          ))}
        </div>

        <div className="knowledge-callout grafana-callout">
          <CircleDot aria-hidden="true" />
          <p><strong>A panel can use more than one query, and a dashboard can use more than one data source.</strong> The important constraint is that each query is understood by the source it targets.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="grafana-dashboards" aria-labelledby="grafana-dashboards-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Dashboards</p>
            <h2 id="grafana-dashboards-heading">A dashboard is a shared view of a question</h2>
            <p>Dashboards arrange panels, variables, links, annotations, and a common time range into one reading experience. A useful dashboard has a clear audience and decision, not merely a dense collection of charts.</p>
          </div>
        </div>

        <Card asChild className="grafana-dashboard-anatomy">
          <article>
            <header>
              <div><LayoutDashboard aria-hidden="true" /><strong>Service health</strong></div>
              <div className="grafana-dashboard-controls"><span><Tags aria-hidden="true" />Service</span><span><Clock3 aria-hidden="true" />Time range</span><span><Timer aria-hidden="true" />Refresh</span></div>
            </header>
            <div className="grafana-dashboard-canvas" aria-label="Conceptual dashboard with overview, trend, and detail panels">
              <div className="wide"><small>Overview</small><strong>Is the service healthy?</strong><i /></div>
              <div><small>Trend</small><strong>What changed?</strong><i /></div>
              <div><small>Breakdown</small><strong>Where is it happening?</strong><i /></div>
              <div className="wide"><small>Detail</small><strong>Which evidence explains the change?</strong><i /></div>
            </div>
          </article>
        </Card>

        <div className="grafana-principle-grid">
          <article><strong>Lead with purpose</strong><span>Name the audience, the decision, and the important time horizon.</span></article>
          <article><strong>Create a reading order</strong><span>Move from overview to trend, breakdown, and supporting detail.</span></article>
          <article><strong>Keep context visible</strong><span>Make filters, units, time range, and data freshness easy to understand.</span></article>
        </div>
      </section>

      <section className="fundamentals-section" id="grafana-panels" aria-labelledby="grafana-panels-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">Panels</p>
            <h2 id="grafana-panels-heading">A panel turns query results into a readable claim</h2>
            <p>A panel combines one or more queries with transformations, a visualization, field options, units, thresholds, and links. The chart type is only the visible layer of a larger meaning-making process.</p>
          </div>
        </div>

        <div className="grafana-panel-layout">
          <Card asChild className="grafana-panel-preview-card">
            <article>
              <div className="grafana-panel-preview-heading"><Gauge aria-hidden="true" /><div><p className="eyebrow">Panel preview</p><h3>Latency over time</h3></div><span>milliseconds</span></div>
              <div className="grafana-panel-chart" aria-label="Conceptual time series with a threshold">
                <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><b>threshold</b>
              </div>
              <div className="grafana-panel-legend"><span>Typical latency</span><span className="threshold">Attention threshold</span></div>
            </article>
          </Card>

          <div className="grafana-panel-layers">
            {panelLayers.map(([label, description], index) => (
              <article key={label}><span>{String(index + 1).padStart(2, '0')}</span><p><strong>{label}</strong><small>{description}</small></p></article>
            ))}
          </div>
        </div>

        <div className="knowledge-callout grafana-callout">
          <Table2 aria-hidden="true" />
          <p><strong>Choose the visualization from the comparison task.</strong> Time series reveal change, statistics emphasize a current value, tables preserve exact detail, and distributions show spread.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="grafana-queries" aria-labelledby="grafana-queries-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Queries</p>
            <h2 id="grafana-queries-heading">A query translates an operational question into data</h2>
            <p>Grafana sends each query to its selected data source. The source-specific language decides what to filter, aggregate, group, and return; Grafana then works with the resulting frames of fields and values.</p>
          </div>
        </div>

        <div className="grafana-query-flow" aria-label="A question becomes a data source query, results, and a visual explanation">
          <article><span><Search aria-hidden="true" /></span><small>Intent</small><strong>Ask a focused question</strong><p>Define the population, measure, grouping, and time window.</p></article>
          <ArrowRight aria-hidden="true" />
          <article><span><Database aria-hidden="true" /></span><small>Retrieval</small><strong>Run a source query</strong><p>Use the language and capabilities of the chosen backend.</p></article>
          <ArrowRight aria-hidden="true" />
          <article><span><SlidersHorizontal aria-hidden="true" /></span><small>Shaping</small><strong>Organize the result</strong><p>Join, reduce, rename, or calculate only when it clarifies meaning.</p></article>
          <ArrowRight aria-hidden="true" />
          <article><span><Gauge aria-hidden="true" /></span><small>Explanation</small><strong>Present the answer</strong><p>Choose a visual form, unit, legend, and threshold the reader can interpret.</p></article>
        </div>

        <div className="grafana-query-notes">
          <article><strong>Time range is part of the query context</strong><span>The same expression can return a different answer when the selected period or resolution changes.</span></article>
          <article><strong>Aggregation changes meaning</strong><span>A total, average, percentile, and per-service breakdown answer different questions even when they begin with the same records.</span></article>
        </div>
      </section>

      <section className="fundamentals-section" id="grafana-variables" aria-labelledby="grafana-variables-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">05</span>
          <div>
            <p className="eyebrow">Variables</p>
            <h2 id="grafana-variables-heading">Variables make one dashboard reusable without hiding its context</h2>
            <p>A variable provides a named choice that queries, titles, links, and repetitions can reuse. It lets readers change scope while keeping the dashboard&apos;s structure and intent stable.</p>
          </div>
        </div>

        <Card asChild className="grafana-variable-card">
          <article>
            <div className="grafana-variable-toolbar" aria-label="Example dashboard variables">
              <span><small>Environment</small><strong>Production</strong></span>
              <ArrowRight aria-hidden="true" />
              <span><small>Service</small><strong>Checkout</strong></span>
              <ArrowRight aria-hidden="true" />
              <span><small>Instance</small><strong>All matching</strong></span>
            </div>
            <p><strong>Cascading variables</strong> narrow later choices using earlier selections. This creates a guided path from broad context to a specific slice of the system.</p>
          </article>
        </Card>

        <div className="grafana-variable-grid">
          {variableTypes.map(([label, description]) => (
            <article key={label}><Tags aria-hidden="true" /><p><strong>{label}</strong><span>{description}</span></p></article>
          ))}
        </div>

        <div className="knowledge-callout grafana-callout warning">
          <SlidersHorizontal aria-hidden="true" />
          <p><strong>Refresh behavior is a design choice.</strong> Recalculate values when their dependencies or time context change, but avoid unnecessary work that makes every dashboard interaction expensive.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="grafana-explore" aria-labelledby="grafana-explore-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">06</span>
          <div>
            <p className="eyebrow">Explore</p>
            <h2 id="grafana-explore-heading">Explore is a workspace for questions that are still changing</h2>
            <p>Dashboards preserve a curated view. Explore supports ad hoc investigation: adjust a query, inspect raw results, compare evidence, change the time range, and follow links between signals before deciding what deserves a lasting panel.</p>
          </div>
        </div>

        <div className="grafana-explore-comparison">
          <Card asChild className="grafana-explore-card dashboard">
            <article><span><LayoutDashboard aria-hidden="true" /></span><div><p className="eyebrow">Dashboard</p><h3>Repeatable understanding</h3></div><ul><li>Known audience and reading order</li><li>Stable questions and shared context</li><li>Useful for recurring monitoring</li></ul></article>
          </Card>
          <div className="grafana-explore-bridge"><ArrowRight aria-hidden="true" /><span>Open a clue</span></div>
          <Card asChild className="grafana-explore-card explore">
            <article><span><Search aria-hidden="true" /></span><div><p className="eyebrow">Explore</p><h3>Flexible investigation</h3></div><ul><li>Questions can evolve quickly</li><li>Raw and visual results sit together</li><li>Useful for unfamiliar incidents</li></ul></article>
          </Card>
        </div>

        <div className="grafana-investigation-path" aria-label="An investigation moves from a metric to logs and then to a trace">
          <span><Gauge aria-hidden="true" /><small>Metric</small><strong>Notice the symptom</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><FileText aria-hidden="true" /><small>Logs</small><strong>Find relevant events</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><Workflow aria-hidden="true" /><small>Trace</small><strong>Follow the request path</strong></span>
        </div>
      </section>

      <section className="fundamentals-section" id="grafana-annotations" aria-labelledby="grafana-annotations-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">07</span>
          <div>
            <p className="eyebrow">Annotations</p>
            <h2 id="grafana-annotations-heading">Annotations place events beside the behavior they may explain</h2>
            <p>An annotation is a timestamped note shown on a visualization. Deployments, configuration changes, incidents, and business events become shared context for interpreting a change in telemetry.</p>
          </div>
        </div>

        <Card asChild className="grafana-annotation-card">
          <article>
            <div className="grafana-annotation-chart" aria-label="A metric trend with deployment and incident annotations">
              <div className="grafana-annotation-line"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <span className="deploy"><b>Deployment</b><small>new version</small></span>
              <span className="incident"><b>Incident</b><small>customer impact</small></span>
            </div>
            <div className="grafana-annotation-lesson"><Clock3 aria-hidden="true" /><p><strong>Annotations show coincidence, not causation.</strong><span>They make a hypothesis visible—then queries, logs, and traces must test whether the event actually explains the observed change.</span></p></div>
          </article>
        </Card>

        <div className="grafana-annotation-sources">
          <article><strong>Manual</strong><span>A person records an important event during an investigation.</span></article>
          <article><strong>Queried</strong><span>Grafana retrieves matching events from a data source for the visible time range.</span></article>
          <article><strong>Linked</strong><span>Tags, descriptions, and links connect the marker to richer context.</span></article>
        </div>
      </section>

      <section className="fundamentals-section" id="grafana-alerting" aria-labelledby="grafana-alerting-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">08</span>
          <div>
            <p className="eyebrow">Grafana Alerting basics</p>
            <h2 id="grafana-alerting-heading">Alerting evaluates conditions and routes meaningful notifications</h2>
            <p>An alert rule runs on a schedule, evaluates query results, and tracks state over time. Routing policy then groups and sends alert instances to the appropriate contact point.</p>
          </div>
        </div>

        <div className="grafana-alert-flow-basic" aria-label="An alert moves from query and condition through state to notification routing">
          <article><span><Database aria-hidden="true" /></span><small>Evidence</small><strong>Query</strong><p>Retrieve the signal needed for evaluation.</p></article>
          <ArrowRight aria-hidden="true" />
          <article><span><SlidersHorizontal aria-hidden="true" /></span><small>Decision</small><strong>Condition</strong><p>Reduce the result and test a meaningful boundary.</p></article>
          <ArrowRight aria-hidden="true" />
          <article><span><Timer aria-hidden="true" /></span><small>Stability</small><strong>Pending period</strong><p>Require persistence so brief noise does not fire immediately.</p></article>
          <ArrowRight aria-hidden="true" />
          <article><span><BellRing aria-hidden="true" /></span><small>Delivery</small><strong>Routing</strong><p>Group, silence, and send to the correct contact point.</p></article>
        </div>

        <Card className="grafana-alert-state-card">
          <div className="grafana-alert-state-heading"><BellRing aria-hidden="true" /><div><p className="eyebrow">State model</p><h3>Every evaluation has an outcome</h3></div></div>
          <div className="grafana-alert-states">
            {alertStates.map(([state, description]) => <article className={state.toLowerCase().replace(' ', '-')} key={state}><strong>{state}</strong><span>{description}</span></article>)}
          </div>
        </Card>

        <div className="grafana-alert-metadata">
          <article><Tags aria-hidden="true" /><p><strong>Labels identify and route</strong><span>Stable dimensions such as service, team, and severity define each alert instance and help policy select its destination.</span></p></article>
          <article><FileText aria-hidden="true" /><p><strong>Annotations explain and guide</strong><span>Summaries, descriptions, and runbook links add human context without changing alert identity.</span></p></article>
        </div>

        <div className="knowledge-callout grafana-callout">
          <CircleDot aria-hidden="true" />
          <p><strong>A good alert is actionable.</strong> It represents a condition someone owns, includes enough context to begin investigating, and avoids treating every unusual value as an emergency.</p>
        </div>
      </section>
    </>
  );
}
