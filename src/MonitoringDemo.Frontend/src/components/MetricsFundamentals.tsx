import {
  Activity,
  ChartNoAxesCombined,
  ChartSpline,
  Gauge,
  Hash,
  Layers3,
  Percent,
  Sigma,
  Tags,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['metrics-anatomy', 'Time series'],
  ['metrics-types', 'Metric types'],
  ['metrics-distributions', 'Distributions'],
  ['metrics-cardinality', 'Cardinality'],
] as const;

const metricTypes = [
  {
    icon: TrendingUp,
    title: 'Counter',
    description: 'A cumulative total that only increases during a process lifetime, then may reset when that process restarts.',
    answers: 'How many occurred? At what rate?',
    example: 'Requests served, errors, bytes sent',
    tone: 'ocean',
  },
  {
    icon: Gauge,
    title: 'Gauge',
    description: 'A current value that can rise or fall. Each sample is a snapshot of the measured state at that moment.',
    answers: 'What is the value right now?',
    example: 'Queue depth, temperature, active work',
    tone: 'mint',
  },
  {
    icon: Layers3,
    title: 'Histogram',
    description: 'Places observations into configurable buckets and also records their count and sum.',
    answers: 'How is the population distributed?',
    example: 'Request duration, response size',
    tone: 'sun',
  },
  {
    icon: Percent,
    title: 'Summary',
    description: 'Calculates selected quantiles near the source and also records the observation count and sum.',
    answers: 'Which local percentile was observed?',
    example: 'Client-side latency quantiles',
    tone: 'coral',
  },
] as const;

const buildingBlocks = [
  {
    icon: Layers3,
    title: 'Buckets',
    description: 'Ordered boundaries that count observations at or below each limit. Histogram buckets are cumulative.',
  },
  {
    icon: Hash,
    title: 'Count',
    description: 'The total number of recorded observations. It answers how large the measured population is.',
  },
  {
    icon: Sigma,
    title: 'Sum',
    description: 'The total of all observed values. Dividing sum by count gives the arithmetic mean.',
  },
] as const;

const percentiles = [
  ['p50', 'Typical', 'Half of observations are at or below this value. It is the median experience.'],
  ['p95', 'Tail', 'Ninety-five percent are at or below this value; the slowest 5% are above it.'],
  ['p99', 'Extreme tail', 'Ninety-nine percent are at or below this value; it highlights rare slow experiences.'],
] as const;

