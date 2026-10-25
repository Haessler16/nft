import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { CartResponse } from '@/features/cart/api/contracts'
import {
  addToCart,
  removeCartItem,
  updateCartItem,
  validateCoupon,
} from '@/features/cart/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

export interface CartItemInput {
  nftId: string
  quantity: number
}

/**
 * Cart mutations (docs/PLAN.md → Seções 6 e 7).
 *
 * The API answers with the updated cart, so `onSuccess` writes that response
 * into the cache instead of invalidating: the header badge and the screen that
 * triggered the change update in the same commit, with no extra round-trip and
 * no window where the cart looks stale.
 *
 * Failures (409 availability, 404 removed item) are *not* toasted here: each
 * screen renders its own feedback next to the control that failed, which keeps
 * the message where the user was looking.
 */
export const useCartMutations = (scope: UserScope) => {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.cart.byScope(scope)

  const apply = (cart: CartResponse) => queryClient.setQueryData(queryKey, cart)

  const addItem = useMutation({
    mutationFn: ({ nftId, quantity }: CartItemInput) => addToCart(nftId, quantity),
    onSuccess: apply,
  })

  const updateItem = useMutation({
    mutationFn: ({ nftId, quantity }: CartItemInput) => updateCartItem(nftId, quantity),
    onSuccess: apply,
  })

  const removeItem = useMutation({
    mutationFn: ({ nftId }: { nftId: string }) => removeCartItem(nftId),
    onSuccess: apply,
  })

  return { addItem, updateItem, removeItem }
}

/**
 * Coupon check (docs/PLAN.md → Seção 7).
 *
 * Runs *before* the code reaches the URL: a `422` renders on the field while the
 * current summary (priced without the bad coupon) stays untouched. Success
 * hands the normalized code to the route, which is what re-keys the quote.
 */
export const useValidateCoupon = () => useMutation({ mutationFn: validateCoupon })
