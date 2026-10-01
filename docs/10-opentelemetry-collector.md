# OpenTelemetry Collector

The OpenTelemetry Collector is a vendor-neutral service for receiving, processing, and exporting telemetry. It sits between telemetry producers and destinations so that routing, transformation, protection, and delivery policy do not have to live inside every application.

The Collector is not a telemetry database or an analysis interface. It moves and shapes data in flight. Downstream observability systems remain responsible for durable storage, querying, dashboards, and alerts.

## Collector architecture

The Collector is built from three primary component roles:

1. **Receivers** accept telemetry from applications, agents, other Collectors, or external systems.
2. **Processors** apply ordered policies to the accepted telemetry.
3. **Exporters** encode and send the resulting telemetry to its next destination.

A fourth concept, the **pipeline**, connects component instances into a running data path. Merely declaring a receiver, processor, or exporter does not make it active; an enabled pipeline must reference it.

This design separates telemetry generation from telemetry delivery. Applications describe their behavior using instrumentation, while the Collector can independently decide where the telemetry goes, which attributes it carries, which records are kept, and how efficiently it is delivered.

Collector topology is flexible. A Collector can run close to each workload as an agent, as a shared gateway for many workloads, or in multiple tiers. An agent placement can handle local collection and enrichment, while a gateway can centralize routing, filtering, sampling, and backend access. The same component model applies in each position.

## Receivers

A receiver defines how telemetry enters the Collector. Depending on the receiver type, it might listen for pushed data, scrape a target, read from a queue, or accept data from another Collector.

Its core responsibilities are to:

- Speak the source-facing protocol.
- Accept and decode incoming data.
- Translate that data into the Collector's internal trace, metric, or log representation.
- Pass the resulting telemetry to every pipeline that references that receiver for the matching signal.

A receiver does not choose the final destination. That responsibility belongs to the rest of the pipeline. It also does not become active merely because it is defined; at least one enabled pipeline must include it.

Receivers are signal-aware. Some can produce only one signal, while others can accept traces, metrics, and logs. A receiver can be shared by multiple compatible pipelines, allowing one ingress point to feed more than one processing and delivery path.

## OTLP Receiver

The OTLP Receiver accepts telemetry sent with the OpenTelemetry Protocol. It is the natural ingress point for OpenTelemetry SDKs, agents, and other Collectors that export OTLP.

The receiver can expose two transport bindings:

- **OTLP/gRPC** accepts the gRPC transport, commonly on port 4317.
- **OTLP/HTTP** accepts HTTP requests, commonly on port 4318 with separate paths for traces, metrics, and logs.

These transports carry the same OpenTelemetry signal model, but they are not interchangeable. A sender using OTLP/gRPC must reach a gRPC listener; a sender using OTLP/HTTP must reach an HTTP listener with the expected signal path.

The OTLP Receiver can accept traces, metrics, and logs, but each signal still needs a matching pipeline. Enabling OTLP ingress does not automatically route every accepted signal to an exporter.

The clearest mental model is that the receiver establishes a protocol boundary. It terminates one OTLP hop, turns the request into Collector data, and hands that data to the configured pipelines. Any later export is a separate delivery hop with its own outcome.

## Processors

Processors apply policy between reception and export. They can enrich, filter, transform, sample, group, or protect telemetry depending on the processor type.

Processor order matters. Each processor receives the output of the previous processor and passes its own output to the next component. Filtering before enrichment can therefore produce a different result from filtering after enrichment. The order should express a deliberate sequence of decisions, not just a list of desired features.

A practical way to reason about the sequence is:

1. Protect the Collector from overload.
2. Apply the transformations and selection policies the signal requires.
3. Prepare the resulting records for efficient delivery.

Processors are part of an in-memory data path. They are not a substitute for durable buffering or storage. If the process stops, telemetry held only in processor memory is not guaranteed to survive.

## Batch Processor

The Batch Processor groups telemetry into larger units before handing it to an exporter. A batch is normally released when it reaches a target size or when a timeout expires.

