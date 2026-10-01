# Metrics Fundamentals

Metrics are numeric measurements recorded over time. They compress a system's behavior into values that are efficient to store, compare, aggregate, visualize, and evaluate. This makes them especially useful for understanding trends, rates, totals, current state, and distributions across many components.

The strength of a metric comes from a clear identity, the correct metric type, meaningful dimensions, and controlled cardinality. A number without this context is difficult to interpret and easy to misuse.

## Time series

A time series is an ordered sequence of numeric samples that share one identity. Each sample pairs a value with a timestamp. Together, the samples show how the same measurement changes over time.

The identity of a time series consists of:

- A metric name that describes what is measured.
- A complete set of labels and their values that describes where or for whom it is measured.

Changing any label value creates a different time series. Two samples with the same metric name but different regions, services, outcomes, or other label values do not belong to the same series.

Time series support different kinds of interpretation. A raw value can describe the current state, a change between samples can describe activity, and many related series can be aggregated to reveal behavior across a larger group.

## Metric name

A metric name communicates what a measurement represents. A strong name has one stable meaning and implies a consistent unit. The same name should not sometimes mean seconds and sometimes milliseconds, or sometimes describe a total and sometimes a current value.

Names should be broad enough to remain stable but specific enough to avoid ambiguity. Dimensions that people need to filter or group by usually belong in labels rather than being embedded into many separate metric names.

## Labels

Labels are key-value dimensions attached to a metric. They add context such as service, environment, region, operation, method, or outcome.

Labels make it possible to:

- Select the series relevant to a question.
- Group related series into a broader view.
- Compare the same measurement across dimensions.
- Aggregate away details that are not needed for the current question.

Labels should have clear semantics and a controlled set of possible values. A label is not a place for arbitrary metadata. Every new value can create another time series, so labels have a direct effect on storage and query cost.

## Counter

A counter is a cumulative total. It increases as events occur and does not decrease during the lifetime of the process that records it. A counter may return to a lower value when the process restarts, which is called a reset.

Counters are appropriate for values such as:

- Requests completed.
- Errors encountered.
- Jobs processed.
- Bytes transmitted.

The raw total usually says less about current behavior than its change over a time window. Rates and increases turn cumulative counters into answers such as requests per second or errors during the last interval. Correct counter analysis recognizes resets instead of treating them as negative activity.

## Gauge

A gauge is a current value that can rise or fall. Each sample is a snapshot of the measured state at that moment.

Gauges are appropriate for values such as:

- Current queue depth.
- Active work.
- Temperature.
- Memory in use.
- The most recent duration or timestamp.

A gauge can be aggregated when the aggregation matches its meaning. Summing active work across instances may be useful, while summing temperatures usually is not. The meaning of the measurement should determine the operation.

## Histogram

A histogram records a distribution by counting observations in configurable buckets. It also records the total count of observations and their sum.

Histograms are useful for measurements such as request duration, response size, payload size, and queue wait time. They preserve more information than an average because they show how observations are distributed across ranges.

Histogram buckets are cumulative. A bucket with a particular upper boundary includes every observation at or below that boundary. The highest bucket includes all observations. Matching bucket counts can be added across instances, which makes histograms suitable for calculating aggregate distributions and estimating percentiles across a fleet.

Bucket boundaries determine the resolution of the result. Closely spaced boundaries provide more precision in an important range but create more time series. Boundaries should reflect the thresholds and questions that matter for the measured behavior.

## Summary

A summary records the total count and sum of observations and may calculate selected quantiles near the source. It can provide accurate local quantiles over a configured time window without requiring bucket boundaries.

The main limitation is aggregation. Quantiles calculated separately by different instances generally cannot be averaged or combined into a correct fleet-wide quantile. The desired quantiles and accuracy also need to be chosen before the observations are recorded.

Histograms and summaries both describe distributions, but they place the tradeoff in different locations:

| Dimension | Histogram | Summary |
|---|---|---|
| Distribution representation | Counts observations in configured buckets | Calculates selected quantiles near the source |
| Percentile calculation | Estimated later from bucket data | Calculated when observations are recorded |
| Aggregation | Matching buckets can be combined across instances | Precomputed quantiles generally cannot be meaningfully combined |
| Main design choice | Bucket boundaries | Quantiles, accuracy, and time window |

## Buckets

A bucket counts observations up to an upper boundary. Because histogram buckets are cumulative, an observation counted in a lower bucket is also included in every higher bucket.

Useful bucket design begins with the decisions that the metric needs to support. Boundaries can cluster around an important latency objective or other meaningful thresholds. Buckets that are too wide produce coarse percentile estimates, while excessive or poorly placed buckets increase cost without improving the answers that matter.

## Count

Count is the total number of observations recorded by a histogram or summary. It answers how large the measured population is.

Count is useful on its own for deriving an observation rate. It also provides the denominator for calculating a mean from the sum. Because it behaves like a counter, its change over time is usually more meaningful than its lifetime total.

## Sum

Sum is the total of all observed values. Dividing the increase in sum by the increase in count over the same period gives the arithmetic mean for that period.

The sum does not describe the shape of the population. Two populations with the same count and mean can have very different tails. Buckets or quantiles are needed when that variation matters.

## Percentiles

A percentile describes the value at or below which a given percentage of observations fall. It marks a position in an ordered population; it is not an average.

- **p50** is the median. Half of observations are at or below it, so it represents a typical experience.
- **p95** is the value at or below which 95 percent of observations fall. The slowest or largest 5 percent are above it.
- **p99** is the value at or below which 99 percent of observations fall. It emphasizes rare tail behavior.

Percentiles help reveal experiences hidden by an average. A stable mean can coexist with a worsening p99 if a small portion of requests becomes much slower. Higher percentiles are also more sensitive to low sample counts and outliers, so they should be interpreted together with count and the broader distribution.

Histograms estimate percentiles from buckets, so the result depends on boundary placement. Summaries calculate configured quantiles near the source, but those quantiles cannot generally be aggregated across instances.

## Fundamental cardinality

Metric cardinality is the number of unique time series. Every distinct combination of a metric name and its label values creates a separate series.

Cardinality grows multiplicatively. If a metric can appear for 3 environments, 4 regions, and 12 services, it can produce 144 combinations before any other labels are considered. Not every combination must exist, but the multiplication is a useful way to estimate the risk.

Bounded labels such as environment, region, operation, or outcome usually have a small and predictable value set. Unbounded labels such as user ID, request ID, session ID, full URL, timestamp, or arbitrary message can produce a new series for nearly every event.

High cardinality affects the entire metrics system:

- More series must be created, indexed, stored, and retained.
- Queries must find and scan more series.
- Memory use and ingestion work increase.
- Dashboards and alerts become slower and more expensive.
- Short-lived or constantly changing values create churn even when the active series count looks manageable.

A practical label test is whether the possible values can be listed or reasonably bounded. Highly unique context is still valuable, but it is usually better represented in logs or traces and connected to metrics through shared service context and time.

## A practical mental model

Read a metric in this order:

1. **Identity:** the metric name and full label set define one time series.
2. **Behavior:** the metric type explains how its values can change.
3. **Population:** buckets, count, sum, and percentiles explain distributions.
4. **Scale:** label combinations determine cardinality and operational cost.

Good metrics answer clear questions with the smallest stable set of series needed. The goal is not to attach every available detail, but to preserve the dimensions required for dependable aggregation, comparison, alerting, and trend analysis.
