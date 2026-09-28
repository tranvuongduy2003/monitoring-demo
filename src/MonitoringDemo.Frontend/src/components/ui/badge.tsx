import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva('inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', {
  variants: {
    variant: {
      default: 'border-slate-300/60 bg-white/55 text-slate-700 backdrop-blur-xl',
      secondary: 'border-slate-200/70 bg-slate-100/65 text-slate-600',
      success: 'border-[#06d6a0]/30 bg-[#06d6a0]/12 text-emerald-900 backdrop-blur-xl',
      warning: 'border-[#ffd166]/45 bg-[#ffd166]/18 text-amber-950 backdrop-blur-xl',
      destructive: 'border-[#ff7f50]/35 bg-[#ff7f50]/14 text-red-950 backdrop-blur-xl',
      outline: 'border-slate-300/70 bg-transparent text-slate-600',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
