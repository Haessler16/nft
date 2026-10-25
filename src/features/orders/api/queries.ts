import { queryOptions } from '@tanstack/react-query'

import { fetchOrder, fetchOrders } from '@/features/orders/api/endpoints'
import { getRealtimeStatus } from '@/lib/realtime'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/** Interval used while the simulated payment is pending. */
export const ORDER_POLL_INTERVAL_MS = 700

/**
 * Order detail (docs/PLAN.md → Seções 8 e 10).
 *
 * Confirmed and declined are terminal: polling stops the moment the receipt
 * can no longer change. While the order is `pending`, the source of updates is
 * `order.updated` **when the realtime socket is connected** — the REST poll is
 * the fallback for an outage (or a socket that never connected), so the
 * event-driven path is the one exercised in practice. A refresh re-reads the
 * same resource, which is how the checkout recovers a pending purchase without
 * creating another one.
 */
export const orderQueryOptions = (scope: UserScope, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.orders.detail(scope, orderId),
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' && getRealtimeStatus() !== 'connected'
        ? ORDER_POLL_INTERVAL_MS
        : false,
  })

/**
 * Order history (docs/PLAN.md → Seção 9).
 *
 * The list is scoped by session and refreshed on navigation (a purchase made
 * in another tab shows up without a reload). It does not poll: a pending order
 * is watched by its own detail query, which is the screen that has to react.
 */
export const ordersListQueryOptions = (scope: UserScope) =>
  queryOptions({
    queryKey: queryKeys.orders.list(scope),
    queryFn: ({ signal }) => fetchOrders(signal),
    staleTime: 30_000,
  })
