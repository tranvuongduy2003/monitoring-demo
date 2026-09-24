import React from 'react';
import { Badge } from '@/components/ui/badge';

export interface DisplayOrder {
  id: string | number;
  productName: string;
  status: string;
  quantity: number;
  total: number;
  time: string;
}

interface RecentOrdersTableProps {
  orders: any[];
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ orders }) => {
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const normalizedOrders: DisplayOrder[] = (orders || []).map((o: any) => ({
    id: typeof o.id === 'number' ? `ORD-${o.id.toString().padStart(4, '0')}` : o.id,
    productName: o.product?.name || o.productName || 'Standard Item',
    status: o.status || 'Pending',
    quantity: o.quantity || 1,
    total: typeof o.total === 'number' ? o.total : parseFloat(o.total || 0),
    time: o.time || formatRelativeTime(o.createdAt),
  }));

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/60 shadow-glass-soft">
      <div className="p-6 pb-4 border-b border-white/50 flex items-center justify-between">
        <div>
          <h3 className="text-h3 font-semibold text-ink">Recent Orders & Transactions</h3>
          <p className="text-xs text-ink-muted mt-0.5">Live events from PostgreSQL & Minimal API simulator</p>
        </div>
        <div className="text-xs font-mono text-ink-subtle bg-white/50 px-2.5 py-1 rounded-md border border-white/60">
          Total displayed: {normalizedOrders.length}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/40 text-xs uppercase tracking-wider text-ink-subtle border-b border-white/50 font-semibold">
              <th className="px-6 py-3.5">Order ID</th>
              <th className="px-6 py-3.5">Product</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-center">Qty</th>
              <th className="px-6 py-3.5">Total</th>
              <th className="px-6 py-3.5">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {normalizedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-ink-subtle">
                  No recent orders found. Waiting for simulator...
                </td>
              </tr>
            ) : (
              normalizedOrders.map((order) => (
                <tr 
                  key={order.id} 
                  className="border-b border-white/30 hover:bg-white/40 transition-colors last:border-0"
                >
                  <td className="px-6 py-3.5 text-small font-mono text-ink-muted font-medium">
                    {order.id}
                  </td>
                  <td className="px-6 py-3.5 text-small font-medium text-ink">
                    {order.productName}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-small text-ink-muted text-center font-mono">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-3.5 text-small font-semibold text-ink font-mono">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-ink-subtle">
                    {order.time}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
