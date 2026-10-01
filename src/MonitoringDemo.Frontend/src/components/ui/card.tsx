import * as React from 'react';

type CardProps = React.ComponentProps<'div'> & { asChild?: boolean };

export function Card({ className, asChild = false, children, ...props }: CardProps) {
  const classes = ['glass-surface', className].filter(Boolean).join(' ');
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      ...props,
      className: [classes, child.props.className].filter(Boolean).join(' '),
    });
  }
  return <div className={classes} {...props}>{children}</div>;
}
