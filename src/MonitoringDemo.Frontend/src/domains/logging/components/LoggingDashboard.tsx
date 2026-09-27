import type { useLoggingDashboard } from '@/domains/logging/hooks/useLoggingDashboard';
import { QueryGrid } from '@/shared/components/QueryGrid';
import { SectionHeading } from '@/shared/components/SectionHeading';
import { StatusBadge } from '@/shared/components/StatusBadge';

type LoggingDashboardModel = ReturnType<typeof useLoggingDashboard>;

export function LoggingDashboard({ model }: { model: LoggingDashboardModel }) {
  const { analytics, generating, demo, error, generateLog } = model;
  const data = analytics.data;
  const levelEntries = Object.entries(data?.byLevel ?? {}).sort(([, first], [, second]) => second - first);
  const maxLevelCount = Math.max(1, ...levelEntries.map(([, count]) => count));

  return (
    <>
      <section className="panel learning-panel">
        <SectionHeading
          eyebrow="Live Loki analytics"
          title={<>Logs in the last {data?.windowMinutes ?? 60} minutes</>}
          description={data?.available ? `${data.totalLogs} events indexed` : data?.message ?? 'Connecting to Loki...'}
          actions={<StatusBadge active={Boolean(data?.available)} activeLabel="Loki connected" inactiveLabel="Loki warming up" />}
        />

        {(analytics.error || error) && (
          <p className="error panel-notice" role="alert">{error || 'Log analytics could not be loaded. The page will keep retrying.'}</p>
        )}

        <div className="log-lab">
          <div className="level-chart" aria-label="Log count by level">
            <h3>Volume by level</h3>
            {levelEntries.map(([level, count]) => (
              <div className="level-row" key={level}>
                <span>{level || 'unknown'}</span>
                <div className="bar-track"><span style={{ width: `${(count / maxLevelCount) * 100}%` }} /></div>
                <strong>{count}</strong>
              </div>
            ))}
            {!levelEntries.length && <p className="muted">Seed logs appear a few seconds after startup.</p>}
          </div>

          <div className="generator">
            <h3>Correlation lab</h3>
            <p>Generate an event, then query Loki using the returned correlation or trace ID.</p>
            <div className="button-row">
              <button type="button" onClick={() => void generateLog(false)} disabled={generating}>Generate info</button>
              <button className="danger" type="button" onClick={() => void generateLog(true)} disabled={generating}>Generate exception</button>
            </div>
            {demo && (
              <dl className="identity-grid">
                <dt>Correlation</dt><dd>{demo.correlationId}</dd>
                <dt>Request</dt><dd>{demo.requestId}</dd>
                <dt>Trace</dt><dd>{demo.traceId}</dd>
                <dt>Span</dt><dd>{demo.spanId}</dd>
              </dl>
            )}
          </div>
        </div>
      </section>

      <section className="panel learning-panel">
        <SectionHeading
          eyebrow="Basic LogQL"
          title="Query cookbook"
          description="Copy these into Grafana Explore and change the sample values."
        />
        <QueryGrid queries={data?.queries ?? []} />
      </section>
    </>
  );
}
