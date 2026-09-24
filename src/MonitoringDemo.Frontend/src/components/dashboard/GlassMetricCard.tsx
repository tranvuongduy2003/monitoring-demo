import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatusBeacon, BeaconStatus } from './StatusBeacon';

interface GlassMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  status?: BeaconStatus;
  className?: string;
}

export const GlassMetricCard: React.FC<GlassMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  status,
  className,
}) => {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div className={cn("glass-card interactive-lift overflow-hidden p-6 relative group transition-all duration-300 hover:border-brand-200/60", className)}>
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="bg-brand-50 border border-brand-100 text-brand-600 rounded-xl p-2.5">
          <Icon className="w-5 h-5" />
        </div>
        
        {status && <StatusBeacon status={status} />}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-small font-medium text-ink-muted">{title}</h3>
        <div className="text-3xl font-bold text-ink tracking-tight flex items-baseline gap-2">
          {value}
        </div>
      </div>
      
      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
          {changeLabel && (
            <span className="text-xs text-ink-subtle">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};
