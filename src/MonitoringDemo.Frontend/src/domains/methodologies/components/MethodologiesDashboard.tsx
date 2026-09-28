import type { useMethodologiesDashboard } from '@/domains/methodologies/hooks/useMethodologiesDashboard';
import type { MethodologyScenario } from '@/domains/methodologies/types';
import { QueryGrid } from '@/shared/components/QueryGrid';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { dateTime } from '@/shared/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type DashboardModel = ReturnType<typeof useMethodologiesDashboard>;

const scenarios: Array<{ value: MethodologyScenario; label: string }> = [
  { value: 'baseline', label: 'Seed baseline' },
  { value: 'traffic-spike', label: 'Seed traffic spike' },
  { value: 'failure-burst', label: 'Seed failure burst' },
];

export function MethodologiesDashboard({ model }: { model: DashboardModel }) {
  const { analytics, seeding, message, seedScenario } = model;
  const data = analytics.data;
  const points = data?.timeSeries.slice(-30) ?? [];
  const maxRequests = Math.max(1, ...points.map(point => point.requests));
  const redQueries = data?.queries.filter(query => query.methodology === 'RED') ?? [];
  const useQueries = data?.queries.filter(query => query.methodology === 'USE') ?? [];
  const goldenQueries = data?.queries.filter(query => query.methodology === 'Golden Signals') ?? [];

  return (
    <section className="panel learning-panel methodology-lab">
      <SectionHeading
        eyebrow="Scenario lab"
        title="One workload, three diagnostic lenses"
        description={data ? `${data.red.requests} requests analyzed across the last ${data.windowMinutes} minutes` : 'Loading the seeded methodology window...'}
        actions={scenarios.map(({ value, label }, index) => (
          <Button
            variant={index === 0 ? 'default' : 'secondary'}
            type="button"
            disabled={seeding !== null}
            onClick={() => void seedScenario(value)}
            key={value}
          >
            {seeding === value ? 'Seeding...' : label}
          </Button>
        ))}
      />

      {message && <p className="notice panel-notice" role="status">{message}</p>}
      {analytics.error && <p className="error panel-notice" role="alert">Methodology analytics could not be loaded. The page will keep retrying.</p>}

      <div className="methodology-overview" aria-label="Methodology guide">
        <a href="#red"><span>01</span><strong>RED</strong><small>Start with request-facing services</small></a>
        <a href="#use"><span>02</span><strong>USE</strong><small>Inspect constrained resources</small></a>
        <a href="#golden-signals"><span>03</span><strong>Four Golden Signals</strong><small>Summarize user-visible health</small></a>
      </div>

      <MethodologySection id="red" acronym="RED" title="Rate, errors, duration" description="Use RED to triage request-driven services. It answers how much work arrives, how often it fails, and how long users wait.">
        <div className="methodology-stats red-stats">
          <Stat label="Rate" value={data ? `${data.red.ratePerMinute}/min` : '--'} detail={`${data?.red.requests ?? '--'} requests`} />
          <Stat label="Errors" value={data ? `${data.red.errorRatePercent}%` : '--'} detail={`${data?.red.errors ?? '--'} failed`} tone="danger" />
          <Stat label="Duration" value={data ? `${data.red.p95DurationMilliseconds} ms` : '--'} detail={data ? `${data.red.averageDurationMilliseconds} ms average` : 'p95 latency'} />
        </div>
        <RequestTimeline points={points} maxRequests={maxRequests} />
        <QueryGrid queries={redQueries} className="methodology-queries" />
      </MethodologySection>

      <MethodologySection id="use" acronym="USE" title="Utilization, saturation, errors" description="Use USE for infrastructure and finite resources. High utilization shows demand; saturation shows queued work; errors expose failed resource operations.">
        <div className="resource-grid">
          {data?.use.map(resource => (
            <article key={resource.resource}>
              <div><strong>{formatResource(resource.resource)}</strong><span className={resource.errors > 0 ? 'has-errors' : ''}>{resource.errors} errors</span></div>
              <Meter label="Utilization" value={resource.currentUtilizationPercent} detail={`${resource.averageUtilizationPercent}% avg`} />
              <Meter label="Saturation" value={resource.currentSaturationPercent} detail={`${resource.peakSaturationPercent}% peak`} saturation />
            </article>
          ))}
          {!data?.use.length && <p className="muted">Waiting for resource observations...</p>}
        </div>
        <QueryGrid queries={useQueries} className="methodology-queries" />
      </MethodologySection>

      <MethodologySection id="golden-signals" acronym="4GS" title="Latency, traffic, errors, saturation" description="The Four Golden Signals compress service health into an operational overview. Start here, then use RED and USE to narrow the investigation.">
        <div className="golden-grid">
          <Signal name="Latency" value={data ? `${data.goldenSignals.latencyP95Milliseconds} ms` : '--'} description="p95 response time" color="violet" />
          <Signal name="Traffic" value={data ? `${data.goldenSignals.trafficPerMinute}/min` : '--'} description="request demand" color="blue" />
          <Signal name="Errors" value={data ? `${data.goldenSignals.errorRatePercent}%` : '--'} description="failed requests" color="rose" />
          <Signal name="Saturation" value={data ? `${data.goldenSignals.saturationPercent}%` : '--'} description="most constrained resource" color="amber" />
        </div>
        <div className="scenario-table-wrap">
          <h3>Seeded scenario comparison</h3>
          <div className="table-wrap">
            <Table>
              <TableHeader><TableRow><TableHead>Scenario</TableHead><TableHead>Requests</TableHead><TableHead>Errors</TableHead><TableHead>Average latency</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.scenarios.map(scenario => (
                  <TableRow key={scenario.scenario}><TableCell><Badge variant="secondary" className="pill">{scenario.scenario}</Badge></TableCell><TableCell>{scenario.requests}</TableCell><TableCell>{scenario.errors}</TableCell><TableCell>{scenario.averageDurationMilliseconds} ms</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <QueryGrid queries={goldenQueries} className="methodology-queries" />
      </MethodologySection>
    </section>
  );
}

function MethodologySection({ id, acronym, title, description, children }: { id: string; acronym: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="methodology-section" id={id} aria-labelledby={`${id}-heading`}>
      <header><span>{acronym}</span><div><h2 id={`${id}-heading`}>{title}</h2><p>{description}</p></div></header>
      {children}
    </section>
  );
}

function Stat({ label, value, detail, tone = '' }: { label: string; value: string; detail: string; tone?: string }) {
  return <Card asChild className={tone}><article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article></Card>;
}

function RequestTimeline({ points, maxRequests }: { points: NonNullable<DashboardModel['analytics']['data']>['timeSeries']; maxRequests: number }) {
  return (
    <div className="methodology-timeline-wrap">
      <div><h3>Requests per minute</h3><span><i /> requests <i /> errors</span></div>
      <div className="methodology-timeline" aria-label="Requests and errors per minute">
        {points.map(point => (
          <div key={point.timestamp} title={`${dateTime.format(new Date(point.timestamp))}: ${point.requests} requests, ${point.errors} errors, ${point.averageDurationMilliseconds} ms average`}>
            <i style={{ height: `${Math.max(4, point.requests / maxRequests * 100)}%` }} />
            <b style={{ height: `${point.errors / maxRequests * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, value, detail, saturation = false }: { label: string; value: number; detail: string; saturation?: boolean }) {
  const level = value >= 85 ? 'critical' : value >= 65 ? 'warning' : '';
  return (
    <div className="resource-meter">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <Progress className={`resource-track ${saturation ? 'saturation' : ''} ${level}`} value={value} />
      <small>{detail}</small>
    </div>
  );
}

function Signal({ name, value, description, color }: { name: string; value: string; description: string; color: string }) {
  return <article className={color}><span>{name}</span><strong>{value}</strong><small>{description}</small></article>;
}

function formatResource(value: string) {
  return value.split('-').map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}
