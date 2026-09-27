import { getJson, postJson } from '@/shared/services/httpClient';
import type { Order, OrderStats } from '@/domains/orders/types';

const ordersEndpoint = '/api/orders';

export const ordersService = {
  getRecent: (signal?: AbortSignal) => getJson<Order[]>(`${ordersEndpoint}?limit=8`, signal),
  getStats: (signal?: AbortSignal) => getJson<OrderStats>(`${ordersEndpoint}/stats`, signal),
  createTestOrder: () => postJson<Order>(ordersEndpoint, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 1, quantity: 1 }),
  }),
};
