import type { QueryExample } from '@/shared/types/query';

interface QueryGridProps {
  queries: QueryExample[];
  className?: string;
}

export function QueryGrid({ queries, className = '' }: QueryGridProps) {
  return (
    <div className={`query-grid ${className}`.trim()}>
      {queries.map((item) => (
        <article className="query-card" key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.purpose}</p>
          <code>{item.query}</code>
        </article>
      ))}
    </div>
  );
}
