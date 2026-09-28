import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <Card asChild className="page-header flex-row">
      <header>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="subtitle">{description}</p>
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </header>
    </Card>
  );
}
