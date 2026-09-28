import { useState, type ReactNode } from 'react';
import { Menu, Radio, X, Zap } from 'lucide-react';
import { navigationGroups, type AppRoute } from '@/app/routes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/shared/lib/utils';

export type { AppRoute } from '@/app/routes';

export function AppShell({ activeRoute, children }: { activeRoute: AppRoute; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={cn('sidebar', sidebarOpen && 'open')} aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Zap /></span>
          <span><strong>Pulseboard</strong><small>Observability lab</small></span>
          <Button className="sidebar-close" variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X /></Button>
        </div>

        <Separator className="sidebar-separator" />
        <nav className="sidebar-nav">
          {navigationGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(([route, item]) => {
                const Icon = item.icon;
                return (
                  <a href={`#/${route}`} className={cn(route === activeRoute && 'active')} aria-current={route === activeRoute ? 'page' : undefined} onClick={() => setSidebarOpen(false)} key={route}>
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Badge variant="outline" className="live-badge"><Radio aria-hidden="true" /> Live</Badge>
          <span><strong>Workspace connected</strong><small>Auto-refresh enabled</small></span>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <div className="app-main">
        <div className="mobile-bar glass-surface">
          <Button className="menu-button" variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu /></Button>
          <span className="mobile-brand"><Zap /> Pulseboard</span>
        </div>
        <main className="page" id="main-content">{children}</main>
      </div>
    </div>
  );
}
