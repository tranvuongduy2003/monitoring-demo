import {
  Activity,
  Braces,
  ChartNoAxesCombined,
  Database,
  Filter,
  Gauge,
  Layers3,
  Search,
  Tags,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['promql-selection', 'Selection & filtering'],
  ['promql-vectors', 'Vector types'],
  ['promql-aggregation', 'Aggregation'],
  ['promql-change-distribution', 'Change & quantiles'],
] as const;

const matcherTypes = [
  ['Exact match', 'Keep series whose label has one specific value.'],
  ['Not equal', 'Exclude series with one specific label value.'],
  ['Pattern match', 'Keep values that follow a regular-expression pattern.'],
  ['Pattern exclusion', 'Remove values that follow a regular-expression pattern.'],
] as const;

const aggregations = [
  {
    name: 'sum',
    question: 'What is the combined total?',
    description: 'Adds the sample values in each output group. It is useful for totals across instances, regions, or other dimensions that can be meaningfully combined.',
  },
  {
    name: 'avg',
    question: 'What is the arithmetic mean?',
    description: 'Divides the sum of the values by the number of series in each group. Every input series contributes equal weight.',
  },
  {
    name: 'min',
    question: 'What is the lowest value?',
    description: 'Keeps the smallest sample value in each group, helping locate a lower bound or the least active member.',
  },
  {
    name: 'max',
    question: 'What is the highest value?',
    description: 'Keeps the largest sample value in each group, making the most elevated member or upper bound visible.',
  },
  {
    name: 'count',
    question: 'How many series are present?',
    description: 'Counts matching time series rather than adding their sample values. It answers questions about population size.',
  },
] as const;