Batching reduces the overhead of export because many telemetry records can share one request, one encoding operation, and one network exchange. This commonly improves throughput and makes better use of destination-facing connections.

Batching introduces a deliberate tradeoff:

- Larger batches can reduce request overhead.
- Waiting for a batch can add delivery latency.
- Buffered records consume memory.
- A timeout is needed so low-volume traffic does not wait indefinitely.

The Batch Processor prepares telemetry for export, but it is not itself a durable queue. Exporter-side queue and retry behavior addresses a different concern: holding data while a destination is slow or temporarily unavailable.

## Memory Limiter

The Memory Limiter protects Collector stability by monitoring memory pressure and applying backpressure before the process exhausts its available memory.

When memory crosses a configured soft threshold, the processor can refuse new telemetry. A retry-capable upstream component can then slow down and try again, allowing the Collector to recover. When memory reaches a hard threshold, the limiter can trigger more aggressive memory recovery.

The limiter should appear early in a pipeline so that excess telemetry is rejected before later processors allocate additional memory or perform expensive work. This placement makes the limiter a guard for the processing path rather than a last check after the work has already happened.

Backpressure is useful only when it can propagate. If an upstream sender or receiver cannot retry, refused telemetry may be dropped. The limiter therefore preserves Collector availability, but it cannot guarantee lossless delivery by itself.

Memory protection also depends on realistic limits. A threshold that is too high may not leave enough headroom for the runtime and other components to recover. A threshold that is too low can cause unnecessary refusal during normal bursts. The intended outcome is controlled degradation under overload rather than process failure.

## Exporters

An exporter sends pipeline output to its next destination. It owns the destination-facing protocol and the mechanics required to communicate with that destination.

Exporter responsibilities commonly include:

- Encoding telemetry in the destination's accepted format.
- Establishing the network connection.
- Applying transport security and authentication.
- Enforcing request timeouts.
- Responding to retryable failures or backpressure according to its delivery behavior.

An OTLP exporter can send data to another Collector or an OTLP-capable backend. Other exporters adapt the Collector's internal data to backend-specific protocols.

Exporters do not decide which data reaches them. Receivers and processors establish that path, and the pipeline connects the resulting stream to one or more exporters. One pipeline can fan out to multiple destinations, while the same exporter instance can be reused by multiple compatible pipelines.

An accepted export confirms the result of that one delivery hop. If the destination is another Collector, the telemetry may still need to pass through more processing and export stages before it reaches durable storage.

## Pipelines

A pipeline is a signal-specific composition of receivers, processors, and exporters. Conceptually, it reads as a sentence:

> Accept this signal from these sources, apply these policies in this order, then deliver the result to these destinations.

Each pipeline handles one signal type: traces, metrics, or logs. A traces pipeline cannot substitute for a metrics pipeline even when both reference component instances with similar names.

A pipeline contains:

- One or more receivers.
- Zero or more processors in a defined order.
- One or more exporters.

Multiple receivers create **fan-in**, where different ingress paths feed the same policy and destination path. Multiple exporters create **fan-out**, where the same processed telemetry is delivered to several destinations.

Component reuse is intentional. One OTLP Receiver can feed separate pipelines for traces, metrics, and logs. A shared Memory Limiter or Batch Processor can express common policy across compatible pipelines. An exporter can receive data from more than one pipeline when it supports those signals.

Reuse also means changes can have a wider effect than expected. When several pipelines reference the same component instance, its behavior is shared across those paths. Separate component instances are appropriate when signals or destinations need distinct policies.

The complete Collector mental model is therefore:

1. A receiver establishes how a signal enters.
2. A pipeline selects that receiver and defines the signal path.
3. Processors apply ordered policy, with the Memory Limiter protecting the path and the Batch Processor preparing efficient delivery.
4. Exporters send the result to one or more next-hop destinations.
5. Downstream systems store, analyze, or relay the telemetry.

Keeping these roles distinct makes Collector behavior easier to reason about: receivers govern ingress, processors govern in-flight policy, exporters govern egress, and pipelines make the relationships operational.
