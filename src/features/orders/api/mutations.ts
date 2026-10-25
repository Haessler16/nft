import { useMutation, useQueryClient } from '@tanstack/react-query'

import type {
  CreateOrderInput,
  OrderResponse,
} from '@/features/orders/api/contracts'
import { createOrder, fetchOrderByKey } from '@/features/orders/api/endpoints'
import { isApiError } from '@/lib/api/errors'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Creates the order (docs/PLAN.md → Seção 8).
 *
 * **Never retried blindly.** When the request fails in a way that may have
 * reached the server (network error / 5xx, e.g. the `order-timeout` scenario),
 * the mutation first asks the server for the order with the *same* idempotency
 * key:
 *
 * - found → the purchase already exists, so that order is the result (this is
 *   the recovery path: no second charge, no second order);
 * - not found → the request never landed, so the error is surfaced and the user
 *   may try again later with the same key.
 *
 * `queryClient.setQueryData` writes the answer into the order cache, so the
 * outcome screen opens with data instead of a spinner.
 */
export const useCreateOrder = (scope: UserScope) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<OrderResponse> => {
      try {
        return await createOrder(input)
      } catch (error) {
        if (isApiError(error) && error.isRetryable) {
          const recovered = await fetchOrderByKey(input.idempotencyKey).catch(
            () => null,
          )
          if (recovered) return recovered
        }
        throw error
      }
    },
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(scope, order.id), order)
    },
  })
}