const changeFunctions = [
  {
    icon: Activity,
    name: 'rate',
    result: 'Change per second',
    description: 'Estimates the average per-second speed of a counter over a range. It accounts for counter resets and is the usual choice for traffic, error, and work rates.',
    question: 'How fast is the counter changing?',
  },
  {
    icon: ChartNoAxesCombined,
    name: 'increase',
    result: 'Total change in the window',
    description: 'Estimates how much a counter grew across a range. It uses the same reset-aware reasoning as rate, but presents the result as an amount for the selected window.',
    question: 'How much happened during this period?',
  },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function PromQLBasics() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="promql-selection" aria-labelledby="promql-selection-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">01</span>
          <div>
            <p className="eyebrow">Metric selection and label filtering</p>
            <h2 id="promql-selection-heading">Start with a population of time series</h2>
            <p>A PromQL query first decides which series belong to the question. The metric name identifies a measurement family; label matchers narrow that family by dimensions such as service, environment, method, or outcome.</p>
          </div>
        </div>

        <Card asChild className="promql-selector-card">
          <article>
            <div className="promql-selector-part metric">
              <span aria-hidden="true"><Search /></span>
              <div><small>Metric selection</small><strong>Choose the measurement</strong><p>The name establishes what is being measured and forms the broadest useful starting set.</p></div>
            </div>
            <span className="promql-selector-join" aria-hidden="true">+</span>
            <div className="promql-selector-part labels">
              <span aria-hidden="true"><Filter /></span>
              <div><small>Label filtering</small><strong>Narrow by dimensions</strong><p>Matchers keep or exclude series according to the label context attached to them.</p></div>
            </div>
            <span className="promql-selector-join" aria-hidden="true">=</span>
            <div className="promql-selector-result">
              <Database aria-hidden="true" />
              <div><small>Selected set</small><strong>Only relevant series continue</strong></div>
            </div>
          </article>
        </Card>

        <div className="promql-matcher-grid">
          {matcherTypes.map(([title, description]) => (
            <Card asChild key={title}>
              <article><Tags aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></article>
            </Card>
          ))}
        </div>

        <div className="knowledge-callout promql-selection-callout">
          <Filter aria-hidden="true" />
          <p><strong>Filter before calculating.</strong> A precise selector keeps unrelated series out of later aggregation and makes the meaning, cost, and label shape of the result easier to reason about.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="promql-vectors" aria-labelledby="promql-vectors-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">02</span>
          <div>
            <p className="eyebrow">Instant vector and range vector</p>
            <h2 id="promql-vectors-heading">A value now or a window of history</h2>
            <p>PromQL works with typed collections of time series. The vector type determines whether each series contributes one evaluation-time sample or a sequence of samples from a time window.</p>
          </div>
        </div>

        <div className="promql-vector-grid">
          <Card asChild className="promql-vector-card instant">
            <article>
              <div className="promql-vector-title"><span aria-hidden="true"><Gauge /></span><div><p className="eyebrow">Snapshot</p><h3>Instant vector</h3></div></div>
              <p>Contains one current sample for every selected series at the evaluation time. It is the natural shape for comparing, grouping, and aggregating current values.</p>
              <div className="promql-instant-visual" aria-label="One sample selected for each of three time series">
                {[72, 46, 61].map((value, index) => <div key={value}><span>Series {index + 1}</span><i style={{ left: `calc(62px + ${value}% - ${value * 0.62}px)` }} /></div>)}
              </div>
              <strong>One series &rarr; one sample</strong>
            </article>
          </Card>

          <Card asChild className="promql-vector-card range">
            <article>
              <div className="promql-vector-title"><span aria-hidden="true"><Layers3 /></span><div><p className="eyebrow">History window</p><h3>Range vector</h3></div></div>
              <p>Contains a sequence of samples for every selected series across a lookback window. Range-aware functions use that history to describe change over time.</p>
              <div className="promql-range-visual" aria-label="Multiple samples selected for each of three time series">
                {[0, 1, 2].map(row => <div key={row}><span>Series {row + 1}</span>{[0, 1, 2, 3, 4].map(point => <i key={point} />)}</div>)}
              </div>
              <strong>One series &rarr; many samples</strong>
            </article>
          </Card>
        </div>

        <Card className="comparison-card promql-vector-comparison">
          <div className="comparison-table-wrap">
            <table>
              <thead><tr><th scope="col">Dimension</th><th scope="col">Instant vector</th><th scope="col">Range vector</th></tr></thead>
              <tbody>
                <tr><th scope="row">Time shape</th><td>One evaluation-time value per series</td><td>Multiple values per series across a window</td></tr>
                <tr><th scope="row">Best for</th><td>Current comparison and aggregation</td><td>Change, rate, and behavior over time</td></tr>
                <tr><th scope="row">Typical next step</th><td>Aggregate or compare series</td><td>Apply a range-aware function</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="fundamentals-section" id="promql-aggregation" aria-labelledby="promql-aggregation-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">03</span>
          <div>
            <p className="eyebrow">sum, avg, min, max, and count</p>
            <h2 id="promql-aggregation-heading">Reduce many series into useful groups</h2>
            <p>Aggregation combines an instant vector into fewer output series. The operator defines the calculation; the grouping clause defines which label boundaries the calculation preserves.</p>
          </div>
        </div>

        <div className="promql-aggregation-grid">
          {aggregations.map(({ name, question, description }) => (
            <Card asChild className="promql-aggregation-card" key={name}>
              <article>
                <code>{name}</code>
                <h3>{question}</h3>
                <p>{description}</p>
              </article>
            </Card>
          ))}
        </div>

        <div className="promql-grouping-grid">
          <Card asChild className="promql-grouping-card by">
            <article>
              <div className="promql-grouping-title"><Braces aria-hidden="true" /><div><p className="eyebrow">Keep named dimensions</p><h3><code>by</code></h3></div></div>
              <p>Preserves only the labels named in the grouping clause. Series sharing those label values are placed into the same output group.</p>
              <div className="promql-label-story"><span>service</span><span>region</span><span className="muted">instance</span><i aria-hidden="true">&rarr;</i><strong>service + region</strong></div>
            </article>
          </Card>
          <Card asChild className="promql-grouping-card without">
            <article>
              <div className="promql-grouping-title"><Braces aria-hidden="true" /><div><p className="eyebrow">Remove named dimensions</p><h3><code>without</code></h3></div></div>
              <p>Drops the labels named in the grouping clause and preserves the remaining useful dimensions in the output.</p>
              <div className="promql-label-story"><span>service</span><span>region</span><span className="muted">instance</span><i aria-hidden="true">&rarr;</i><strong>all except instance</strong></div>
            </article>
          </Card>
        </div>

        <div className="knowledge-callout promql-grouping-callout">
          <Tags aria-hidden="true" />
          <p><strong>Grouping changes identity.</strong> Labels removed by aggregation cannot be used later to distinguish the original series. Preserve the dimensions needed to interpret or join the result.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="promql-change-distribution" aria-labelledby="promql-change-distribution-heading">
        <div className="fundamentals-section-heading">
          <span className="fundamentals-index">04</span>
          <div>
            <p className="eyebrow">rate, increase, and histogram_quantile</p>
            <h2 id="promql-change-distribution-heading">Turn counter history into speed, totals, and percentiles</h2>
            <p>Counters need a range of samples before their movement becomes meaningful. Histogram buckets add a distribution, allowing PromQL to estimate a percentile across an aggregated population.</p>
          </div>
        </div>

        <div className="promql-change-grid">
          {changeFunctions.map(({ icon: Icon, name, result, description, question }) => (
            <Card asChild className="promql-change-card" key={name}>
              <article>
                <div className="promql-change-title"><span aria-hidden="true"><Icon /></span><div><p className="eyebrow">{result}</p><h3><code>{name}</code></h3></div></div>
                <p>{description}</p>
                <strong>{question}</strong>
              </article>
            </Card>
          ))}
        </div>

        <Card asChild className="promql-quantile-card">
          <article>
            <div className="promql-quantile-heading">
              <span aria-hidden="true"><ChartNoAxesCombined /></span>
              <div><p className="eyebrow">Estimated percentile</p><h3><code>histogram_quantile</code></h3></div>
            </div>
            <p>Estimates a quantile from cumulative histogram buckets. The input should describe bucket rates or increases for the same window, combined across the population while keeping each bucket boundary distinct.</p>
            <div className="promql-quantile-flow" aria-label="Histogram quantile reasoning flow">
              <div><Database aria-hidden="true" /><span>Bucket counters</span><strong>Cumulative observations</strong></div>
              <i aria-hidden="true">&rarr;</i>
              <div><Activity aria-hidden="true" /><span>Window change</span><strong>Rates or increases</strong></div>
              <i aria-hidden="true">&rarr;</i>
              <div><Tags aria-hidden="true" /><span>Grouped buckets</span><strong>Boundary preserved</strong></div>
              <i aria-hidden="true">&rarr;</i>
              <div><Gauge aria-hidden="true" /><span>Quantile estimate</span><strong>Position in distribution</strong></div>
            </div>
          </article>
        </Card>

        <div className="knowledge-callout promql-reset-callout">
          <Activity aria-hidden="true" />
          <p><strong>Use counter-aware functions before aggregation.</strong> Calculating each series' change first lets resets be recognized per source. Aggregating raw counters first can hide a reset behind growth from other series.</p>
        </div>
      </section>
    </>
  );
}
