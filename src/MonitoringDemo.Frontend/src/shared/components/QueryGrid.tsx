import type { QueryExample } from '@/shared/types/query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QueryGridProps {
  queries: QueryExample[];
  className?: string;
}

export function QueryGrid({ queries, className = '' }: QueryGridProps) {
  return (
    <div className={`query-grid ${className}`.trim()}>
      {queries.map((item) => (
        <Card className="query-card" key={item.title}>
          <CardHeader><CardTitle>{item.title}</CardTitle><CardDescription>{item.purpose}</CardDescription></CardHeader>
          <CardContent><code>{item.query}</code></CardContent>
        </Card>
      ))}
    </div>
  );
}
