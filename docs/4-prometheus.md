# Prometheus

Prometheus is a metrics monitoring system built around labeled time series. Its central server discovers endpoints, pulls their current measurements at regular intervals, stores the resulting samples in a time-series database, and evaluates queries and rules over that history.

The most useful mental model is a repeating loop:

1. A system exposes measurements directly or through an exporter.
2. Prometheus discovers the system as a target.
3. Prometheus scrapes that target on a schedule.
4. The returned samples are appended to labeled time series in the TSDB.
5. Queries, recording rules, and alerting rules evaluate the stored series.

## Prometheus architecture

The Prometheus server is the center of the architecture. It owns target discovery, scrape scheduling, local time-series storage, query evaluation, and rule evaluation. Monitored applications and exporters sit outside the server and expose metric snapshots for it to collect.

This design separates measurement from monitoring. An application is responsible for describing its own behavior as metrics. Prometheus is responsible for deciding which endpoints to collect from, when to collect from them, how to retain their samples, and how to evaluate the resulting history.

Prometheus is commonly paired with other components. Visualization tools query it for charts and exploration. An alert-management layer can receive firing alerts and handle grouping, routing, silencing, and notifications. These components extend the monitoring workflow, but the Prometheus server remains responsible for collecting metrics and evaluating its rules.

## Pull model

Prometheus normally uses a pull model: the Prometheus server initiates collection by requesting metrics from known targets. A target does not continuously send every observation to Prometheus. Instead, it maintains a current metric snapshot that Prometheus reads.

The pull model gives the monitoring system control over collection frequency and target health. Prometheus knows which targets should be reachable and when each scrape should occur. A failed request can therefore be represented as a scrape failure rather than being confused with a valid metric value of zero.

Pull also creates a clear operational boundary. The monitored service exposes measurements, while Prometheus owns collection policy. This makes it possible to change a scrape interval or stop scraping a target without changing the target's internal behavior.

The pull model still depends on reachability. Prometheus must be able to connect to each target. Short-lived or isolated workloads may need a different bridge, but the main Prometheus mental model remains server-initiated collection.

## Scraping

A scrape is one collection attempt against one target. Prometheus sends a request, reads the exposed metric families, applies target metadata and labels, and appends the returned samples to their matching time series.

Each successful scrape is a snapshot. Repeating snapshots create history. If a counter reports a larger total at the next scrape, Prometheus stores the new value; rate calculations can later interpret the change between samples. If a gauge changes, the next sample records its new state.

A failed scrape is not the same as a successful scrape that returns zero. Failure means Prometheus could not obtain a valid snapshot. Preserving that distinction is essential because zero may be a correct and meaningful measurement.

## Scrape interval

The scrape interval is the time between collection attempts. It determines the temporal resolution of the stored data.

A shorter interval can reveal brief changes and gives rules newer data to evaluate, but it increases network traffic, sample ingestion, storage use, and query volume. A longer interval reduces those costs but can hide short-lived behavior and delays the arrival of new evidence.

The right interval depends on how quickly the observed system can change, how soon a condition must be detected, and how much collection cost is acceptable. Faster is not automatically better; the interval should match the decisions that the metrics support.

## The `/metrics` endpoint

`/metrics` is the conventional HTTP endpoint used to expose a Prometheus-readable metric snapshot. It presents metric names, label sets, values, and supporting metadata in an exposition format.

The endpoint represents current metric state rather than a historical query API. Prometheus creates history by returning to the endpoint repeatedly. The target does not need to remember every scrape; it needs to provide a consistent current view when requested.

Not every system uses that exact path, but `/metrics` is the widely recognized convention and a useful default mental model.

## Targets

A target is an endpoint Prometheus intends to scrape, together with the labels that describe it. Targets may be healthy, failing, newly discovered, or removed from the active set.

The target view connects discovery with collection. It answers which endpoints Prometheus currently knows about, which metadata became labels, when collection last succeeded, and whether an endpoint is presently reachable.

A target is not a time series. One target can expose many metric families, and each unique metric name plus label set becomes a separate time series after scraping.

## Jobs

A job is a logical group of targets that share one purpose. All instances of the same API, database exporter, or infrastructure role might belong to one job.

The job label provides a stable group identity even when individual endpoints change. Queries can aggregate across a job to describe the service as a whole, or separate its instances to locate uneven behavior.

