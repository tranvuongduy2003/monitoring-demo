# Monitoring Methodologies

Monitoring methodologies provide repeatable starting questions. They reduce the chance that an investigation or dashboard overlooks a major class of system behavior, but they do not prescribe one universal set of charts or thresholds.

Three widely used approaches are RED, USE, and the Four Golden Signals. They overlap because they describe related parts of the same system from different boundaries:

- **RED** begins with work handled by a service.
- **USE** begins with finite resources that perform or support that work.
- **The Four Golden Signals** connect service experience and demand to failure and capacity pressure.

They are best treated as complementary lenses. A service symptom found with RED can lead to a constrained resource examined with USE. Saturation found with USE can explain the latency or errors visible in the Golden Signals.

## RED

RED stands for **Rate, Errors, and Duration**. It is most natural for request-driven and event-driven systems where work has a recognizable beginning and outcome: HTTP requests, remote procedure calls, jobs, messages, transactions, or similar operations.

### Rate

Rate measures how much work the service receives or completes per unit of time. The exact unit should match the service boundary. Requests per second may suit an API, while messages per minute, transactions per hour, or jobs per day may better describe other systems.

Rate establishes demand and gives context to the other signals. Ten failures mean something different during twenty attempts than during ten million attempts. A sudden drop can be as important as a spike because it may indicate lost traffic, failed upstream routing, or stopped processing.

### Errors

Errors measure unsuccessful outcomes. They may be explicit, such as a failed status, or implicit, such as a response that is technically successful but violates a correctness or timing expectation.

An error proportion is often more interpretable than a count because it relates failures to total demand. Both remain useful: the proportion communicates reliability, while the count communicates operational volume.

Errors should reflect the perspective of the monitored boundary. A dependency failure that the service handles successfully is different from a failure returned to the caller, even though both may deserve attention.

### Duration

Duration measures how long work takes. A distribution is more informative than a single average because requests rarely share one uniform latency. Percentiles or buckets reveal the slow tail that an average can conceal.

Successful and failed operations may need separate views. Fast failures can make overall latency appear to improve during an incident, while timeouts can make failed work much slower than successful work.

### What RED reveals

Together, the signals tell a compact service story:

1. Rate shows the demand placed on the service.
2. Errors show whether the service produces acceptable outcomes.
3. Duration shows the waiting experience before those outcomes.

RED is strong for detecting user-facing symptoms. It does not, by itself, identify which processor, disk, network link, pool, or downstream dependency caused them. That transition is where resource analysis and tracing become useful.

## USE

USE stands for **Utilization, Saturation, and Errors**. It begins with an inventory of finite resources and applies all three questions to every meaningful resource boundary.

Resources include physical components such as processors, memory, disks, and network interfaces. They also include logical capacity such as worker pools, connection pools, thread pools, queues, file descriptors, partitions, and rate limits.

### Utilization

Utilization describes how much of a resource is busy during a time interval. Depending on the resource, it may be expressed as a percentage, occupied units, active workers, used bytes, or another measure of consumed capacity.

The aggregation boundary matters. An average across many processors, disks, instances, or partitions can appear healthy while one member is fully occupied. Utilization should retain enough resource identity to expose local constraints without creating unnecessary cardinality.

### Saturation

Saturation describes demand that the resource cannot serve immediately. It often appears as queued work, waiting tasks, throttling, contention, rejection, paging, or another form of deferred demand.

Utilization and saturation are related but not identical. A resource can be highly utilized and still serve work without a queue. It can also exhibit waiting before a simple utilization measure reaches its apparent maximum, especially when the measure omits an internal bottleneck or averages across unequal components.

Saturation is often the earlier and more direct symptom of a capacity limit because users experience waiting, rejection, or slowdown rather than a utilization percentage.

### Errors

Resource errors are failures attributable to the resource or its operation. Examples include device faults, allocation failures, dropped packets, rejected connections, timeout conditions, and unrecoverable queue operations.

Errors should not be interpreted only as catastrophic hardware failure. Retries and recovery can hide them from the service outcome while still consuming capacity and increasing latency.

### Applying USE systematically

The method is an inventory discipline:

1. Identify each finite resource within the boundary.
2. Ask how its busy capacity is measured.
3. Find the evidence of waiting or unserved demand.
4. Identify the failures the resource can produce.
5. Repeat at smaller boundaries when an aggregate hides imbalance.

USE is especially effective for capacity analysis and infrastructure diagnosis. It becomes more meaningful when connected back to a service-level symptom, because resource pressure is important when it affects useful work or threatens to do so.

## Four Golden Signals

The Four Golden Signals are **Latency, Traffic, Errors, and Saturation**. They provide a compact view of service health that combines user-visible behavior with demand and capacity pressure.

### Latency

Latency is the time required to serve a request. Like RED duration, it should normally be understood as a distribution rather than a single average. Failed requests may need a separate view because their timing can differ sharply from successful requests.

### Traffic

Traffic is the demand placed on the system. Its unit depends on the service: requests, sessions, transactions, messages, bytes, or another measure of useful activity. Traffic gives scale to errors and latency and helps distinguish demand-driven behavior from internal change.

### Errors

Errors capture failed or unacceptable requests. This includes explicitly failed responses and can include implicit failure when the system returns an incorrect result or misses a defined expectation.

### Saturation

Saturation shows how close the system is to its limiting capacity. Queue depth, waiting work, throttling, and rejection may communicate saturation more directly than a broad utilization average. The relevant limit may belong to a logical pool or dependency rather than the most obvious machine resource.

### Relationship to RED and USE

The overlap is intentional:

| Four Golden Signal | Closest methodology relationship |
| --- | --- |
| Latency | RED duration |
| Traffic | RED rate |
| Errors | RED errors and USE errors |
| Saturation | USE saturation |

The Golden Signals therefore form a useful service overview, while RED provides a memorable service-operation lens and USE supplies deeper resource coverage.

## Choosing and combining the methods

Choose a starting lens based on the boundary under investigation:

| Method | Best starting boundary | Primary question |
| --- | --- | --- |
| RED | Request-driven service or operation | Is the service healthy from the path of its work? |
| USE | Finite infrastructure or logical resource | Which resource is approaching or exceeding capacity? |
| Four Golden Signals | Service health with capacity context | Are users affected, and is demand or capacity involved? |

A practical investigation can move through all three:

1. Golden Signals show rising latency during stable traffic and growing saturation.
2. RED confirms that one operation has slower duration and an increasing error proportion.
3. USE reveals a saturated connection pool with queued work and rejected acquisitions.

The methodology does not establish the cause by itself. It establishes systematic coverage and guides the next question. Root-cause analysis still depends on meaningful dimensions, topology, changes, traces, logs, and an understanding of how the system performs work.

## A compact mental model

- Use **RED** to follow work through a service boundary.
- Use **USE** to inspect capacity at a resource boundary.
- Use **the Four Golden Signals** to summarize service health and connect experience to pressure.
- Keep successful and failed work distinguishable.
- Prefer distributions and queues over averages that hide a slow tail or local bottleneck.
- Cross between methods when the evidence crosses from symptoms to constraints or from constraints back to user impact.
