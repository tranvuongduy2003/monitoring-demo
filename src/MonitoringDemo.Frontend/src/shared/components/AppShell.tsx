import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpenText, ExternalLink, Menu, PlaySquare, Radio, X, Zap } from 'lucide-react';

export type AppRoute = 'scenarios' | 'learn';

const grafanaUrl = (import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function AppShell({ activeRoute, children }: { activeRoute: AppRoute; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const appMainRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef(false);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeSidebar(true);
    };

    document.body.style.overflow = 'hidden';
    appMainRef.current?.setAttribute('inert', '');
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      appMainRef.current?.removeAttribute('inert');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (sidebarOpen || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    menuButtonRef.current?.focus();
  }, [sidebarOpen]);

  function closeSidebar(returnFocus = false) {
    returnFocusRef.current = returnFocus;
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Zap /></span>
          <span><strong>Scenario Lab</strong><small>Observability workspace</small></span>
          <button ref={closeButtonRef} className="sidebar-close" type="button" onClick={() => closeSidebar(true)} aria-label="Close navigation"><X /></button>
        </div>

        <div className="sidebar-separator" />
        <nav className="sidebar-nav">
          <div className="nav-group">
            <p>Workspace</p>
            <a href="#/" className={activeRoute === 'scenarios' ? 'active' : undefined} aria-current={activeRoute === 'scenarios' ? 'page' : undefined} onClick={() => closeSidebar()}>
              <PlaySquare className="nav-icon" /><span>Scenarios</span>
            </a>
            <a href="#/learn" className={activeRoute === 'learn' ? 'active' : undefined} aria-current={activeRoute === 'learn' ? 'page' : undefined} onClick={() => closeSidebar()}>
              <BookOpenText className="nav-icon" /><span>Learn & tools</span>
            </a>
          </div>
          <div className="nav-group">
            <p>Investigate</p>
            <a href={grafanaUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="nav-icon" /><span>Open Grafana</span>
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          <span className="live-badge"><Radio aria-hidden="true" /> Ready</span>
          <span><strong>Generate here</strong><small>Investigate in Grafana</small></span>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" type="button" onClick={() => closeSidebar(true)} aria-hidden="true" tabIndex={-1} />}

      <div ref={appMainRef} className="app-main">
        <div className="mobile-bar glass-surface">
          <button ref={menuButtonRef} className="menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" aria-expanded={sidebarOpen}><Menu /></button>
          <span className="mobile-brand"><Zap /> Scenario Lab</span>
        </div>
        <main className="page" id="main-content">{children}</main>
      </div>
    </div>
  );
}
