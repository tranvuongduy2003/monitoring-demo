# Grafana

Grafana is a visualization and investigation layer for observability data. It connects to systems that store metrics, logs, traces, and other records, sends queries to those systems, and turns their results into dashboards, panels, exploratory views, annotations, and alert evaluations.

Grafana is usually not the system of record for the telemetry shown in a panel. A metric backend, log store, trace backend, database, or service retains the underlying data and provides the query capability. Grafana supplies a consistent place to ask questions, combine context, present answers, and share them with others.

The central mental model is:

1. A **data source** connects Grafana to a system that can answer queries.
2. A **query** asks that system for a particular set of evidence.
3. A **panel** turns the returned fields and values into a readable explanation.
4. A **dashboard** arranges panels and shared context for a recurring audience and purpose.
5. **Variables** let readers change that shared context without rebuilding the dashboard.
6. **Explore** supports questions that are still evolving during an investigation.
7. **Annotations** place relevant events on the same timeline as observed behavior.
8. **Alerting** evaluates conditions over time and routes meaningful notifications.

## Data Sources

A data source is Grafana's connection to a system that stores or serves data. It includes the knowledge needed to communicate with that system and exposes the query editor, language, or builder appropriate to it.

Common observability pairings include:

- Prometheus for numeric time series.
- Loki for logs.
- Tempo for distributed traces.

The same Grafana instance can connect to many data sources, including several instances of the same backend type. A panel can contain multiple queries, and a dashboard can contain panels backed by different sources.

Adding a data source does not normally copy all of its data into Grafana. When a dashboard or Explore view needs results, Grafana sends a query to the selected source and receives the matching data. Storage, retention, indexing, and source-side query behavior remain responsibilities of that backend.

This boundary explains why the selected data source matters. Each source has its own data model and query semantics. A metric query cannot automatically be interpreted as a log or trace query simply because all three appear in Grafana.

Access also has two perspectives. Grafana must be able to reach and authenticate to the backend, while the person using Grafana must have permission to use the data source. Connectivity and user authorization are related but distinct concerns.

## Dashboards

A dashboard is a shared view organized around an audience, a set of questions, and a time context. It can include panels, variables, links, text, rows, and annotations.

A useful dashboard has a deliberate reading order. It often begins with overall health, moves into trends and breakdowns, and ends with evidence that supports deeper investigation. This progression lets a reader answer increasingly specific questions:

1. Is there a meaningful change?
2. When did it begin?
3. Which service, region, operation, or customer group is affected?
4. Which detailed evidence can explain it?

The dashboard's time range is shared context. Panels usually interpret their queries within that range, so changing it can change both the amount of data returned and the meaning of an aggregation. Refresh behavior controls when the view asks its sources for newer results.

Dashboard quality depends more on clarity than density. A collection of charts is not automatically a coherent dashboard. Titles, units, legends, descriptions, thresholds, and links should help the intended reader make a decision without having to reverse-engineer the author's assumptions.

## Panels

A panel is the main unit of explanation within a dashboard. It combines:

- One or more queries.
- Optional transformations applied to returned data.
- A visualization.
- Field options such as display names, units, decimals, colors, and thresholds.
- Links or actions that support further investigation.

The visualization should match the comparison the reader needs to make. A time-series view emphasizes change over time. A single statistic emphasizes a current or summarized value. A table preserves exact detail across many fields. A distribution shows how values spread rather than hiding that spread behind an average.

Thresholds add visual meaning, but they do not create meaning by themselves. A threshold should represent a known expectation, objective, or operational boundary. Arbitrary color changes can make a panel look decisive while communicating very little.

Transformations reshape the results available to the visualization. They can join, organize, calculate, filter, rename, or reduce fields. They are most useful when they clarify presentation. They should not hide important data semantics or duplicate work that belongs more naturally in the source query.

A strong panel can be reasoned about in four layers:

1. **Question:** What should the reader understand?
2. **Data:** Which query results contain the required evidence?
3. **Visual:** Which form makes the important comparison easiest to see?
4. **Meaning:** Which labels, units, thresholds, descriptions, and links make the result interpretable?

## Queries

A query translates an operational question into a request a data source can answer. Its source determines the language and available operations.

A focused query usually makes four decisions explicit:

- The population or records to include.
- The measurement or fields to return.
- The grouping or dimensions to preserve.
- The time range and resolution needed for the question.

Aggregation changes meaning. A total, average, rate, percentile, and per-service breakdown are not alternate visualizations of the same answer; they answer different questions. Grouping also determines how many distinct series or rows are returned and therefore affects both readability and cost.

Grafana receives query results as fields and values that a panel or Explore can visualize. A result may represent time series, tabular records, individual values, logs, traces, or other source-specific shapes.

The selected dashboard range is part of the query context. Resolution can also adapt to the visible period so a long time range does not attempt to draw every raw sample. These behaviors are useful, but readers should still understand whether a panel is showing raw values, grouped intervals, rates, reductions, or a latest value.

