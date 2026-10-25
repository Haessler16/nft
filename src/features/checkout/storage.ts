import type { CartEntry } from '@/features/cart/api/contracts'
import type { UserScope } from '@/lib/query/keys'

/**
 * Checkout persistence (docs/PLAN.md → Seção 8).
 *
 * Two small records survive a refresh, and both are scoped by the user so a
 * switch of account never inherits the previous buyer's purchase:
 *
 * - **idempotency key**: created *before* the first POST and kept until the
 *   order reaches a terminal state. A repeated click, a retry after a timeout
 *   or a reload mid-send all reuse it, which is what makes the server answer
 *   the same order instead of creating a second one. The key is bound to a
 *   fingerprint of the reviewed content, so editing the cart produces a new key
 *   (and the API rejects reusing one with different content anyway);
 * - **active order id**: lets the checkout reopen a pending order after a
 *   refresh or a reconnection, instead of showing an empty cart and letting the
 *   user buy twice.
 */

const KEY_PREFIX = 'kurio:checkout'

const idempotencyStoreKey = (scope: UserScope) => `${KEY_PREFIX}:key:${scope}`
const orderStoreKey = (scope: UserScope) => `${KEY_PREFIX}:order:${scope}`

interface StoredKey {
  fingerprint: string
  key: string
}

const readJson = <T>(storageKey: string): T | null => {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const writeJson = (storageKey: string, value: unknown): void => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Private mode / quota: the flow still works for this tab; only the
    // refresh recovery is lost.
  }
}

const remove = (storageKey: string): void => {
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // ignore
  }
}

/**
 * Identity of what is being bought: items, coupon and reviewed total. Prices
 * are part of it because a new total means a new purchase intent, and the API
 * treats a reused key with other content as a conflict.
 */
export const checkoutFingerprint = (
  items: readonly CartEntry[],
  coupon: string | undefined,
  total: string,
): string =>
  [
    [...items]
      .sort((a, b) => a.nftId.localeCompare(b.nftId))
      .map((item) => `${item.nftId}x${item.quantity}`)
      .join(','),
    coupon?.toUpperCase() ?? '',
    total,
  ].join('|')

const createKey = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Returns the key for this fingerprint, creating one when absent. Called right
 * before the POST, so a reload between "clicked" and "answered" still finds it.
 */
export const ensureIdempotencyKey = (
  scope: UserScope,
  fingerprint: string,
): string => {
  const storageKey = idempotencyStoreKey(scope)
  const stored = readJson<StoredKey>(storageKey)
  if (stored && stored.fingerprint === fingerprint) return stored.key

  const key = createKey()
  writeJson(storageKey, { fingerprint, key } satisfies StoredKey)
  return key
}

export const readIdempotencyKey = (scope: UserScope): StoredKey | null =>
  readJson<StoredKey>(idempotencyStoreKey(scope))

export const clearIdempotencyKey = (scope: UserScope): void =>
  remove(idempotencyStoreKey(scope))

export const readActiveOrderId = (scope: UserScope): string | null => {
  const stored = readJson<{ orderId?: string }>(orderStoreKey(scope))
  return stored?.orderId ?? null
}

export const saveActiveOrderId = (scope: UserScope, orderId: string): void => {
  writeJson(orderStoreKey(scope), { orderId })
}

export const clearActiveOrderId = (scope: UserScope): void => {
  remove(orderStoreKey(scope))
  clearIdempotencyKey(scope)
}
