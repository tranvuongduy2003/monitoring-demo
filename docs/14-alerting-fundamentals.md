# Alerting Fundamentals

Alerting converts telemetry into a request for attention. It continuously evaluates evidence, decides whether a meaningful condition is present, and routes that condition to people or systems able to respond.

An alert is therefore more than a graph crossing a line. A useful alert connects four ideas:

1. A signal represents something important about the system or its users.
2. A condition separates acceptable behavior from a problem.
3. Time distinguishes a durable problem from brief variation.
4. A notification reaches an owner with enough context to make a decision.

The quality of an alerting system depends as much on restraint and routing as it does on detection.

## Threshold alerts

A threshold alert compares a measured value with a boundary. It may fire when a value rises above a maximum, falls below a minimum, leaves an acceptable range, or changes by an unusual amount.

Thresholds are easy to understand, but choosing a meaningful boundary requires context. A processor utilization of 80 percent is not universally dangerous. It may be healthy when work continues without queues or errors, and concerning when latency is already increasing. A threshold is stronger when it protects an outcome, a reliability objective, or a known capacity boundary.

The comparison window also changes what the threshold means. A single observation can capture a transient spike, while an average may hide a sharp but important failure. A longer window reduces sensitivity to brief variation but delays detection. The right window follows the duration over which impact becomes meaningful.

Useful threshold design asks:

- What undesirable outcome does this boundary predict or confirm?
- Is the signal a direct symptom or only a possible cause?
- How much natural variation should be tolerated?
- How quickly must a responder know?
- What happens when observations are late or absent?

## Alert rules

An alert rule defines how a condition is evaluated and identified. Its core parts are:

- **Signal:** the measurement or derived value being observed.
- **Condition:** the comparison that determines whether the signal is abnormal.
- **Evaluation interval:** how often the condition is checked.
- **Persistence duration:** how long the condition must remain true before the alert fires.
- **Identity:** the labels or dimensions that distinguish one alert instance from another.
- **Context:** a clear summary, ownership, likely impact, and the next useful investigative question.

Rule identity deserves care. Keeping a service, region, or critical dependency visible can make an alert actionable. Preserving every rapidly changing dimension can create many alert instances that all describe one underlying incident.

An evaluation interval should be frequent enough to detect a problem within the required response time, but it cannot compensate for a signal that arrives slowly or represents a much longer aggregation window. Detection time includes data collection, evaluation, persistence, routing, and delivery.

## Pending

An alert enters the pending state when its condition is true but the required persistence duration has not yet elapsed. Pending is a timing state: the evidence currently indicates a breach, but the system is waiting to see whether it lasts.

If the condition clears before the duration is satisfied, the alert returns to normal without firing. This makes pending useful for filtering short-lived variation, deployment turbulence, and single anomalous observations.

The pending duration represents a tradeoff:

- A short duration detects problems quickly but can amplify noise.
- A long duration improves stability but delays response to genuine impact.
- No duration may be appropriate when even one event is independently urgent and trustworthy.

Pending should not be used to hide a poorly chosen signal. If a condition fluctuates constantly around its threshold, the alert may need a better boundary, a more suitable window, or a signal closer to real impact.

## Firing

An alert becomes firing when its condition has remained true for the required duration. Firing means that the alert is active and eligible for notification according to routing policy.

Firing does not automatically mean that every receiver should be interrupted. Severity, ownership, maintenance windows, grouping, inhibition, and existing incident state can all affect delivery. Separating rule evaluation from notification policy allows the same detected condition to be handled consistently without embedding every communication decision in the rule itself.

When the condition becomes false, a firing alert resolves. Resolution is useful information: it closes the active state, can update an incident record, and tells responders that the detected symptom has ended. Resolution does not prove that the root cause is understood or permanently removed.

Missing data needs an explicit policy. An absent observation can mean that the system is healthy and quiet, that collection has failed, or that the state is unknown. Treating all three as normal creates blind spots; treating all three as firing creates noise.

## Notification channels

Notification routing connects an active alert with the right receiver and communication channel. The route should reflect urgency, ownership, and expected action.

| Response need | Typical channel pattern | Appropriate when |
| --- | --- | --- |
| Immediate response | Paging or on-call system | User impact is urgent and the receiver can act now |
| Team coordination | Shared chat channel | Several people need awareness or collaborative triage |
| Durable follow-up | Ticket or incident record | Work needs ownership, history, prioritization, or later action |
| Low-urgency awareness | Email or digest | The information is useful but should not interrupt focused work |

Several policies improve notification quality:

- **Grouping** combines related alert instances into an incident-shaped message.
- **Deduplication** prevents repeated evaluations from creating repeated notifications for the same active state.
- **Inhibition** suppresses secondary symptoms when a known upstream alert already explains them.
- **Silencing** pauses delivery for a defined scope and time, such as planned maintenance.
- **Escalation** widens or changes the route when acknowledgement or response does not happen in time.

A useful notification says what is affected, why the alert matters, when it started, who owns the response, and where to begin investigating. More text is not always more context; the message should support the next decision.

## Alert fatigue

Alert fatigue is the loss of attention and trust caused by excessive, repetitive, low-value, or poorly routed notifications. It is a system design failure rather than a personal failure of responders.

Common causes include:

- Thresholds that react to normal variation.
- Multiple alerts for symptoms of the same incident.
- Alerts routed to people who cannot act on them.
- Repeated notifications that add no new information.
- Conditions with no clear impact or response.
- Stale rules that no longer match system behavior or ownership.

Fatigue raises the chance that a real problem will be missed or acknowledged slowly. It also creates operational work as responders repeatedly classify notifications that should have been filtered, grouped, or sent elsewhere.

Reducing fatigue is a continuous review practice:

1. Track which alerts fire, repeat, and receive action.
2. Group related symptoms and inhibit predictable downstream noise.
3. Tune thresholds and persistence using observed behavior and impact.
4. Route each alert to an accountable owner through an appropriate channel.
5. Remove or redesign alerts that are consistently ignored.
6. Review rules after incidents, architecture changes, and ownership changes.

## A compact mental model

- A **threshold** is a decision boundary, not proof of an incident by itself.
- An **alert rule** joins a signal, condition, time policy, identity, and response context.
- **Pending** means the condition is true but has not persisted long enough.
- **Firing** means the persistence requirement is met and the alert is active.
- A **notification channel** should match urgency, ownership, and expected action.
- **Alert fatigue** is reduced by improving signal quality, grouping, routing, and continuous review.
- The best alert is one a receiver trusts and can act on.
