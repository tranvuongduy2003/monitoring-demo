import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Check, DatabaseZap, Flame, Gauge, Play, RadioTower, TriangleAlert } from 'lucide-react';
import { scenarioService } from '@/features/scenarios/scenarioService';
import type { ScenarioDefinition, ScenarioRunResult } from '@/features/scenarios/types';

const grafanaUrl = trimTrailingSlash(import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3000');

const scenarioIcons = {
  'steady-orders': DatabaseZap,
  'traffic-spike': Gauge,
  'dependency-outage': TriangleAlert,
  'cache-pressure': Flame,
  'trace-storm': RadioTower,
} as const;

export function ScenarioConsole() {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [runningId, setRunningId] = useState<string>();
  const [lastRun, setLastRun] = useState<ScenarioRunResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    scenarioService.list(controller.signal)
      .then(items => {
        setScenarios(items);
        setCounts(Object.fromEntries(items.map(item => [item.id, item.defaultCount])));
      })
      .catch(cause => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError('The scenario API is unavailable. Check the API service and try again.');
      });
    return () => controller.abort();
  }, []);

  const lastScenario = useMemo(
    () => scenarios.find(item => item.id === lastRun?.scenarioId),
    [lastRun?.scenarioId, scenarios],
  );

  async function runScenario(scenario: ScenarioDefinition) {
    setRunningId(scenario.id);
    setError(undefined);
    try {
      const requestedCount = counts[scenario.id] ?? scenario.defaultCount;
      const count = Number.isFinite(requestedCount) ? Math.min(1000, Math.max(1, requestedCount)) : scenario.defaultCount;
      const result = await scenarioService.run(scenario.id, count);
      setLastRun(result);
    } catch {
      setError(`Could not run “${scenario.name}”. Check the API logs for details.`);
    } finally {
      setRunningId(undefined);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Generate here. Investigate in Grafana.</p>
          <h1>Create telemetry with a purpose.</h1>
          <p className="hero-copy">Run a bounded workload, then use the real observability stack to inspect its metrics, structured logs, and traces. This UI deliberately contains no charts or query replicas.</p>
        </div>
        <div className="pipeline" aria-label="Workflow">
          <span><b>1</b> Choose a scenario</span>
          <span><b>2</b> Generate telemetry</span>
          <span><b>3</b> Analyze in Grafana</span>
        </div>
      </section>

      {error && <div className="error" role="alert"><TriangleAlert /> {error}</div>}

      <section className="scenario-section" aria-labelledby="scenario-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Scenario catalog</p><h2 id="scenario-heading">Choose the signal shape</h2></div>
          <p>Counts are capped by the API to keep local runs safe and repeatable.</p>
        </div>

        <div className="scenario-grid">
          {scenarios.map(scenario => {
            const Icon = scenarioIcons[scenario.id as keyof typeof scenarioIcons] ?? Activity;
            const isRunning = runningId === scenario.id;
            return (
              <article className="scenario-card" key={scenario.id}>
                <div className="card-icon"><Icon /></div>
                <div className="card-copy">
                  <h3>{scenario.name}</h3>
                  <p>{scenario.description}</p>
                </div>
                <div className="signals" aria-label="Generated signals">
                  {scenario.signals.map(signal => <span key={signal}>{signal}</span>)}
                </div>
                <div className="card-actions">
                  <label>
                    <span>Volume</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={counts[scenario.id] ?? scenario.defaultCount}
                      onChange={event => setCounts(current => ({ ...current, [scenario.id]: Number(event.target.value) }))}
                    />
                  </label>
                  <button type="button" onClick={() => void runScenario(scenario)} disabled={Boolean(runningId)}>
                    <Play /> {isRunning ? 'Generating…' : 'Run scenario'}
                  </button>
                </div>
              </article>
            );
          })}
          {!error && scenarios.length === 0 && <p className="loading">Loading scenarios…</p>}
        </div>
      </section>

      {lastRun && lastScenario && (
        <section className="run-result" aria-live="polite">
          <div className="result-title"><span><Check /></span><div><p className="eyebrow">Last run completed</p><h2>{lastScenario.name}</h2></div></div>
          <dl>
            <div><dt>Metric events</dt><dd>{lastRun.metricObservations + lastRun.applicationTransactions + lastRun.methodologyRequests}</dd></div>
            <div><dt>Log events</dt><dd>{lastRun.logEvents}</dd></div>
            <div><dt>Traces</dt><dd>{lastRun.traceCount}</dd></div>
            <div><dt>Database rows</dt><dd>{lastRun.ordersCreated}</dd></div>
          </dl>
          <div className="result-actions">
            <p>Allow a few seconds for ingestion, then inspect the generated signals in the provisioned dashboard.</p>
            <a className="primary-link" href={`${grafanaUrl}${lastScenario.dashboardPath}`} target="_blank" rel="noreferrer">Investigate in Grafana <ArrowUpRight /></a>
          </div>
        </section>
      )}

      <footer>Scenario Lab generates telemetry. Grafana remains the source of truth for dashboards, queries, and alert investigation.</footer>
    </>
  );
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}
