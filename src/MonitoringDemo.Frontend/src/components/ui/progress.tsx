import * as React from 'react';
import { cn } from '@/shared/lib/utils';

function Progress({ value = 0, className, indicatorClassName, ...props }: React.ComponentProps<'div'> & { value?: number; indicatorClassName?: string }) {
  return <div data-slot="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className={cn('relative h-2 w-full overflow-hidden rounded-full bg-white/45 shadow-inner', className)} {...props}><div data-slot="progress-indicator" className={cn('h-full rounded-full bg-[linear-gradient(90deg,#118ab2,#06d6a0)] transition-all', indicatorClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export { Progress };
