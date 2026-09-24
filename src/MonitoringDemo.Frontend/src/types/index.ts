export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface Order {
  id: string;
  productId: string;
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

export interface MetricCardData {
  title: string;
  value: string | number;
  change: string | number;
  changePercent: number;
  isPositive: boolean;
  status: "healthy" | "warning" | "critical";
}
