# Distributed Tracing

Distributed tracing explains how one request or workflow moves through multiple operations and services. It preserves both the end-to-end story and the individual pieces of work that created that story.

## Trace

A trace is the complete record of one distributed operation. It gathers related operations into a single journey, from the first entry point through downstream calls and background work that belongs to the same flow.

A trace answers questions such as:

- Which services participated in this request?
- In what order did the work happen?
- Which operations ran at the same time?
- Where did latency or failure appear?

The trace is a logical boundary. It is not a machine, process, or log file.

## Trace ID

A trace ID identifies the complete journey. Every span in the trace carries the same trace ID, allowing telemetry produced in different processes to be correlated.

The trace ID establishes membership: if two spans have the same trace ID, they belong to the same trace. It does not establish their order or relationship. Span IDs and parent references provide that structure.

## Span

A span represents one timed operation within a trace. Examples include receiving an HTTP request, calling another service, publishing a message, or executing a database operation.

A span normally records:

- A name describing the operation.
- A start time and duration.
- Its trace ID and span ID.
- A parent span ID when it has a parent.
- Attributes, events, and status.

Span boundaries should represent meaningful operations. Extremely broad spans hide useful detail, while a span for every tiny action creates noise and cost.

## Span ID

A span ID identifies one span within a trace. Unlike the trace ID, which is shared, a span ID is unique to that operation.

Span IDs make relationships possible. A child span records the span ID of its parent, allowing a tracing system to reconstruct the operation tree even when the spans arrive out of order.

## Root span

The root span is the top-level span in a trace. It has no parent inside that trace and usually represents the entry point into the observed operation.

The root span commonly defines the overall trace boundary. Its start and end describe the trace's wall-clock duration, although incomplete instrumentation may cause the visible trace to begin or end later than the real work.

## Parent and child spans

A parent span initiates or logically owns another operation. The initiated operation is represented by a child span. This parent/child relationship describes causality rather than simple timing.

One parent can have many children. Sibling spans may run sequentially or concurrently, and a child can become the parent of deeper work. These relationships form a tree rooted at the root span.

Context must cross process and service boundaries for this tree to remain connected. If the context is lost, downstream work may appear as a separate trace instead of a child of the original operation.

## Span duration

Span duration is the elapsed wall-clock time between a span's start and end. It includes active work and time spent waiting for dependencies or child operations.

The sum of all span durations is usually greater than the trace duration because parent and child intervals overlap. Concurrent sibling spans also overlap. A waterfall view makes these relationships visible and helps identify the sequence of operations that most influences end-to-end latency.

Duration alone does not explain why an operation was slow. Attributes, events, and related child spans provide the context needed to interpret it.

## Span attributes

Span attributes are key-value facts that describe an operation. They can capture details such as the service, request method, server address, database system, or result category.

Attributes make spans searchable, filterable, and groupable. Useful attributes have clear meanings and values that remain reasonably bounded. Sensitive data and highly unique values should be avoided unless there is a deliberate need and an appropriate data policy.

Attributes describe the span as a whole. When a fact belongs to a particular moment during the operation, a span event may be a better fit.

## Span events

A span event is a named, timestamped occurrence within a span. Events mark notable moments without creating a separate timed operation.

Retries, exceptions, state transitions, and checkpoints are common event candidates. An event may also carry its own attributes, giving the moment additional context.

Use a child span when the activity has a meaningful duration, structure, or independent outcome. Use an event when the important fact is that something happened at a particular instant.

## Span status

Span status is the span's final outcome classification. The common states are:

- **Unset**: no explicit success or failure conclusion was recorded. This is the default and does not by itself mean failure.
- **OK**: the operation was explicitly marked successful.
- **Error**: the operation failed, often with a description or event preserving more detail.

Status is deliberately small and should not replace richer protocol-specific attributes. A response code, exception event, and error status answer different questions and can coexist.

## Putting the model together

One trace ID groups the complete journey. Unique span IDs distinguish its operations. Parent references connect those operations into a tree with one root span. Start times and durations turn the tree into a waterfall. Attributes describe each operation, events mark important moments within it, and status records its final outcome.

This combination lets a trace explain not only that a request was slow or failed, but where the behavior occurred and how it related to the rest of the distributed operation.