const cardinalityLabels = [
  ['Environment', '3 values', 'bounded'],
  ['Region', '4 values', 'bounded'],
  ['Service', '12 values', 'bounded'],
  ['Customer ID', 'many changing values', 'unbounded'],
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function MetricsFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="metrics-anatomy" aria-labelledby="metrics-anatomy-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">The shape of a metric</p>
            <h2 id="metrics-anatomy-heading">A time series is one identity measured over time</h2>
            <p>A metric becomes useful when its stable identity explains what is measured and its samples show how that value changes.</p>
          </div>
        </div>

        <Card asChild className="metric-anatomy-card">
          <article>
            <div className="metric-identity">
              <div className="metric-identity-part name">
                <span aria-hidden="true"><ChartNoAxesCombined /></span>
                <div><small>Metric name</small><strong>Request duration</strong></div>
              </div>
              <span className="metric-identity-join" aria-hidden="true">+</span>
              <div className="metric-identity-part labels">
                <span aria-hidden="true"><Tags /></span>
                <div><small>Complete label set</small><strong>Checkout · Production · East</strong></div>
              </div>
              <span className="metric-identity-join" aria-hidden="true">=</span>
              <div className="metric-identity-result">
                <small>Unique identity</small>
                <strong>One time series</strong>
              </div>
            </div>

            <div className="metric-sample-story">
              <div className="metric-sample-copy">
                <p className="eyebrow">Samples</p>
                <h3>Values gain meaning through time</h3>
                <p>Each sample pairs a numeric value with a timestamp. The ordered samples form the line used to inspect trends, rates, and changes.</p>
              </div>
              <div className="metric-sparkline" aria-label="Five samples rising and falling over time">
                {[42, 56, 49, 71, 63].map((value, index) => (
                  <div style={{ '--sample-height': `${value}%` } as CSSProperties} key={value + index}>
                    <span>{value}</span><i aria-hidden="true" />
                  </div>
                ))}
                <small>Earlier</small><small>Later</small>
              </div>
            </div>
          </article>
        </Card>

        <div className="metric-vocabulary-grid">
          <Card asChild><article><ChartSpline aria-hidden="true" /><div><h3>Time series</h3><p>All samples that share one metric name and the exact same label values.</p></div></article></Card>
          <Card asChild><article><Activity aria-hidden="true" /><div><h3>Metric name</h3><p>States what is measured and should keep one clear meaning and unit.</p></div></article></Card>
          <Card asChild><article><Tags aria-hidden="true" /><div><h3>Labels</h3><p>Add dimensions such as service, region, outcome, or method for filtering and grouping.</p></div></article></Card>
        </div>
      </section>

      <section className="fundamentals-section" id="metrics-types" aria-labelledby="metrics-types-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Choose the right behavior</p>
            <h2 id="metrics-types-heading">Four metric types, four mental models</h2>
            <p>The type describes how values behave and which questions can be answered without misreading the data.</p>
          </div>
        </div>

        <div className="metric-type-grid">
          {metricTypes.map(({ icon: Icon, title, description, answers, example, tone }) => (
            <Card asChild className={`metric-type-card ${tone}`} key={title}>
              <article>
                <div className="metric-type-title"><span aria-hidden="true"><Icon /></span><h3>{title}</h3></div>
                <p>{description}</p>
                <dl>
                  <div><dt>Answers</dt><dd>{answers}</dd></div>
                  <div><dt>Think of</dt><dd>{example}</dd></div>
                </dl>
              </article>
            </Card>
          ))}
        </div>

        <div className="knowledge-callout metric-type-callout">
          <Activity aria-hidden="true" />
          <p><strong>Read counters as change.</strong> A raw counter total describes everything since the process started. A rate or increase over a time window describes current activity and accounts for resets.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="metrics-distributions" aria-labelledby="metrics-distributions-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">Understand the whole population</p>
            <h2 id="metrics-distributions-heading">Buckets, count, sum, and percentiles</h2>
            <p>Averages hide variation. Distribution metrics preserve enough shape to distinguish typical behavior from the slow or unusually large tail.</p>
          </div>
        </div>

        <div className="metric-building-grid">
          {buildingBlocks.map(({ icon: Icon, title, description }) => (
            <Card asChild className="metric-building-card" key={title}>
              <article><span aria-hidden="true"><Icon /></span><div><h3>{title}</h3><p>{description}</p></div></article>
            </Card>
          ))}
        </div>

        <Card className="metric-percentile-card">
          <div className="metric-percentile-heading">
            <Percent aria-hidden="true" />
            <div><p className="eyebrow">Reading the tail</p><h3>Percentiles mark a position, not an average</h3></div>
          </div>
          <div className="metric-percentile-list">
            {percentiles.map(([label, name, description]) => (
              <div key={label}><strong>{label}</strong><span>{name}</span><p>{description}</p></div>
            ))}
          </div>
        </Card>

        <Card className="comparison-card metric-distribution-comparison">
          <div className="comparison-table-wrap">
            <table>
              <thead><tr><th scope="col">Dimension</th><th scope="col">Histogram</th><th scope="col">Summary</th></tr></thead>
              <tbody>
                <tr><th scope="row">Stores</th><td>Bucket counts, total count, and sum</td><td>Precomputed quantiles, total count, and sum</td></tr>
                <tr><th scope="row">Percentiles</th><td>Estimated later from bucket boundaries</td><td>Calculated near the source</td></tr>
                <tr><th scope="row">Aggregation</th><td>Can combine matching buckets across instances</td><td>Quantiles generally cannot be meaningfully averaged or merged</td></tr>
                <tr><th scope="row">Main tradeoff</th><td>Bucket design controls accuracy and cost</td><td>Quantiles and their accuracy must be chosen in advance</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="fundamentals-section" id="metrics-cardinality" aria-labelledby="metrics-cardinality-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">Keep dimensions under control</p>
            <h2 id="metrics-cardinality-heading">Cardinality is the number of unique time series</h2>
            <p>Every distinct combination of a metric name and label values creates another series to ingest, store, scan, and remember.</p>
          </div>
        </div>

        <Card asChild className="metric-cardinality-card">
          <article>
            <div className="metric-cardinality-formula" aria-label="Cardinality grows by multiplying the possible values of labels">
              <div><small>Environments</small><strong>3</strong></div><span aria-hidden="true">×</span>
              <div><small>Regions</small><strong>4</strong></div><span aria-hidden="true">×</span>
              <div><small>Services</small><strong>12</strong></div><span aria-hidden="true">=</span>
              <div className="result"><small>Possible series</small><strong>144</strong></div>
            </div>
            <p>This simplified view assumes every label combination appears. Adding one label with thousands of possible values can multiply a manageable metric into a large and costly family of series.</p>
          </article>
        </Card>

        <div className="metric-cardinality-grid">
          <Card asChild className="metric-label-card">
            <article>
              <div className="metric-label-heading"><Tags aria-hidden="true" /><div><p className="eyebrow">Label review</p><h3>Prefer bounded dimensions</h3></div></div>
              <div className="metric-label-list">
                {cardinalityLabels.map(([name, values, kind]) => (
                  <div className={kind} key={name}><span>{name}</span><small>{values}</small></div>
                ))}
              </div>
            </article>
          </Card>
          <Card asChild className="metric-cardinality-guidance">
            <article>
              <Hash aria-hidden="true" />
              <div>
                <p className="eyebrow">A practical test</p>
                <h3>Can you list the possible values?</h3>
                <p>Labels work best when their value set is small, stable, and useful for grouping. User IDs, request IDs, timestamps, and other nearly unique values belong in logs or traces, not metric labels.</p>
              </div>
            </article>
          </Card>
        </div>

        <div className="metric-cardinality-warning">
          <TriangleAlert aria-hidden="true" />
          <p><strong>Cardinality compounds.</strong> Review the full label combination, not each label in isolation. Several moderate dimensions can still create a very large number of series.</p>
        </div>
      </section>
    </>
  );
}
