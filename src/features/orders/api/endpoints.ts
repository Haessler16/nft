import type {
  CreateOrderInput,
  OrderResponse,
  OrdersListResponse,
} from '@/features/orders/api/contracts'
import { http } from '@/lib/api/client'

/**
 * Order endpoints (docs/PLAN.md → Seção 8).
 *
 * The idempotency key travels in the `Idempotency-Key` header, not in the body:
 * that is the contract the API documents, and it keeps the key out of the
 * snapshot the order stores.
 *
 * `fetchOrderByKey` exists for recovery: after a timeout the client cannot know
 * whether the server created the order, so it asks by key before ever trying to
 * create another one.
 */

export const createOrder = async (input: CreateOrderInput): Promise<OrderResponse> => {
  const { idempotencyKey, ...payload } = input
  const { data } = await http.post<OrderResponse>('/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export const fetchOrder = async (
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderResponse> => {
  const { data } = await http.get<OrderResponse>(
    `/orders/${encodeURIComponent(orderId)}`,
    { signal },
  )
  return data
}

/**
 * The collector's orders, newest first (docs/PLAN.md → Seção 9). The session
 * cookie scopes the answer: another account never sees this list.
 */
export const fetchOrders = async (
  signal?: AbortSignal,
): Promise<OrdersListResponse> => {
  const { data } = await http.get<OrdersListResponse>('/orders', { signal })
  return data
}

/** Recovery lookup: same key + same user always resolves the same order. */
export const fetchOrderByKey = async (
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<OrderResponse> => {
  const { data } = await http.get<OrderResponse>(
    `/orders/by-key/${encodeURIComponent(idempotencyKey)}`,
    { signal },
  )
  return data
}
