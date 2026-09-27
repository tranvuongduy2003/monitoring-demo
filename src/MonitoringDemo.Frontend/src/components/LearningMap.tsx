const concepts = [
  ['Time series', 'A metric name and one label set produce timestamped values'],
  ['Counter', 'Monotonic totals become throughput with PromQL rate()'],
  ['Gauge', 'Current state can move up and down, such as active work'],
  ['Histogram', 'Buckets retain an aggregatable latency distribution plus count and sum'],
  ['Summary', 'Direct client-side quantiles are convenient but generally cannot combine instances'],
  ['Cardinality', 'Bounded labels control the number and cost of time series'],
];

export function LearningMap() {
  return (
    <section className="concepts" aria-labelledby="concept-heading">
      <div>
        <p className="eyebrow">Learning map</p>
        <h2 id="concept-heading">What this demo implements</h2>
      </div>
      <div className="concept-grid">
        {concepts.map(([title, description]) => (
          <article key={title}><strong>{title}</strong><span>{description}</span></article>
        ))}
      </div>
    </section>
  );
}
