import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  Layers3,
  MessageSquareText,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const jumpLinks = [
  ['alerting-thresholds', 'Thresholds'],
  ['alerting-rules', 'Alert rules'],
  ['alerting-lifecycle', 'Pending & firing'],
  ['alerting-notifications', 'Notifications'],
  ['alerting-fatigue', 'Alert fatigue'],
] as const;

const ruleParts = [
  { icon: Activity, name: 'Signal', description: 'The measurement that represents the condition you care about.' },
  { icon: SlidersHorizontal, name: 'Condition', description: 'The comparison that decides whether the signal is abnormal.' },
  { icon: Clock3, name: 'Timing', description: 'How often to evaluate and how long a breach must persist.' },
  { icon: MessageSquareText, name: 'Context', description: 'Labels, ownership, impact, and a useful next question.' },
] as const;

const channelRows = [
  ['Immediate response', 'Paging or on-call', 'Urgent, actionable, and service-impacting'],
  ['Team coordination', 'Chat channel', 'Shared awareness and collaborative triage'],
  ['Durable follow-up', 'Ticket or incident record', 'Work that needs ownership, history, or prioritization'],
  ['Low-urgency awareness', 'Email or digest', 'Useful information that does not demand interruption'],
] as const;

const fatiguePairs = [
  ['Noisy symptom', 'Better design response'],
  ['Short-lived spikes page repeatedly', 'Require persistence or use a window that reflects real impact'],
  ['Many alerts describe one incident', 'Group related notifications and inhibit dependent symptoms'],
  ['The receiver cannot act', 'Route to the owner and include the decision they can make'],
  ['The same alert is always ignored', 'Retire it or change the condition until it earns attention'],
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function SectionHeading({ index, eyebrow, title, description, id }: {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="fundamentals-section-heading">
      <span className="fundamentals-index">{index}</span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function AlertingFundamentals() {
  return (
    <>
      <nav className="fundamentals-jump" aria-label="On this page">
        <span>On this page</span>
        {jumpLinks.map(([id, label]) => (
          <button type="button" onClick={() => scrollToSection(id)} key={id}>{label}</button>
        ))}
      </nav>

      <section className="fundamentals-section" id="alerting-thresholds" aria-labelledby="alerting-thresholds-heading">
        <SectionHeading
          index="01"
          eyebrow="Threshold alerts"
          title="Turn a measurement into a decision boundary"
          description="A threshold alert asks whether a meaningful signal has crossed a boundary that separates acceptable behavior from a condition worth human attention. The boundary, comparison window, and persistence must all reflect real impact."
          id="alerting-thresholds-heading"
        />

        <Card asChild className="alert-threshold-card">
          <article>
            <div className="alert-threshold-visual" aria-label="A signal crossing a threshold and remaining above it">
              <div className="alert-threshold-chart">
                {[28, 34, 30, 43, 56, 70, 76, 72, 82, 79, 85, 81].map((height, index) => (
                  <i className={index > 4 ? 'breach' : undefined} style={{ height: `${height}%` }} key={`${height}-${index}`} />
                ))}
                <span><b>Threshold</b><small>Decision boundary</small></span>
              </div>
              <div className="alert-threshold-axis"><span>Normal variation</span><span>Sustained breach</span></div>
            </div>
            <div className="alert-threshold-explanation">
              <Gauge aria-hidden="true" />
              <p className="eyebrow">Interpret the crossing</p>
              <h3>A number above a line is evidence, not yet an incident</h3>
              <p>The threshold becomes useful when it represents degraded outcomes or exhausted capacity. A persistence window filters brief variation before the condition escalates.</p>
              <div><span>Signal</span><ArrowRight aria-hidden="true" /><span>Boundary</span><ArrowRight aria-hidden="true" /><span>Impact</span></div>
            </div>
          </article>
        </Card>

        <div className="knowledge-callout alerting-callout">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Prefer thresholds tied to consequences.</strong> A limit is easier to trust when responders understand what user experience, reliability objective, or finite capacity it protects.</p>
        </div>
      </section>

      <section className="fundamentals-section" id="alerting-rules" aria-labelledby="alerting-rules-heading">
        <SectionHeading
          index="02"
          eyebrow="Alert rules"
          title="A rule combines evidence, time, and response context"
          description="The expression is only one part of an alert rule. Reliable rules also define evaluation timing, identity, ownership, and the context a receiver needs to decide what to do next."
          id="alerting-rules-heading"
        />

        <div className="alert-rule-grid">
          {ruleParts.map(({ icon: Icon, name, description }, index) => (
            <Card asChild className="alert-rule-card" key={name}>
              <article>
                <div><span>{String(index + 1).padStart(2, '0')}</span><Icon aria-hidden="true" /></div>
                <h3>{name}</h3>
                <p>{description}</p>
              </article>
            </Card>
          ))}
        </div>

        <div className="alert-rule-flow" aria-label="Alert rule evaluation flow">
          <span><Activity aria-hidden="true" /><small>Observe</small><strong>Read the signal</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><SlidersHorizontal aria-hidden="true" /><small>Evaluate</small><strong>Apply the condition</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><Route aria-hidden="true" /><small>Route</small><strong>Find the right receiver</strong></span>
        </div>
      </section>

      <section className="fundamentals-section" id="alerting-lifecycle" aria-labelledby="alerting-lifecycle-heading">
        <SectionHeading
          index="03"
          eyebrow="Pending and firing"
          title="State separates a momentary breach from a durable problem"
          description="Evaluation happens repeatedly. Pending records that the condition is currently true but has not yet lasted long enough; firing means the persistence requirement has been satisfied and the alert is active."
          id="alerting-lifecycle-heading"
        />

        <Card asChild className="alert-lifecycle-card">
          <article>
            <div className="alert-state normal">
              <CheckCircle2 aria-hidden="true" />
              <p><small>Condition false</small><strong>Normal</strong><span>The signal remains within its acceptable boundary.</span></p>
            </div>
            <ArrowRight aria-hidden="true" />
            <div className="alert-state pending">
              <Clock3 aria-hidden="true" />
              <p><small>Condition true</small><strong>Pending</strong><span>The breach is being timed before escalation.</span></p>
            </div>
            <ArrowRight aria-hidden="true" />
            <div className="alert-state firing">
              <BellRing aria-hidden="true" />
              <p><small>Persistence met</small><strong>Firing</strong><span>The alert is active and eligible for notification.</span></p>
            </div>
          </article>
        </Card>

        <div className="alert-lifecycle-notes">
          <article><Clock3 aria-hidden="true" /><p><strong>Pending protects attention</strong><span>If the signal recovers before the required duration, the alert returns to normal without firing.</span></p></article>
          <article><CheckCircle2 aria-hidden="true" /><p><strong>Recovery closes the loop</strong><span>When the condition clears, a firing alert resolves so receivers know the active problem has ended.</span></p></article>
          <article><CircleAlert aria-hidden="true" /><p><strong>Missing data is its own decision</strong><span>Silence may mean health, collection failure, or an unknown state; the rule should distinguish them deliberately.</span></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="alerting-notifications" aria-labelledby="alerting-notifications-heading">
        <SectionHeading
          index="04"
          eyebrow="Notification channels"
          title="Route by urgency, ownership, and expected action"
          description="An alert state and a notification are different concerns. Routing policy decides who should receive an alert, through which channel, and how related events should be grouped or escalated."
          id="alerting-notifications-heading"
        />

        <Card asChild className="alert-channel-card">
          <div className="alert-channel-table-wrap">
            <table>
              <thead><tr><th>Response need</th><th>Channel pattern</th><th>Use when</th></tr></thead>
              <tbody>
                {channelRows.map(([need, channel, use]) => (
                  <tr key={need}><th scope="row">{need}</th><td>{channel}</td><td>{use}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="alert-routing-principles">
          <article><Users aria-hidden="true" /><p><strong>Ownership</strong><span>Send the alert to a receiver able and expected to act.</span></p></article>
          <article><Layers3 aria-hidden="true" /><p><strong>Grouping</strong><span>Bundle related events into one incident-shaped notification.</span></p></article>
          <article><Route aria-hidden="true" /><p><strong>Escalation</strong><span>Widen the route only when urgency or acknowledgement requires it.</span></p></article>
        </div>
      </section>

      <section className="fundamentals-section" id="alerting-fatigue" aria-labelledby="alerting-fatigue-heading">
        <SectionHeading
          index="05"
          eyebrow="Alert fatigue"
          title="Every interruption spends responder attention"
          description="Alert fatigue appears when volume, duplication, poor routing, or low-value conditions teach people that notifications are safe to ignore. The result is slower recognition of the alerts that genuinely matter."
          id="alerting-fatigue-heading"
        />

        <div className="alert-fatigue-layout">
          <Card asChild className="alert-fatigue-meter">
            <article>
              <div><Volume2 aria-hidden="true" /><span>Signal</span><b>Useful</b></div>
              <div className="alert-fatigue-bar"><i /><i /><i /><i /><i /></div>
              <div><VolumeX aria-hidden="true" /><span>Noise</span><b>Overwhelming</b></div>
              <p>As repeated noise grows, trust falls. A quieter alerting system can detect the same conditions while producing a much clearer call to action.</p>
            </article>
          </Card>

          <div className="alert-fatigue-pairs">
            {fatiguePairs.map(([problem, response], index) => (
              <article className={index === 0 ? 'heading' : undefined} key={problem}>
                <span>{problem}</span><ArrowRight aria-hidden="true" /><strong>{response}</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="knowledge-callout alerting-callout caution">
          <CircleAlert aria-hidden="true" />
          <p><strong>An alert should represent a decision, not merely an unusual number.</strong> If no receiver can describe the expected response, the condition may belong in a dashboard, report, or investigation view instead.</p>
        </div>
      </section>
    </>
  );
}
