# Application Monitoring

Application monitoring explains how software behaves while it serves real work. It connects technical activity—requests, queries, cache lookups, remote calls, domain operations, and failures—with the outcomes users and dependent systems experience.

Infrastructure signals remain important, but they do not answer every application question. A host can have spare capacity while requests fail because a dependency times out. A database can appear healthy while an exhausted connection pool makes application calls wait. Application monitoring keeps these software boundaries visible.

## HTTP metrics

HTTP metrics summarize populations of requests at a consistent boundary. The most useful starting signals are:

- **Request rate:** the amount of demand received over time.
- **Duration:** the distribution of elapsed time from request arrival to response completion.
- **Error rate:** failed outcomes as a count or proportion of attempts.
- **Requests in flight:** work currently active and competing for application capacity.

These signals gain meaning through bounded dimensions such as service, route, method, status class, and environment. A route template is usually more useful than a raw path because it groups equivalent requests instead of creating a new series for every identifier in a URL.

The measurement boundary must remain consistent. If request rate is measured at an edge proxy while errors are measured only inside one application instance, the two populations may differ. Ratios and comparisons are trustworthy only when their numerator and denominator describe compatible work.

Duration should be treated as a distribution. An average can hide a slow minority, while a single high percentile can become unstable when traffic is sparse. Compare several views and separate successful and failed outcomes when they have different timing behavior.

## Database metrics

Database monitoring from the application perspective includes everything required to complete database work, not only execution inside the database engine.

A database operation can spend time:

1. Waiting for a connection from a pool.
2. Traveling across the network.
3. Waiting or executing inside the database.
4. Returning and decoding results.

Separating these phases makes the bottleneck easier to locate. Rising connection-acquisition time suggests pool pressure even when query execution remains stable. Rising execution time may point toward contention, inefficient access, changing data volume, or resource pressure in the database.

Useful application-facing database signals include query duration, operation throughput, timeout and error counts, pool utilization, waiting operations, and connection acquisition time. Group operations by stable names or normalized query shapes rather than raw statements containing unique values.

Failures should retain their meaning. A timeout, unavailable connection, constraint violation, and cancelled operation lead to different decisions. A single undifferentiated database error count hides that distinction.

## Cache metrics

A cache creates two principal paths: a hit returns data nearby, while a miss requires work from an origin. Monitoring should describe both the decision and the cost of each path.

The hit ratio is the proportion of lookups served by the cache. It is useful, but not sufficient by itself. A lower ratio may be harmless when misses are cheap, while a small decline can be serious when each miss triggers an expensive query or remote request.

Important cache signals include:

- Hit and miss counts or rates.
- Lookup duration for both hit and miss paths.
- The extra latency and origin load caused by misses.
- Entry count and memory use relative to capacity.
- Evictions, expirations, rejected writes, and failed operations.
- Refill or refresh activity when data is repopulated.

Eviction is not automatically an error. It may be normal policy, evidence of capacity pressure, or a sign that useful entries cannot remain resident long enough. Interpret it together with hit ratio, memory pressure, working-set size, and origin demand.

## Dependency monitoring

Dependencies include remote services, queues, identity systems, storage services, external APIs, and any other boundary the application must cross to complete work. Monitor them from the caller’s point of view because caller-observed availability and latency determine the application outcome.

For each meaningful dependency and operation, ask:

- Which stable target received the call?
- How many calls were attempted?
- How long did the caller wait?
- Did the call succeed, fail, time out, or get cancelled?
- How many retries or parallel calls did one user action create?

Retries can improve resilience while amplifying load and hiding an unstable dependency. A successful final response may have required several failed attempts and much more latency. Preserve attempt count and total caller-observed duration so this cost remains visible.

Tracing adds causal structure to these metrics. It can show which user request triggered a dependency call, whether several calls happened sequentially or in parallel, and which boundary dominated the total duration.

## Custom metrics

Custom metrics represent application or domain behavior not captured by standard instrumentation. Good examples describe stable events or states that teams genuinely use to compare behavior, detect change, or make a decision.

Start with the question before choosing a metric:

1. What behavior or outcome needs to be understood?
2. Is the value an accumulating event, a current level, or a distribution?
3. Which dimensions are necessary for comparison?
4. What action could follow a meaningful change?

A counter accumulates discrete events and supports rates or changes over time. A gauge represents a current level that can rise or fall. A histogram records a distribution of observed values such as duration or size.

Metric names, units, and definitions should remain stable. If the meaning changes, historical comparisons become misleading even when the time series keeps the same name.

Dimensions multiply the number of time series. Prefer bounded categories such as operation type, outcome, plan, or region when they support a real comparison. Nearly unique values such as request identifiers, user identifiers, and raw error messages belong in traces or logs, where individual-event context is expected.

## Custom spans

Custom spans make meaningful application operations visible inside a distributed trace. Automatic instrumentation commonly captures HTTP, database, and messaging boundaries. Custom spans fill the gaps around domain work such as validating a basket, reserving inventory, applying a policy, or producing a report.

A useful custom span:

- Represents one coherent unit of work.
- Has a stable, low-cardinality name.
- Inherits the active parent context.
- Records attributes that help compare or filter operations.
- Records events for meaningful moments during the operation.
- Sets status according to the operation’s outcome.

Span boundaries should help explain elapsed time and causality. Creating a span for every trivial function adds noise and overhead without improving the investigation. A span is valuable when an investigator could reasonably ask whether that unit ran, how long it took, what it called, or why it failed.

Exceptions and span status are related but not identical. An exception event records what happened. Status expresses the outcome of the operation represented by the span. A handled exception may not make that operation fail, while an unsuccessful operation may not produce a language exception.

## Error monitoring

Error monitoring turns exceptions and failed outcomes into evidence that can be grouped, prioritized, and connected to application context.

Counting every event separately creates noise, so similar events are often grouped into an error identity using exception type, stack location, message structure, or other stable characteristics. Grouping should be stable enough to show recurrence without combining unrelated defects.

Priority depends on more than event count. Useful questions include:

- Is the failure new, recurring, or increasing?
- How many requests, users, tenants, routes, or regions are affected?
- Did it begin after a particular release or configuration change?
- Does it correlate with a dependency, database, cache, or capacity signal?
- Is it handled internally, or does it change the user-visible outcome?

Error monitoring becomes much more actionable through correlation. A shared trace or request context can connect an error to the operation that produced it, the dependency calls around it, the application version, relevant logs, and the eventual HTTP or domain outcome.

Sensitive data deserves deliberate treatment. Exception messages, stack frames, request attributes, and custom context can accidentally contain credentials or personal information. Keep only what investigation requires and apply consistent redaction and access controls.

## A compact mental model

- **HTTP metrics** describe demand, duration, outcomes, and concurrency at the request boundary.
- **Database metrics** separate pool pressure and application wait from query execution.
- **Cache metrics** connect hit ratio with miss cost, origin load, and capacity pressure.
- **Dependency monitoring** measures remote work as the caller experiences it.
- **Custom metrics** summarize stable domain behavior for aggregation and comparison.
- **Custom spans** reveal meaningful units of work and their causal relationships.
- **Error monitoring** groups failures and adds impact, release, and execution context.
- Strong application monitoring connects these views rather than interpreting any one signal in isolation.
