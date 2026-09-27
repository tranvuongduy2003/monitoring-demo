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
