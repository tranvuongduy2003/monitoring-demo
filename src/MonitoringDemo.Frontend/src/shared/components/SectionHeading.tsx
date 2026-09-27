import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingId?: string;
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, actions, headingId, className = '' }: SectionHeadingProps) {
  return (
    <header className={`section-heading${className ? ` ${className}` : ''}`}>
      <div className="section-heading__content">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={headingId}>{title}</h2>
        {description && <p className="section-heading__description">{description}</p>}
      </div>
      {actions && <div className="section-heading__actions">{actions}</div>}
    </header>
  );
}
