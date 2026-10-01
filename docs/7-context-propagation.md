# Context Propagation

Distributed tracing depends on more than recording spans. Each service must receive enough context to connect its new work to the operation already in progress. Context propagation is the mechanism that preserves that continuity across process and network boundaries.

## Distributed Context

Distributed context is a small collection of metadata associated with an operation as it moves between services. It can contain:

- Trace identity and the identity of the active span.
- Trace options, such as whether the trace is sampled.
- Optional vendor-specific trace state.
- Carefully selected application baggage.

The context is not the trace or span itself. It is the information a receiver needs to create a new span with the correct relationship to upstream work.

## Context Propagation

Propagation has two complementary actions:

1. The sender **injects** the current context into a carrier owned by the transport.
2. The receiver **extracts** and validates that context before beginning its own operation.

After extraction, the receiver creates a new span. That span keeps the incoming trace ID and treats the incoming parent ID as its parent. The receiver generates a new span ID because it represents a new operation.

If the carrier is missing, unreadable, or invalid, the receiver cannot safely continue the upstream trace. It starts new trace context instead, creating a break in end-to-end continuity.

## W3C Trace Context

W3C Trace Context defines a vendor-neutral format for propagating trace information. It lets services, libraries, gateways, and observability tools participate in the same trace even when they come from different vendors.

The standard centers on two fields:

- **traceparent** carries the common trace identity and options required for continuation.
- **tracestate** carries optional, ordered vendor-specific state.

The two fields serve different purposes. `traceparent` establishes interoperable identity. `tracestate` adds information that participating vendors can understand without changing that identity.

## traceparent

The `traceparent` field has four ordered parts:

| Part | Purpose |
| --- | --- |
| Version | Identifies the version of the field format. |
| Trace ID | Identifies the complete distributed journey. It stays the same across participating spans. |
| Parent ID | Identifies the span that sent the request. It becomes the parent of the receiver's new span. |
| Trace flags | Carries trace-level options, including the sampled flag. |

The parent ID changes at each hop because every service creates a new span. The trace ID remains stable so all those spans can be assembled into one trace.

## tracestate

The optional `tracestate` field is an ordered list of vendor-specific entries. It enables tracing systems to preserve information needed by their own processing models while remaining interoperable with other participants.

Important properties of `tracestate` include:

- It accompanies `traceparent`; it does not replace it.
- Each entry is owned by a vendor or system and is opaque to other participants.
- Entry order matters. A system that updates its entry moves that entry to the left, associating it with the most recent `traceparent` update.
- A participant may update its own entry while forwarding the rest according to the standard's rules.

Application data does not belong in `tracestate`. Baggage exists for the separate purpose of propagating application-level context.

## HTTP Propagation

For HTTP, the carrier is the request header collection. The sender injects `traceparent`, optional `tracestate`, and optional baggage into the outgoing request headers. The server extracts those values before it starts the operation represented by its server span.

HTTP header names are case-insensitive. Proxies and gateways that participate in the request path should preserve valid propagation fields so that an infrastructure hop does not silently break trace continuity.

## gRPC Propagation

For gRPC, the carrier is the call metadata. The same logical W3C fields travel as text metadata using lowercase keys. The receiving side extracts them before invoking the server operation.

HTTP and gRPC differ in their carrier APIs, but the mental model is identical:

- Inject before the request leaves the caller.
- Transport the context with the request.
- Extract before receiver-side work begins.
- Create a new child span in the same trace.

A service does not extend the caller's span across the network. Each side records its own operation and connects those operations through parent-child context.

## Baggage Basics

Baggage is a collection of application-defined key–value properties that can propagate alongside trace context. It is useful when downstream participants need a small amount of shared context, such as a workflow category, tenant tier, or deployment region.

Baggage differs from trace context in several ways:

- It does not identify the trace or define span relationships.
- It is not automatically stored as a span attribute.
- It may travel through every downstream hop, so its cost and exposure can multiply.
- It should be copied into telemetry only when a specific value is useful and safe.

Good baggage values are small, stable, bounded, and non-sensitive. Secrets, credentials, personal data, large payloads, and unbounded identifiers are poor choices. Because callers may supply baggage, services should treat incoming values as untrusted input and apply validation and allow-listing at trust boundaries.

## Mental Model

Keep these responsibilities separate:

- **Trace context** answers: "Which trace is this, and which span called me?"
- **Tracestate** answers: "What tracing-system state must participating vendors preserve?"
- **Baggage** answers: "What limited application context should travel downstream?"
- **The carrier** answers: "Where does this transport place those values?"
- **Propagation** answers: "How are those values injected, transported, extracted, and used to continue work?"

When those boundaries remain clear, trace continuity is easier to reason about and application context is less likely to become an uncontrolled payload.
