import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border border-white/45 bg-[linear-gradient(135deg,#118ab2,#087f8c)] text-white shadow-sm hover:saturate-125 hover:shadow-md',
        secondary: 'border border-white/70 bg-white/45 text-slate-700 shadow-sm backdrop-blur-2xl hover:bg-white/65',
        outline: 'border border-white/70 bg-white/20 text-slate-700 backdrop-blur-2xl hover:bg-white/50',
        ghost: 'text-slate-600 hover:bg-white/45 hover:text-slate-950',
        destructive: 'border border-white/35 bg-[linear-gradient(135deg,#d85f45,#b94b46)] text-white shadow-sm hover:saturate-125',
        link: 'h-auto rounded-none p-0 text-slate-700 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'size-10',
        'icon-sm': 'size-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
