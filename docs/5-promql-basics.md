# PromQL basics

PromQL is the query language used to select, transform, and aggregate Prometheus time series. A useful way to read a PromQL expression is as a sequence of decisions:

1. Select the time series that belong to the question.
2. Decide whether the calculation needs one sample or a window of samples from each series.
3. Apply a transformation that matches the metric's behavior.
4. Aggregate the result while preserving the labels needed to interpret it.

The order matters. Selection defines the input population, vector type defines the time shape, functions describe how values should be interpreted, and aggregation defines the identity of the output.

## Metric selection

A metric selector chooses a family of time series that share a metric name. The name identifies what is measured, while the complete label set distinguishes one series from another.

Selecting a metric can therefore return many series. A request counter may have separate series for every service, instance, method, route, status class, or other recorded dimension. The selector does not combine these series; it only establishes the population that later operations will process.

A good selection begins with the measurement that directly represents the question. Starting from an overly broad population can mix values with different meanings, increase query cost, and make later aggregation difficult to interpret.

## Label filtering

Label filtering narrows the selected metric family by its dimensions. Matchers can keep one exact value, exclude one value, keep values that follow a pattern, or exclude values that follow a pattern.

Filters should express the scope of the question. Common examples of useful scope include service, environment, region, operation, method, and outcome. Highly specific filters may be appropriate during an investigation, while stable dashboards and alerts usually benefit from selectors that continue to work as instances change.

Label filtering happens before functions and aggregation. This makes it the main control over which series contribute to a result. A missing filter can silently include unrelated workloads; a filter that is too narrow can remove part of the population being measured.

## Instant vector

An instant vector contains one sample for every selected time series at an evaluation time. The sample is the most recent value that is still considered valid for that evaluation.

Instant vectors are suited to questions about current state and cross-series comparison. Aggregation operators such as `sum`, `avg`, `min`, `max`, and `count` consume instant vectors and return new instant vectors with a different label shape.

The word instant describes the query's evaluation shape, not necessarily a value collected at exactly that clock instant. Prometheus evaluates against stored samples and applies its rules for finding a recent valid sample.

## Range vector

A range vector contains a sequence of samples for every selected time series across a lookback window. It gives a range-aware function the history needed to calculate change, variation, or other behavior over time.

A range vector is not a chart. It is an intermediate data shape grouped by series identity. Functions such as `rate` and `increase` reduce each series' sample window to a current result.

The range should be long enough to contain enough samples for a stable calculation. A window that is too short relative to the scrape interval may contain too little evidence. A very long window can smooth away changes that matter to the question.

## sum

`sum` adds sample values within each output group. It answers questions about combined amount, such as total request rate across instances or total work currently in progress across workers.

Addition is meaningful only when the underlying measurements can be combined. Counts and traffic rates usually can be summed. Ratios, temperatures, and already averaged values often require more careful treatment.

## avg

`avg` calculates the arithmetic mean of the input series in each output group. Every series has equal weight, regardless of how much traffic or how many observations produced its value.

That equal weighting is an important limitation. Averaging per-instance averages does not generally produce a correct fleet-wide average when the instances have different observation counts. When a weighted mean is required, the underlying totals and counts provide the necessary information.

## min

`min` keeps the lowest sample value in each output group. It can reveal the least active instance, a lower bound, or an unexpectedly low member of a population.

The operator returns the value, not an explanation of which original series produced it. If source identity matters, the query design must preserve enough labels or use a different investigative view.

## max

`max` keeps the highest sample value in each output group. It is useful for locating the upper bound of current behavior, such as the most saturated instance or largest queue.

Like `min`, it reduces the group to a value. Aggregating away source labels means the result no longer retains the full identity of the original series that contributed the extreme.

## count

`count` returns the number of time series in each output group. It counts series, not sample values and not business events.

This distinction makes `count` useful for questions about the observed population, such as how many instances, label combinations, or active series are present. Counting events normally requires a counter metric followed by a counter-aware function.

## rate

`rate` estimates the average per-second change of a counter over a range vector. It recognizes counter resets and adjusts the calculation so a process restart is not interpreted as negative activity.

Rate turns cumulative counters into comparable speeds. Request totals become requests per second, error totals become errors per second, and processed bytes become bytes per second.

The selected window controls the balance between responsiveness and stability. A shorter window reacts faster but is more sensitive to scrape timing and brief variation. A longer window is smoother but responds more slowly to a real change.

For multiple counter series, calculate the rate per series before aggregating. This preserves the evidence needed to recognize resets independently for each source.

## increase

`increase` estimates how much a counter grew over a selected time window. It uses the same reset-aware counter reasoning as `rate`, but presents the result as a total amount for the window rather than a per-second speed.

`increase` is useful when the question is naturally phrased as an amount during a period: requests handled, errors observed, jobs completed, or bytes transferred during the chosen interval.

Because the result is tied to the window length, two increases are not directly comparable unless their windows represent the same duration and context. Rate is often easier to compare across views with different time ranges.

## by

`by` defines the labels that an aggregation keeps. Input series with the same values for those labels belong to the same output group. Other labels are removed.

This makes `by` useful when the desired output dimensions are known explicitly. Grouping by service and region, for example, creates one result for every service-region combination while combining instance-level series within each group.

Labels not preserved by the grouping clause are no longer available in the output. The selected labels should therefore reflect the dimensions needed for interpretation, display, alert routing, or later operations.

## without

`without` defines the labels that an aggregation removes. Every label not named in the clause can remain part of the output identity.

This is convenient when one or two high-detail labels should be collapsed while the other context should remain. Removing an instance label can combine replicas without having to list every service-level label that should be preserved.

The tradeoff is that newly introduced labels may automatically remain in the result. `by` gives an explicit output schema; `without` gives an explicit removal list. The safer choice depends on whether the preserved or removed dimensions are more stable and intentional.

## histogram_quantile

`histogram_quantile` estimates a percentile from cumulative classic histogram buckets. It does not operate on a single average or on unrelated series. Its input must describe a coherent bucket distribution for the population and time window being analyzed.

The reasoning sequence is:

1. Select the cumulative bucket counters for the histogram.
2. Calculate their change over the same range using a counter-aware function.
3. Aggregate across the desired population while preserving the bucket-boundary label.
4. Ask for a quantile position such as the median or a tail percentile.

Preserving the bucket boundary is essential because the function needs the ordered cumulative bucket counts to reconstruct the distribution. Other labels can be kept when separate percentile results are required for dimensions such as service or region.

The result is an estimate. Its precision depends on the histogram's bucket boundaries. A requested quantile that falls inside a wide bucket has less resolution than one supported by closely spaced boundaries around the region of interest.

## A practical mental model

Read a basic PromQL query from the inside out:

1. **Population:** Which metric and label values are included?
2. **Time:** Does each series contribute one sample or a range of samples?
3. **Behavior:** Is the metric a current value, a counter that needs change over time, or a histogram distribution?
4. **Reduction:** Which aggregation answers the question?
5. **Identity:** Which labels should remain on the result?

Correct PromQL is not only syntactically valid. Its operations must match the metric type, its grouping must preserve the meaning needed downstream, and its time window must match the behavior being investigated.
