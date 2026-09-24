import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Server, 
  BarChart3, 
  GitBranch, 
  Terminal, 
  Bell, 
  Settings 
} from 'lucide-react';
import { StatusBeacon } from './StatusBeacon';

interface NavItem {
  name: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  active?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Overview', icon: Activity, href: '#', active: true },
  { name: 'Services', icon: Server, href: '#', badge: '3' },
  { name: 'Metrics', icon: BarChart3, href: '#' },
  { name: 'Traces', icon: GitBranch, href: '#' },
  { name: 'Logs', icon: Terminal, href: '#' },
  { name: 'Alerts', icon: Bell, href: '#', badge: '2' },
  { name: 'Settings', icon: Settings, href: '#' },
];

export const GlassSidebar: React.FC = () => {
  return (
    <aside className="glass-sidebar w-64 h-screen fixed left-0 top-0 flex flex-col z-20 border-r border-white/55">
      <div className="p-6 border-b border-white/40 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 shrink-0">
          <Activity className="w-5 h-5" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-lg font-bold tracking-tight text-ink truncate">
            Nexus
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-2.5 py-0.5 rounded-full text-[10px] font-medium leading-none">
              <StatusBeacon status="healthy" size="sm" />
              <span>System Normal</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
              item.active 
                ? "bg-brand-50 border border-brand-200/50 text-brand-700 font-medium shadow-sm" 
                : "text-ink-muted hover:text-ink hover:bg-white/40"
            )}
          >
            <item.icon className={cn("w-4 h-4", item.active ? "text-brand-600" : "text-ink-subtle")} />
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="bg-brand-50 text-brand-600 text-xs px-2 py-0.5 rounded-full border border-brand-100 font-medium">
                {item.badge}
              </span>
            )}
          </a>
        ))}
      </nav>

      <div className="border-t border-white/40 p-6 bg-white/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-ink-muted font-medium">Cluster Load</span>
          <span className="text-xs font-semibold text-brand-600">42%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 w-[42%] rounded-full shadow-sm" />
        </div>
      </div>
    </aside>
  );
};
