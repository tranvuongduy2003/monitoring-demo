import { useState } from 'react';
import { ordersService } from '@/domains/orders/services/ordersService';
import { usePollingQuery } from '@/shared/hooks/usePollingQuery';

export function useOrdersDashboard() {
  const stats = usePollingQuery(ordersService.getStats, 5_000);
  const orders = usePollingQuery(ordersService.getRecent, 5_000);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  async function createTestOrder() {
    setCreating(true);
    setMessage('');

    try {
      await ordersService.createTestOrder();
      setMessage('Order created');
      await Promise.all([stats.refetch(), orders.refetch()]);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not create order');
    } finally {
      setCreating(false);
    }
  }

  function refresh() {
    void Promise.all([stats.refetch(), orders.refetch()]);
  }

  return { stats, orders, creating, message, createTestOrder, refresh };
}