Jobs are about monitoring roles, not necessarily business tasks. A background worker service can be a job even though the workers themselves execute many application jobs.

## Instances

An instance identifies one concrete scrape endpoint within a job. It distinguishes the individual process, host, or exporter whose metrics were collected.

The relationship is hierarchical but flexible: a job usually contains multiple instances, and each instance is scraped as a target. The job answers "which shared role?" while the instance answers "which particular member?"

Stable job labels make group-level views possible. Instance labels make failures and outliers locatable. Both are added to scraped series so that the stored data retains its source identity.

## Exporters

An exporter is an adapter for a system that does not expose Prometheus metrics natively. It reads the system's own status interface, counters, or statistics and translates them into Prometheus metric families.

Prometheus scrapes the exporter as a target. The exporter then represents the monitored system within the pull model. This pattern is common for operating systems, databases, network devices, and established services whose native telemetry format differs from Prometheus exposition.

An exporter should expose measurements with stable meaning and useful dimensions. It does not replace the source system or store long-term history; it makes the source's current statistics collectable.

## Service discovery

Service discovery supplies Prometheus with a changing catalog of potential targets. Instead of depending only on a manually maintained list, Prometheus can read service membership from an orchestration platform, cloud environment, registry, or other discovery source.

Discovered metadata can be transformed into labels and used to decide which endpoints remain active. The lifecycle is continuous:

1. Endpoints are discovered with metadata.
2. Labels are selected, normalized, or changed.
3. Relevant endpoints become active targets.
4. Prometheus scrapes them according to the job's policy.
5. Targets disappear when discovery no longer reports them.

Discovery and scraping solve different problems. Discovery answers where the endpoints are now. Scraping answers what measurements those endpoints expose now.

## TSDB

The Prometheus time-series database, or TSDB, stores timestamped numeric samples. A metric name and its complete label set identify one time series; every scrape can append another sample to that identity.

The TSDB is designed around time-ordered ingestion and time-range queries. Recent samples first accumulate in memory and a write-ahead record protects incoming data. Samples are then organized into persistent time blocks. Indexes connect label matchers to the relevant series, allowing queries to select data by identity and time range.

The important conceptual distinction is between identity and history. Labels define which series a sample belongs to. Timestamps and values form that series' changing history.

## Basic retention

Retention controls how much local history Prometheus keeps. The simplest view is a moving time window: new blocks enter the window, older blocks move toward its boundary, and data beyond the boundary becomes eligible for deletion.

Longer retention enables comparisons over a larger historical period, but it requires more disk and increases the amount of data the server must manage. Shorter retention reduces local storage needs but limits retrospective analysis.

Retention does not improve resolution. It determines how long samples remain available, while the scrape interval determines how densely those samples were collected. These two choices should be considered together when estimating storage and deciding which historical questions must remain answerable.

## Recording rules

Recording rules evaluate an expression at regular intervals and save the result as a new time series. They turn a frequently repeated calculation into precomputed data.

This is useful when many dashboards or downstream rules need the same aggregation, or when a complex query would otherwise be recalculated repeatedly. A well-named recorded series also creates a shared definition for an important measurement.

The result of a recording rule behaves like other stored time series. It has a metric identity, labels, timestamps, and values. Recording rules therefore exchange some additional storage and evaluation work for faster, more consistent later queries.

## Alerting rules

Alerting rules repeatedly evaluate whether a condition is true. They track alert state rather than storing only a calculated display value.

An alert begins inactive. When its condition becomes true, it may enter a pending state so that brief fluctuations do not immediately create a firing alert. If the condition remains true for the required duration, the alert becomes firing. When the condition is no longer true, it returns to inactive.

Prometheus determines the alert state and attaches useful labels and annotations. A separate alert-management component commonly handles deduplication, grouping, routing, silencing, and notification delivery.

Recording and alerting rules answer different recurring questions:

| Rule type | Core question | Result |
|---|---|---|
| Recording rule | What should be calculated ahead of time? | A new stored time series |
| Alerting rule | What condition currently needs attention? | Alert state that may become firing |

Both rule types run on an evaluation interval. The scrape interval controls how often source samples arrive. The evaluation interval controls how often rules reconsider the data that is available.
