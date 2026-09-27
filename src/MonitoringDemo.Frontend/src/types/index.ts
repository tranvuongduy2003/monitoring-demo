export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface Order {
  id: number;
  productId: number;
  product?: Product;
  quantity: number;
  total: number;
  status: string;
  createdAt: string;
}

export interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersLastHour: number;
}

export interface LogQueryExample {
  title: string;
  query: string;
  purpose: string;
}

export interface LogAnalytics {
  available: boolean;
  windowMinutes: number;
  totalLogs: number;
  byLevel: Record<string, number>;
  queries: LogQueryExample[];
  message?: string;
}

export interface LogDemoResult {
  message: string;
  level: string;
  correlationId: string;
  requestId: string;
  traceId: string;
  spanId: string;
}

export interface MetricQueryExample {
  title: string;
  query: string;
  purpose: string;
}

export interface MetricsAnalytics {
  windowMinutes: number;
  from: string;
  to: string;
  counter: {
    name: string;
    value: number;
    failedValue: number;
    description: string;
  };
  gauge: {
    name: string;
    value: number;
    description: string;
  };
  histogram: {
    name: string;
    buckets: Array<{ lessThanOrEqual: number | null; count: number }>;
    count: number;
    sum: number;
  };
  summary: {
    count: number;
    sum: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  timeSeries: Array<{
    timestamp: string;
    count: number;
    failedCount: number;
    averageDurationMilliseconds: number;
  }>;
  cardinality: {
    observedSeries: number;
    maximumExpectedSeries: number;
    series: Array<{ status: string; category: string; source: string }>;
  };
  labels: Array<{ name: string; boundedValues: string }>;
  queries: MetricQueryExample[];
}
