import React from 'react';
import { cn } from '@/lib/utils';

export type BeaconStatus = 'healthy' | 'warning' | 'critical' | 'offline';

interface StatusBeaconProps {
  status: BeaconStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBeacon: React.FC<StatusBeaconProps> = ({ 
  status, 
  size = 'md',
  className 
}) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  const statusConfig = {
    healthy: {
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400'
    },
    warning: {
      dot: 'bg-amber-500',
      ping: 'bg-amber-400'
    },
    critical: {
      dot: 'bg-red-500',
      ping: 'bg-red-400'
    },
    offline: {
      dot: 'bg-slate-400',
      ping: 'bg-slate-300 hidden'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn("relative flex", sizeClasses[size], className)}>
      {status !== 'offline' && (
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.ping)} />
      )}
      <span className={cn("relative inline-flex rounded-full", sizeClasses[size], config.dot)} />
    </div>
  );
};
