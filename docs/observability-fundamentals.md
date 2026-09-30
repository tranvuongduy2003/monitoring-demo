# Observability Fundamentals

Observability is the practice of understanding a system through the signals it produces. It helps teams move from noticing that something is wrong to explaining what happened, where it happened, and why.

This guide introduces the core ideas: monitoring, observability, telemetry, instrumentation, the three primary telemetry signals, and the relationship between monitoring and observability.

## Monitoring

Monitoring is the continuous collection and evaluation of information about a system's health and behavior. It answers known questions such as:

- Is the service available?
- Is latency above an acceptable threshold?
- Is the error rate increasing?
- Is a resource close to capacity?

Monitoring usually combines measurements, dashboards, thresholds, and alerts. It is most effective when the expected healthy state and important failure conditions are already understood.

Good monitoring focuses on outcomes that matter. A small set of meaningful indicators is more useful than a large collection of measurements with no clear purpose. Common indicators include availability, request rate, response time, error rate, queue depth, and resource utilization.

## Observability

Observability is the ability to understand a system's internal state from its external outputs. In practice, it is the ability to investigate both expected and unexpected behavior by asking new questions of the available evidence.

An observable system helps answer questions such as:

- Which users or operations are affected?
- Where does a slow request spend its time?
- What changed before the behavior began?
- Is the problem isolated to one dependency, region, or workload?
- How are multiple symptoms connected?

Observability is not a single tool or data type. It is an outcome created by useful telemetry, consistent context, effective exploration, and shared operational knowledge. More data does not automatically create better observability; the data must be relevant, understandable, and connected.

## Telemetry

Telemetry is the data a system emits so its behavior can be observed from the outside. It is the evidence used by monitoring and observability practices.

Useful telemetry usually describes:

- **What happened:** the event, measurement, or operation.
- **When it happened:** an accurate timestamp and duration where relevant.
- **Where it happened:** the service, instance, environment, region, or dependency.
- **Who or what was affected:** the request, tenant, operation, or workload category.
- **How events relate:** shared identifiers and attributes that connect signals.

Telemetry should be designed around questions people need to answer. Excessive detail raises storage and analysis costs, while missing context makes investigation difficult. The goal is sufficient, reliable evidence with controlled volume and consistent meaning.

## Instrumentation

Instrumentation is the process of making a system produce telemetry. It defines which events, measurements, and operations are recorded and which context accompanies them.

Instrumentation may be automatic, manual, or a combination of both:

- **Automatic instrumentation** captures common framework and platform behavior with little application-specific effort.
- **Manual instrumentation** adds domain meaning, such as the stage of a business process or the reason an operation was rejected.
- **Infrastructure instrumentation** describes hosts, containers, networks, queues, databases, and other supporting resources.

Effective instrumentation is intentional. Signal names and attributes should be consistent, sensitive information should be excluded, and high-cardinality values should be controlled. Every signal should support a clear operational or business question.

## Logs, Metrics, and Traces

Logs, metrics, and traces provide complementary views of a system. None is universally superior; each is suited to different questions.

### Logs

Logs are timestamped records of discrete events. They preserve detailed context about what happened at a particular moment.

Logs are especially useful for:

- Explaining an error or unusual decision.
- Recording lifecycle and security-relevant events.
- Capturing rich context for a specific occurrence.
- Reviewing a sequence of events within one component.

Structured logs store important details as named fields rather than embedding everything in free-form text. This makes filtering, grouping, and correlation more reliable.

### Metrics

Metrics are numeric measurements aggregated over time. They provide a compact view of trends and system-wide behavior.

Metrics are especially useful for:

- Tracking rates, totals, current values, and distributions.
- Visualizing trends over minutes, hours, or longer periods.
- Comparing behavior across services or environments.
- Driving thresholds, objectives, and alerts.

Metrics are efficient at answering how much, how often, and how behavior changes over time. Their dimensions must remain bounded so that the number of unique time series stays manageable.

### Traces

Traces represent the path of a request or operation across components. A trace contains spans, where each span describes one unit of work and its relationship to the larger operation.

Traces are especially useful for:

- Locating latency within a distributed request.
- Understanding service and dependency relationships.
- Identifying the component in which an error originated.
- Following asynchronous or multi-step operations end to end.

Trace context must travel with the operation so separate spans can be assembled into a coherent journey.

### How the signals work together

The strongest investigations move between signals:

1. A metric reveals a change in overall behavior.
2. A trace identifies the request path and the slow or failing operation.
3. A log explains the detailed event or decision at that point.

Correlation fields—especially service identity, timestamps, and trace identifiers—make this movement possible. The signals remain distinct, but shared context turns them into a connected explanation.

## Monitoring vs. Observability

Monitoring and observability overlap, but they emphasize different capabilities.

| Dimension | Monitoring | Observability |
|---|---|---|
| Primary goal | Detect and communicate known unhealthy conditions | Explain system behavior, including unfamiliar conditions |
| Typical starting point | A predefined indicator, threshold, or alert | A question, symptom, or pattern that requires investigation |
| Common questions | Is it healthy? Is a limit exceeded? | Why is this happening? What is connected to it? |
| Main interaction | Review indicators and respond to alerts | Explore, correlate, narrow, and form explanations |
| Best suited for | Repeated operational conditions and service objectives | Complex systems and unexpected failure modes |
| Success looks like | Important conditions are detected quickly and reliably | People can reach a trustworthy explanation efficiently |

Monitoring is a focused use of telemetry. Observability is the broader capability that makes the telemetry explorable for questions that were not fully anticipated. Mature operations need both: monitoring provides dependable awareness, while observability supports deeper understanding.

## A practical mental model

Think of the concepts as a chain:

1. **Instrumentation** creates signals at meaningful points in a system.
2. **Telemetry** carries those signals with enough context to interpret them.
3. **Logs, metrics, and traces** provide complementary forms of evidence.
4. **Monitoring** watches selected evidence for known conditions.
5. **Observability** uses the connected evidence to investigate any important question.

The quality of the final insight depends on every link. Clear questions guide instrumentation; consistent context improves correlation; and well-chosen signals make both detection and investigation faster.
