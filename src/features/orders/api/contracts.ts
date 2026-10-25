import type { CartEntry, QuoteResponse } from '@/features/cart/api/contracts'
import type { NftNetwork } from '@/features/nfts/api/contracts'
import type { WalletProvider } from '@/features/wallets/api/contracts'
import type { EthAmount } from '@/lib/api/types'

/**
 * Order contracts (docs/PLAN.md → Seções 8 e 9).
 *
 * An order is an **immutable snapshot**: the lines, prices, fees and customer
 * data are copied at creation, so a later change in the catalog cannot rewrite
 * a receipt. `GET /api/orders/:orderId` only returns the stored snapshot plus
 * the settlement state.
 *
 * Lifecycle:
 *
 *   pending ──settle──► confirmed   (terminal)
 *      └────settle────► declined    (terminal)
 *
 * The client never invents a status: it polls the REST resource until one of
 * the terminal states arrives (Seção 10 replaces the poll with `order.updated`).
 */

export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Customer data collected by the checkout form. */
export interface OrderCustomer {
  displayName: string
  username: string
  profileName: string
  email: string
  /** Network chosen for this purchase (freezes the order's chain). */
  network: NftNetwork
  walletAddress: string
  secondaryWallet: string | null
  walletProvider: WalletProvider
  referralCode: string | null
  ensName: string | null
  note: string | null
}

/** Wallet used by the order, snapshotted so the receipt never joins live data. */
export interface OrderWallet {
  /** Registered wallet id, or `null` for the manual ("usar outra") address. */
  id: string | null
  label: string
  provider: WalletProvider
  address: string
  network: NftNetwork
}

export interface OrderLine {
  nftId: string
  name: string
  imageUrl: string
  edition: { number: number; of: number }
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
}

export interface OrderTotals {
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  coupon: { code: string; percent: string } | null
}

export interface OrderTransaction {
  hash: string
  /** Simulated explorer link (documented in README → Pedidos). */
  explorerUrl: string
  confirmedAt: string
}

export interface Order {
  id: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  customer: OrderCustomer
  wallet: OrderWallet
  lines: OrderLine[]
  totals: OrderTotals
  /** `null` while pending or declined. */
  transaction: OrderTransaction | null
  /** Reason shown on a declined order; `null` otherwise. */
  failureReason: string | null
}

/**
 * `POST /api/orders` payload.
 *
 * - `items` is the cart snapshot the user reviewed (the server prices it again);
 * - `expectedTotal` is what the review dialog showed. A mismatch answers `409`
 *   with `fields.cotacao`, which is how the checkout knows it must ask for a new
 *   confirmation instead of silently charging another amount;
 * - `idempotencyKey` is persisted by the client before sending: the same key
 *   always recovers the same order, and reusing it with different content is a
 *   conflict.
 */
export interface CreateOrderInput {
  idempotencyKey: string
  items: CartEntry[]
  coupon: string | null
  expectedTotal: EthAmount
  customer: OrderCustomer
  wallet: {
    id: string | null
    address: string
    provider: WalletProvider
    network: NftNetwork
  }
}

/** Answer of `POST /api/orders` and `GET /api/orders/:orderId`. */
export type OrderResponse = Order

/**
 * Answer of `GET /api/orders` (Seção 9): the collector's own orders, newest
 * first. Only the owner ever sees this list — the mock scopes it by session.
 */
export interface OrdersListResponse {
  orders: Order[]
}

/** Used by the review dialog to compare the reviewed quote with a fresh one. */
export const quotesMatch = (a: QuoteResponse, b: QuoteResponse): boolean => {
  if (
    a.total !== b.total ||
    a.subtotal !== b.subtotal ||
    a.discount !== b.discount ||
    a.networkFee !== b.networkFee ||
    a.count !== b.count
  ) {
    return false
  }
  if (a.lines.length !== b.lines.length) return false
  const key = (line: QuoteResponse['lines'][number]) => line.nftId
  const left = [...a.lines].sort((x, y) => key(x).localeCompare(key(y)))
  const right = [...b.lines].sort((x, y) => key(x).localeCompare(key(y)))
  return left.every((line, index) => {
    const other = right[index]
    return (
      other !== undefined &&
      line.nftId === other.nftId &&
      line.quantity === other.quantity &&
      line.unitPrice === other.unitPrice &&
      line.available === other.available
    )
  })
}
