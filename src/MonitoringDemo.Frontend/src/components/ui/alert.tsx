import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const alertVariants = cva('glass-surface relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-xl border px-4 py-3.5 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3', {
  variants: {
    variant: {
      default: 'text-slate-700',
      success: 'border-[#06d6a0]/30 bg-[#06d6a0]/10 text-emerald-950',
      destructive: 'border-[#ff7f50]/35 bg-[#ff7f50]/10 text-red-950',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) { return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />; }
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="alert-title" className={cn('col-start-2 font-medium', className)} {...props} />; }
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="alert-description" className={cn('col-start-2 text-sm opacity-80', className)} {...props} />; }

export { Alert, AlertTitle, AlertDescription };