Multiple queries in a panel can provide comparisons, related measures, or inputs to expressions. Their relationship should remain obvious. More queries do not automatically produce a better explanation.

## Variables

A variable is a named value or set of values that can be reused across a dashboard. Variables can influence queries, panel titles, links, repeated rows, repeated panels, and other dashboard context.

Common variable roles include:

- **Query variables**, whose options are discovered from a data source.
- **Custom variables**, whose options are maintained as a deliberate list.
- **Data source variables**, which switch among compatible data source instances.
- **Interval variables**, which provide a reusable time grouping.

Variables make one dashboard useful across environments, services, regions, operations, or instances. They should expose choices that are meaningful to the intended reader, not every internal label merely because it exists.

Variables can depend on one another. An environment selection can limit the available services, which can then limit the available instances. This cascading behavior creates a path from broad context to a specific slice of the system.

Refresh behavior determines when Grafana recalculates a variable's options. A variable may need to refresh when the dashboard loads, when the time range changes, or when a dependency changes. Refreshing more often than necessary can add avoidable queries and latency.

Multi-value and all-value selections expand the scope of a query. Query authors must account for that expansion using the source's matching and grouping semantics. The visible selection should make the active scope clear so readers do not mistake a combined view for a single target.

## Explore

Explore is an ad hoc investigation workspace. It is designed for questions that are still changing rather than for a finalized, repeatable presentation.

In Explore, an investigator can adjust a query, move through time, inspect raw and visual results, compare evidence, and follow links between signals. A useful incident path might begin with a metric symptom, move to logs from the affected service and time range, and then open a trace that reveals the failing dependency.

The distinction between dashboards and Explore is primarily about purpose:

| Dashboard | Explore |
| --- | --- |
| Curated for a known audience | Flexible for the current investigator |
| Stable questions and reading order | Questions can evolve rapidly |
| Shared context across panels | Focused workspace for a smaller set of queries |
| Best for recurring monitoring | Best for unfamiliar or developing investigations |

The two workflows reinforce each other. A dashboard can provide the first clue and open a more focused investigation. A useful query discovered in Explore can later become a durable panel when it answers a recurring question.

## Annotations

An annotation is a timestamped event shown alongside telemetry. It adds the question "what happened around this time?" to a graph without changing the underlying measurements.

Useful annotation events include:

- Deployments and releases.
- Configuration or feature-flag changes.
- Incident declarations and recoveries.
- Maintenance windows.
- Business events that may alter traffic or behavior.

Annotations can be entered manually or retrieved through an annotation query. Tags, descriptions, and links add searchable context and connect a marker to release notes, incident records, or other evidence.

An annotation shows temporal proximity, not causation. A deployment marker appearing just before a latency increase is a useful hypothesis, but it does not prove that the deployment caused the change. Queries, logs, traces, and other evidence must test that relationship.

Consistent event names and tags make annotations much more useful. If similar events are described differently every time, filtering and comparison become difficult.

## Grafana Alerting basics

Grafana Alerting evaluates data source queries on a schedule and tracks the resulting alert state. An alert rule generally combines:

1. Queries that retrieve the necessary evidence.
2. An expression or reduction that turns the result into something testable.
3. A condition that defines when the result is significant.
4. An evaluation interval.
5. A pending period that requires the condition to persist before firing.

The pending period helps distinguish sustained conditions from brief noise. It does not replace a well-chosen query or threshold; it adds a time requirement to the decision.

Common evaluation outcomes are:

- **Normal:** the alert condition is not met.
- **Pending:** the condition is met, but it has not persisted for the required duration.
- **Alerting:** the condition has persisted long enough to fire.
- **No Data:** evaluation produced no usable result.
- **Error:** Grafana could not complete the evaluation.

No Data and Error need explicit thought. They can indicate a missing target, delayed ingestion, a broken query, an unavailable data source, or a genuinely empty population. Treating them automatically as either healthy or unhealthy can hide important failure modes.

One rule can create several alert instances when its result preserves labels such as service, region, or instance. Each unique label set identifies a distinct instance. Labels therefore serve two important roles: they identify what is alerting and help notification policy decide where the alert should go.

Annotations on an alert rule provide human explanation. A concise summary, useful description, dashboard link, panel link, or runbook link helps a responder understand the condition and begin investigating. Labels should identify and route; annotations should explain and guide.

Notification policy groups and routes alert instances to contact points. Grouping prevents a large set of related instances from producing an unmanageable stream of separate notifications. Silences temporarily suppress notifications that match selected labels, while mute timing defines recurring periods when particular notifications should not be sent.

A good alert is actionable. It represents a condition someone owns, includes enough context to begin an investigation, and avoids treating every unusual value as an emergency. Dashboards support awareness and exploration; alerts should interrupt people only when timely action is justified.
