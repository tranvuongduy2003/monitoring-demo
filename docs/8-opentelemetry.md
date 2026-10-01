# OpenTelemetry

OpenTelemetry is a vendor-neutral framework for generating, enriching, processing, and transporting telemetry. It gives applications and libraries a shared vocabulary for traces, metrics, and logs without requiring one particular storage or analysis backend.

OpenTelemetry is not an observability backend. It does not replace the systems that store telemetry, run queries, build dashboards, or evaluate alerts. Its role is to make the path from software to those systems consistent and portable.

## OpenTelemetry architecture

The architecture separates telemetry creation from telemetry processing and telemetry analysis:

1. Application code and libraries perform work that should be observable.
2. Instrumentation uses the OpenTelemetry API to describe that work.
3. An OpenTelemetry SDK turns API activity into signal data according to application policy.
4. Exporters send the data directly to a backend or to an OpenTelemetry Collector.
5. Observability backends store, correlate, query, and visualize the data.

This separation avoids coupling instrumentation to a single destination. The same instrumentation can remain in place when an application changes its exporter, collection topology, or backend.

The OpenTelemetry Collector is an optional, separate process that can receive, process, and export telemetry. It can centralize concerns such as batching, filtering, enrichment, and routing, but the core OpenTelemetry model does not require every deployment to use one.

## API

The API is the stable contract used by instrumentation. It defines the concepts and operations needed to create telemetry, including tracers, meters, loggers, spans, measurements, log records, and context.

The API answers the question: **what should be recorded?**

Libraries should depend primarily on the API because a library should not decide how the host application samples, processes, or exports telemetry. This keeps library instrumentation reusable in applications with different observability policies.

API calls are designed to be safe when no SDK is configured. In that situation they normally produce no exported telemetry, allowing instrumented libraries to run without forcing an observability setup on every application.

## SDK

The SDK is the runtime implementation of the API. It turns instrumentation activity into signal data and applies the application's collection policy.

The SDK answers the question: **how should recorded telemetry be handled?**

Its responsibilities include:

- Creating and configuring providers for the telemetry signals.
- Associating telemetry with a resource.
- Applying trace sampling decisions.
- Aggregating metric measurements.
- Processing spans, measurements, and log records.
- Batching and exporting telemetry.

Keeping these responsibilities in the SDK lets application owners make deployment decisions without requiring instrumentation libraries to change.

## Automatic instrumentation

Automatic instrumentation observes supported frameworks, libraries, and runtimes with little or no change to application logic. It is especially useful for common technical boundaries such as incoming requests, outgoing requests, database calls, messaging operations, and runtime behavior.

Its main strengths are speed, consistency, and breadth. A team can establish useful baseline coverage across many services without manually describing every routine operation.

Automatic instrumentation is limited by what general-purpose instrumentation can infer. It can recognize that a request or database operation occurred, but it may not know the business purpose, customer-visible outcome, or domain milestone represented by that activity.

## Manual instrumentation

Manual instrumentation is telemetry added deliberately using knowledge of the application's domain. It can describe business operations, attach purposeful attributes, record meaningful events, and measure outcomes that frameworks cannot infer.

Its main strength is semantic depth. It explains why technical activity matters to the product or workflow.

Manual instrumentation requires design discipline. Too little leaves important behavior invisible; too much creates noise, cost, and maintenance work. Good manual instrumentation focuses on stable operations and context that help answer real diagnostic or operational questions.

Automatic and manual instrumentation are complementary. Automatic instrumentation supplies technical breadth, while manual instrumentation supplies domain depth.

## Resource

A resource describes the entity that produced telemetry. It is a collection of attributes shared by the spans, metric data, and log records associated with that entity.

Common resource context includes:

- Service name, version, and instance identity.
- Process, runtime, host, container, or function identity.
- Deployment environment and cloud context.

Resource attributes answer **who produced this telemetry?** They are distinct from attributes describing one particular request, measurement, or event.

A stable service identity is especially important. Without it, telemetry from different instances or deployments can be difficult to group and compare correctly.

## Semantic Conventions

Semantic Conventions define shared names and meanings for common telemetry concepts. They cover areas such as resources, HTTP, databases, messaging, RPC, exceptions, and many other technologies and operations.

Conventions can standardize:

- Attribute names and value meanings.
- Units and value formats.
- Span names and span kinds.
- Metric names and descriptions.
- How common operations and outcomes are represented.

Consistent semantics make telemetry portable and comparable. Dashboards, queries, alerts, and analysis tools can reason about data from different libraries and languages when those producers describe the same concept in the same way.

Semantic Conventions evolve. Instrumentation should treat them as a versioned contract and avoid inventing alternative names when a suitable stable convention already exists.

## Tracer

A tracer is the API entry point for creating spans. Spans represent timed operations and are connected by trace and parent relationships.

Tracers help answer questions such as:

- Where did a distributed request spend time?
- Which services and dependencies participated?
- Which operation failed?
- Which work happened sequentially or concurrently?

The tracer creates trace data, but context propagation is what allows independently created spans in different processes to remain part of the same distributed journey.

## Meter

A meter is the API entry point for creating metric instruments. Instruments record measurements that the SDK can aggregate across operations and time.

Meters support questions about overall system behavior:

- How often does something occur?
- What is the current level of a value?
- How is a population of durations or sizes distributed?

Metric instruments express the intended measurement behavior. The SDK and backend determine how those measurements are aggregated, transported, stored, and queried.

## Logger

A logger is the OpenTelemetry entry point for emitting log records. In many ecosystems, OpenTelemetry also provides a bridge that enriches records produced through an existing logging API rather than requiring application code to adopt a new logging interface.

Log records capture events at particular moments. When emitted during an active span, they can carry trace and span context so an operator can move between a log event and the distributed operation that surrounded it.

This correlation does not make logs and spans interchangeable. Logs retain event detail, while spans retain timed operation structure and causal relationships.

## Propagators

Propagators encode and decode distributed context at process and transport boundaries.

Before a request leaves a process, a propagator **injects** the current context into a carrier such as request headers or message metadata. When the request arrives, a propagator **extracts** that context so the receiver can create telemetry related to the existing distributed operation.

Propagators commonly carry trace context and may also carry baggage. They do not transport completed spans, metrics, or log records. They transport the small amount of context needed to preserve continuity while each process creates its own telemetry.

Propagation formats must be agreed upon by participants. OpenTelemetry commonly uses W3C standards for trace context and baggage, enabling services instrumented with different languages and vendors to continue the same trace.

## Putting the model together

Instrumentation uses the API to describe observable work. The SDK applies application policy and produces signal data. Resources identify the producer, while Semantic Conventions give common operations shared meaning. Tracers, meters, and loggers create complementary views of behavior. Propagators carry context across boundaries so those views can remain connected. Exporters or a Collector then move the telemetry to the systems responsible for analysis.

The result is a portable observability pipeline: instrumentation can remain stable while collection policy, topology, and backend choices evolve.
