import type { Quantity } from '@/lib/api/types'

/**
 * Cart contracts shared by the MSW handlers, the Axios endpoints and the UI.
 *
 * Prices are deliberately absent: the cart stores only ownership intent
 * (item + quantity) and every value shown to the user comes from the quote
 * endpoint (docs/PLAN.md → Seção 7).
 */
export interface CartItem {
  nftId: string
  quantity: Quantity
}

export interface CartResponse {
  items: CartItem[]
  /** Total units across all items — drives the header badge. */
  count: number
}
