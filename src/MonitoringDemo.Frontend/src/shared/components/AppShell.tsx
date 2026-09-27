import { useState, type ReactNode } from 'react';

export type AppRoute =
  | 'overview'
  | 'orders'
  | 'opentelemetry'
  | 'otlp'
  | 'metrics'
  | 'prometheus'
  | 'logs'
  | 'traces'
  | 'learn';

type NavigationItem = {
  route: AppRoute;
  label: string;
  icon: IconName;
};

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  { label: 'Workspace', items: [{ route: 'overview', label: 'Overview', icon: 'overview' }, { route: 'orders', label: 'Orders', icon: 'orders' }] },
  {
    label: 'Telemetry',
    items: [
      { route: 'opentelemetry', label: 'OpenTelemetry', icon: 'telemetry' },
      { route: 'otlp', label: 'OTLP', icon: 'otlp' },
      { route: 'metrics', label: 'Metrics', icon: 'metrics' },
      { route: 'prometheus', label: 'Prometheus', icon: 'prometheus' },
      { route: 'logs', label: 'Logs', icon: 'logs' },
      { route: 'traces', label: 'Traces', icon: 'traces' },
    ],
  },
  { label: 'Reference', items: [{ route: 'learn', label: 'Learn & tools', icon: 'learn' }] },
];

export function AppShell({ activeRoute, children }: { activeRoute: AppRoute; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><PulseIcon /></span>
          <span><strong>Pulseboard</strong><small>Observability lab</small></span>
          <button className="sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">×</button>
        </div>

        <nav className="sidebar-nav">
          {navigationGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(item => (
                <a
                  href={`#/${item.route}`}
                  className={item.route === activeRoute ? 'active' : undefined}
                  aria-current={item.route === activeRoute ? 'page' : undefined}
                  onClick={() => setSidebarOpen(false)}
                  key={item.route}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="live-indicator" aria-hidden="true" />
          <span><strong>Live workspace</strong><small>Auto-refresh enabled</small></span>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <div className="app-main">
        <div className="mobile-bar">
          <button className="menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <span /><span /><span />
          </button>
          <span className="mobile-brand"><PulseIcon /> Pulseboard</span>
        </div>
        <main className="page" id="main-content">{children}</main>
      </div>
    </div>
  );
}

type IconName = 'overview' | 'orders' | 'telemetry' | 'otlp' | 'metrics' | 'prometheus' | 'logs' | 'traces' | 'learn';

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    orders: <><path d="M6 3h12l2 4v14H4V7l2-4Z" /><path d="M4 8h16M9 12h6" /></>,
    telemetry: <><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3m0-14-3 3M8 16l-3 3" /></>,
    otlp: <><path d="M4 8h11M9 4l-5 4 5 4M20 16H9m6-4 5 4-5 4" /><circle cx="12" cy="8" r="1" /><circle cx="12" cy="16" r="1" /></>,
    metrics: <path d="M4 20V10m5 10V4m6 16v-7m5 7V7" />,
    prometheus: <><path d="M12 3c2 4-1 5 2 8 1-2 3-3 3-6 3 3 4 6 3 9-1 5-5 7-8 7s-7-2-8-7c-1-4 2-7 5-10 0 3 1 5 3 6 2-3-1-4 0-7Z" /><path d="M8 16h8" /></>,
    logs: <><path d="M5 3h14v18H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    traces: <><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M7 6h10M6 8l5 8m7-8-5 8" /></>,
    learn: <><path d="M4 5c3-1 6 0 8 2v14c-2-2-5-3-8-2V5Zm16 0c-3-1-6 0-8 2v14c2-2 5-3 8-2V5Z" /></>,
  };

  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PulseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l2.2-6 4.2 12 2.2-6H21" /></svg>;
}
