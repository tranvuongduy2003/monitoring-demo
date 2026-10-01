# OTLP

The OpenTelemetry Protocol, usually shortened to OTLP, is the standard delivery protocol for OpenTelemetry data. It defines how telemetry is encoded, transported, and acknowledged between a client and a server.

In this model, a client is any node sending telemetry and a server is any node receiving it. An instrumented application can therefore be an OTLP client when it exports data to a Collector. That Collector can then act as an OTLP client when it forwards the data to another Collector or an observability backend.

OTLP is a hop-by-hop delivery protocol. A response confirms the outcome of one exchange between one sender and one receiver; it does not guarantee that telemetry has reached the final backend in a multi-hop pipeline.

## OTLP

OTLP gives traces, metrics, and logs a shared delivery contract. That contract combines several layers:

- The OpenTelemetry data model defines the telemetry structures being moved.
- Protocol Buffers provide a common schema for representing those structures.
- A transport binding defines how export requests and responses cross the network.
- Response and retry semantics help senders react to acceptance, partial success, backpressure, and failure.

OTLP transports telemetry records. It is separate from context propagation, which carries a small amount of active trace context alongside a live application request. Propagation connects work while it is happening; OTLP later delivers the telemetry that describes that work.

OTLP also remains separate from storage and analysis. A receiver may be a Collector that processes and forwards data, or a backend that stores and queries it. The protocol does not require either role to be the final destination.

## OTLP/gRPC

OTLP/gRPC uses gRPC as the transport and binary Protocol Buffers as the message encoding. Traces, metrics, and logs each have a dedicated export service and request type. These services can share one gRPC target even though their export methods are distinct.

The default OTLP/gRPC port is 4317. A gRPC endpoint identifies a target such as a receiving host and port. It does not use the signal-specific URL paths defined for OTLP/HTTP.

gRPC commonly uses a persistent HTTP/2 connection. Its binary messages and established streaming infrastructure make it a natural fit for environments that already support gRPC well. The receiver must explicitly expose OTLP/gRPC; pointing a gRPC exporter at an OTLP/HTTP listener will not work even though both bindings carry the same OpenTelemetry data model.

Each export is a request followed by a response. A successful response means the receiving node accepted the request. Retryable failures and backpressure signals allow the exporter to wait and try again according to its retry policy.

## OTLP/HTTP

OTLP/HTTP uses HTTP POST requests. It carries the same Protocol Buffer message schema as OTLP/gRPC, either as binary Protobuf or as JSON-encoded Protobuf. Implementations can use HTTP/1.1 or HTTP/2.

The default OTLP/HTTP port is 4318. Stable signals use distinct default paths:

| Signal | Default path |
| --- | --- |
| Traces | `/v1/traces` |
| Metrics | `/v1/metrics` |
| Logs | `/v1/logs` |

These paths are part of request routing. Reaching the correct host and port is not enough if the URL path does not identify an endpoint the receiver exposes.

OTLP/HTTP often fits networks where HTTP proxies, gateways, load balancers, and request inspection are already standard. That operational familiarity does not make it semantically different from OTLP/gRPC: both carry the same signal model and both use request-response delivery. The transport mechanics and endpoint shapes are what differ.

## Endpoint configuration

Endpoint configuration begins with the transport. The protocol choice tells the exporter whether it should interpret the destination as a gRPC target or as an HTTP URL.

A base endpoint provides one common destination for multiple signals. With OTLP/HTTP, exporters derive the standard trace, metric, and log paths from the base. With OTLP/gRPC, the base identifies the shared gRPC target and the signal is selected through the service method rather than a URL path.

A per-signal endpoint overrides the common destination for one signal. This supports topologies in which traces, metrics, and logs go to different receivers or pass through different network routes. For OTLP/HTTP, a signal-specific endpoint is used as the complete destination, so its path must already identify the intended signal route.

Four questions prevent most endpoint mismatches:

1. Which transport does the exporter use: OTLP/gRPC or OTLP/HTTP?
2. Does the receiver expose that transport on the configured host and port?
3. For OTLP/HTTP, is the signal path present and correct?
4. Do TLS, authentication, request metadata, and network policy agree on both sides?

The address must also be reachable from the exporting process itself. An endpoint that works from an operator's workstation may be inaccessible from a container, cluster, or private network where the application runs.

The clearest mental model is: choose the transport, resolve the common destination, apply any signal-specific override, and then verify trust and reachability. That sequence keeps protocol selection, routing, and security as separate concerns.
