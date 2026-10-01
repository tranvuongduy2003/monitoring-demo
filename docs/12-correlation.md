# Correlation

Correlation connects separate telemetry signals into one investigation. Logs, metrics, and traces answer different questions, so correlation does not merge them into a single signal. It preserves their distinct strengths while providing reliable ways to move from one view of system behavior to another.

A useful correlation path usually moves from a broad symptom toward increasingly specific evidence:

1. A metric shows that a population changed.
2. An exemplar or a shared time and resource context identifies a relevant request.
3. A trace shows that request across services.
4. Trace and span identifiers reveal the logs written during the exact operations of interest.

The quality of that path depends on consistent timestamps, resource identity, propagated trace context, and identifiers that survive each telemetry pipeline without being renamed, truncated, or discarded.

## Logs and traces

Logs describe discrete events. They are useful for messages, errors, state transitions, and application detail that may not belong on every span. Traces describe causally related operations and show how a request moved through a distributed system.

The strongest log-to-trace correlation happens when a log record carries the trace context that was active when the event was emitted:

- **Trace ID** connects the log to the complete distributed request.
- **Span ID** connects the log to the specific operation that produced it.

Together, these fields allow an investigation to move in either direction. A trace can reveal the logs written by a slow or failing span, while a suspicious log can open the request path that surrounded it.

Timestamps, service identity, environment, operation names, and request attributes remain useful. They help narrow a search and provide context, especially for logs created outside an active trace. However, temporal proximity alone is not proof that two records belong to the same execution. Concurrent requests can produce similar events in the same service at nearly the same time.

Correlation fields should be structured data rather than text that must be guessed from a message. Structured fields retain their meaning through collection and storage and give an observability interface a dependable value to search or link.

## Metrics and traces

Metrics summarize behavior across a population. They efficiently answer questions about rate, errors, duration, saturation, and distributions. A trace describes one execution in detail. Correlating them connects two levels of reasoning:

- The metric asks whether a condition is widespread, increasing, or unusual.
- The trace asks why one concrete request behaved as it did.

Time and bounded resource dimensions provide the basic bridge. A metric increase can narrow the relevant time range, service, environment, route, or region. Traces can then be filtered to the same context. Trace-derived metrics provide another bridge because their aggregates and dimensions originate from spans, although the resulting metric series still represent populations rather than individual traces.

A Trace ID should not be added as an ordinary metric label. Trace IDs are effectively unique per request, so using them as labels creates extremely high cardinality and defeats the aggregation model that makes metrics efficient. Exemplars provide a controlled alternative: they associate selected metric observations with trace context without turning every request into a separate time series.

## Trace ID correlation

A Trace ID identifies an end-to-end distributed operation. Every span in the same trace carries the same Trace ID, even though those spans may belong to different processes, services, hosts, or execution environments.

The Trace ID therefore answers the question: **which journey does this evidence belong to?**

Its value comes from propagation. When one service calls another, the receiving service extracts the incoming trace context and creates a new span that preserves the Trace ID. The span gains its own Span ID, but the shared Trace ID keeps it within the original request story.

Trace ID correlation is useful for:

- Opening a complete trace from a log record.
- Finding all trace-aware logs produced during one request.
- Linking an exemplar to a representative trace.
- Comparing evidence from multiple services that participated in the same operation.

The identifier is a join key, not an explanation. After locating the trace, the investigator must still interpret span timing, status, attributes, events, and relationships to understand what happened.

## Span ID correlation

A Span ID identifies one operation within a trace. Each span has its own Span ID, while all spans in the trace retain the shared Trace ID.

The two identifiers form a useful locator:

- Trace ID answers **which distributed journey?**
- Span ID answers **which operation within that journey?**

A log emitted while a span is active can carry both fields. The Trace ID locates the overall request, and the Span ID highlights the service operation whose context was active when the log was written. This is more precise than attaching the log only to the trace.

Span identity is different from parentage. A span's own Span ID identifies that span. A child relationship records the parent span's ID, allowing the trace to form a tree of causally related operations. Correlation should preserve these roles rather than treating all span identifiers as interchangeable.

When a Span ID is present on a log, its Trace ID should also be present. The pair supplies both search scope and precise operation context.

## Exemplars basics

An exemplar is a representative observation stored alongside an aggregated metric. It may include a Trace ID and other limited context that identifies the concrete request behind the observation.

Exemplars are especially useful with counters and distributions. A latency histogram can show that requests accumulated in a slow bucket, while an exemplar attached near that region can point to one request that experienced a similar duration. The investigator can follow that trace and inspect which spans consumed the time.

The basic investigation flow is:

1. Identify an unusual time or value region in a metric.
2. Select an exemplar associated with that region.
3. Follow its Trace ID into the tracing system.
4. Inspect the trace, then use Trace ID and Span ID to locate related logs.

An exemplar remains a sample. It does not prove that every observation in an aggregate has the same cause, and it may not represent the most common behavior in the population. It provides a concrete starting point for investigation, not a complete statistical explanation.

The linked trace must also survive the tracing system's sampling and retention decisions. An exemplar can carry a valid Trace ID even when the corresponding trace is no longer available. Correlation is therefore strongest when metric, log, and trace retention policies are designed with investigation paths in mind.

## A compact mental model

Use each signal at the level where it is strongest:

| Signal or field | Best question |
| --- | --- |
| Metric | How much, how often, and how broadly? |
| Exemplar | Which concrete observation can I inspect? |
| Trace ID | Which end-to-end request contains this evidence? |
| Span ID | Which exact operation produced this evidence? |
| Log | What detail or event was recorded at that moment? |

Good correlation moves between these levels without confusing them. Metrics retain aggregation, traces retain causal structure, logs retain event detail, and shared context provides the links.
