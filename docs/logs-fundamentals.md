# Logs Fundamentals

Logs are timestamped records of discrete events. They preserve the detail behind a system's behavior: what happened, where it happened, what the outcome was, and which operation was affected. Useful logging is intentional. It gives each event a clear meaning, consistent context, and a dependable relationship to the rest of the system's telemetry.

## Structured and unstructured logging

Unstructured logging expresses an event mainly as free-form text. It is natural to write and easy for a person to read, but important values are embedded in prose. Variations in wording can make the same event difficult to find or compare reliably.

Structured logging stores important details as named attributes. A record can carry a readable message while separately preserving values such as severity, event name, service, duration, outcome, and identifiers. Because each value keeps a stable meaning, tools can filter, group, aggregate, and correlate records more accurately.

Structure does not replace good writing. A useful structured log has both a concise message for people and well-named attributes for analysis. Field names should remain consistent across services, and values should use predictable types and units.

## Log levels

A log level communicates the significance of an event:

| Level | Meaning |
|---|---|
| Trace | The finest-grained execution detail, normally enabled for a narrow investigation |
| Debug | Diagnostic information useful while understanding internal behavior |
| Information | Expected and meaningful progress through normal operation |
| Warning | Unexpected behavior from which the operation or system can recover |
| Error | A failed operation that needs attention but does not necessarily stop the system |
| Critical | A severe failure that threatens continued operation or data integrity |

The level should reflect the event's operational meaning, not the amount of text it contains. When routine behavior is logged as a warning or error, noise hides genuine problems. Trace and Debug are commonly enabled selectively, while production visibility often begins at Information or Warning.

## Log attributes

Attributes add searchable context to an event. Three broad groups are useful:

- **Event attributes** describe the action, outcome, duration, reason, and relevant domain details.
- **Resource attributes** identify the service, version, environment, region, and instance that produced the record.
- **Correlation attributes** connect the event to a request, trace, span, session, job, or business workflow.

Good attributes are stable, well named, and relevant to a real investigation question. Sensitive values should be excluded or protected. Unbounded values require special care because indexing them can create excessive cost and fragmentation.

## Contextual logging

Contextual logging attaches shared attributes to every event produced during an operation. Context can be established when a request, job, or workflow begins and then carried through the work automatically.

This approach keeps service, environment, request, tenant, and workflow details consistent without requiring every message to repeat them manually. It also reduces mistakes in field naming and makes related records easier to retrieve as a group.

Context should follow the operation across asynchronous work and service boundaries where possible. Only values that genuinely apply to the whole scope should be inherited.

## Exception logging

Exception logs describe failures with enough evidence to understand both the error and the operation in which it occurred. Useful exception context includes the exception type, message, stack information, operation, outcome, and relevant correlation identifiers.

An exception should normally be recorded where it is handled, changes the outcome, or reaches a meaningful system boundary. Logging the same exception at every layer creates duplicates that exaggerate incident volume and obscure the original failure. Expected validation or domain outcomes may deserve a normal event rather than an exception record.

## Correlation ID and request ID

A correlation ID is an application-defined identifier for events belonging to the same broader operation or workflow. Its scope may cover several requests, background tasks, or messages when they participate in one business activity.

A request ID identifies one request at a particular boundary. It remains useful in systems that do not have distributed tracing and can help locate every log produced while that request was processed.

These identifiers are related but not interchangeable. Their value comes from a clearly defined scope and consistent propagation.

## Trace ID and span ID

A trace ID identifies the complete end-to-end journey of a distributed operation. Every span in the trace shares it, and logs that carry it can be connected to the same journey.

A span ID identifies one unit of work within that trace. Adding both identifiers to a record locates the event within the whole request and at the precise operation that emitted it.

Trace and span identifiers should remain structured fields. They are excellent lookup and correlation values but are usually poor index labels because almost every operation creates a unique value.

## Log correlation

Log correlation is the practice of joining records that belong to the same activity and connecting them to other telemetry. Reliable correlation depends on propagating shared identifiers across boundaries and recording them consistently.

A typical investigation can move from a request ID to its logs, from a trace ID to the distributed journey, and from a span ID to the exact operation. Matching timestamps and service names can support the investigation, but timing alone is not a dependable substitute for identity.

## Log filtering and querying

Filtering narrows an existing result set. It includes or excludes records by attributes, severity, identifiers, parsed values, or text. Filters are most effective after the search has already been limited to the relevant time range and sources.

Querying describes the complete evidence request. A query can select sources, combine conditions, parse fields, group results, and derive measurements over time. Good queries start with the smallest meaningful scope and add detail only as needed.

## Loki

Loki organizes logs into streams. A stream is defined by a set of indexed labels, usually small and stable dimensions such as service, environment, or region. The detailed log content is stored in compressed chunks and searched only after relevant streams have been selected.

This design makes label choice important. Labels should have a bounded set of values that are useful for selecting broad sources. Request IDs, trace IDs, user IDs, and other highly unique values should remain structured fields rather than labels. They can still be searched after the appropriate streams are selected.

## Fundamental LogQL

LogQL is Loki's query language. A log query behaves like a pipeline evaluated from left to right:

1. **Select streams.** Begin with indexed labels to limit the query to relevant sources.
2. **Filter lines.** Keep or exclude records based on their content.
3. **Parse fields.** Extract structured values so later stages can evaluate them.
4. **Refine results.** Compare parsed values, adjust the displayed fields, or remove noise.
5. **Measure over time.** Turn matching records into counts, rates, or other time-based views when a numeric answer is needed.

The stream selector is the essential starting point. Narrow label selection and a sensible time range reduce the amount of content that later pipeline stages must inspect. Parsing should happen after inexpensive narrowing whenever possible.

## A practical mental model

Treat each log as one part of a connected explanation:

- The message tells a person what happened.
- The level expresses its significance.
- Attributes preserve the event and resource context.
- Request, correlation, trace, and span identifiers connect the record to related work.
- Loki stores records in streams selected by bounded labels.
- LogQL narrows, parses, refines, and measures the evidence.

The goal is not to record everything. It is to preserve enough consistent evidence to answer important questions without burying those answers in noise.
