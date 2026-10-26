import type { CartEntry } from '@/features/cart/api/contracts'
import {
  isStrongPassword,
} from '@/features/auth/api/contracts'
import type { NftDetail, NftNetwork } from '@/features/nfts/api/contracts'
import type { Order } from '@/features/orders/api/contracts'
import { percentOf, sumEth } from '@/lib/money'
import { hashPassword } from '@/mocks/fixtures/users'
import { buildNfts } from '@/mocks/fixtures/nfts'
import { USERS, type UserFixture } from '@/mocks/fixtures/users'
import { WALLETS, type WalletFixture } from '@/mocks/fixtures/wallets'
import { env } from '@/lib/env'
import { GUEST_SCOPE } from '@/lib/query/keys'

/**
 * Single source of truth for the mocked backend.
 *
 * Handlers read and mutate this state so the catalog, session, favorites, cart,
 * profile, wallets and orders can never disagree. It is persisted in
 * `localStorage` to support refresh, and `resetDatabase()` restores the
 * deterministic seed used by the demo and the E2E tests.
 *
 * The session is an opaque `{ userId }` here: passwords are validated against
 * the fixtures and never reach this state.
 */

/** Cart scope for an unauthenticated visitor (merged into the user on login). */
export { GUEST_SCOPE }

export interface SessionState {
  userId: string
  createdAt: string
}

/**
 * Order as stored by the mock: the public snapshot plus what only the server
 * needs — owner, idempotency bookkeeping and when the payment settles.
 */
export interface StoredOrder extends Order {
  userId: string
  idempotencyKey: string
  /** Digest of the request content, so the same key with another payload is a conflict. */
  requestHash: string
  /** Moment the simulated payment moves from pending to a terminal state. */
  settleAt: string
}

export type { WalletFixture }

export interface DbState {
  version: number
  nfts: NftDetail[]
  /** Accounts: the fixture seed plus any account created through `/auth/register`. */
  users: UserFixture[]
  session: SessionState | null
  /** Favorites per user id. */
  favorites: Record<string, string[]>
  /** Carts per scope (`guest` or a user id). */
  carts: Record<string, CartEntry[]>
  /** Registered wallets (Seções 8 e 11). */
  wallets: WalletFixture[]
  /** Orders per user; each one is a frozen snapshot (Seções 8 e 9). */
  orders: StoredOrder[]
  /** Sequence used by deterministic order ids (`ord_0001`). */
  orderSeq: number
  /** Active deterministic scenario (docs/PLAN.md → Seção 2). */
  scenario: string
  /**
   * Last realtime version emitted per resource (Seção 10). Wall-clock based
   * and persisted with the state, so every tab agrees on the monotonic order
   * and a reset never produces versions lower than what clients already saw.
   */
  versions: Record<string, number>
}

const STORAGE_KEY = 'kurio:db:v4'
const SCHEMA_VERSION = 4

/**
 * Deterministic 64-hex transaction hash derived from the order id.
 *
 * The mock has no chain: the value only needs to be stable (a refresh keeps the
 * same receipt) and shaped like a real tx hash.
 */
const transactionHash = (orderId: string): string => {
  let hash = 0x811c9dc5
  for (const character of orderId) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  let out = ''
  for (let index = 0; index < 8; index += 1) {
    hash = Math.imul(hash ^ (hash >>> 13), 0x5bd1e995) >>> 0
    out += hash.toString(16).padStart(8, '0')
  }
  return `0x${out}`
}

/** Simulated explorer per network; the UI labels the link as fictional. */
export const EXPLORER_URLS: Record<NftNetwork, string> = {
  Ethereum: 'https://etherscan.io/tx/',
  Polygon: 'https://polygonscan.com/tx/',
  Solana: 'https://solscan.io/tx/',
}

/**
 * Scenarios that change **data** (docs/PLAN.md → Seção 2) rebuild the catalog
 * from the seed and transform it afterwards, so flipping a scenario twice never
 * compounds (`price-changed` is always +10%, never +21%) and switching back to
 * `default` restores the original prices. Network-only scenarios (`flaky`,
 * `session-expired`) live inside the handlers and leave the data untouched.
 */
const applyScenarioData = (scenario: string): NftDetail[] => {
  const seed = buildNfts()
  if (scenario === 'price-changed') {
    return seed.map((nft) => ({
      ...nft,
      priceEth: sumEth([nft.priceEth, percentOf(nft.priceEth, 10)]),
    }))
  }
  if (scenario === 'sold-out') {
    return seed.map((nft) => ({ ...nft, available: 0 }))
  }
  return seed
}

const createState = (): DbState => ({
  version: SCHEMA_VERSION,
  nfts: applyScenarioData(env.mockScenario),
  users: [...USERS],
  session: null,
  favorites: {},
  carts: { [GUEST_SCOPE]: [] },
  wallets: [...WALLETS],
  orders: [],
  orderSeq: 0,
  scenario: env.mockScenario,
  versions: {},
})

const readState = (): DbState | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DbState
    if (
      parsed.version !== SCHEMA_VERSION ||
      !Array.isArray(parsed.nfts) ||
      !Array.isArray(parsed.users) ||
      typeof parsed.favorites !== 'object' ||
      parsed.favorites === null ||
      typeof parsed.carts !== 'object' ||
      parsed.carts === null ||
      !Array.isArray(parsed.wallets) ||
      !Array.isArray(parsed.orders) ||
      typeof parsed.orderSeq !== 'number'
    ) {
      return null
    }
    // `versions` arrived with Seção 10; an older persisted state is still valid.
    if (typeof parsed.versions !== 'object' || parsed.versions === null) {
      parsed.versions = {}
    }
    return parsed
  } catch {
    return null
  }
}

const persist = (state: DbState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode/quota); mocks keep working in memory.
  }
}

let state: DbState = readState() ?? createState()

const commit = (next: DbState): DbState => {
  state = next
  persist(state)
  return state
}

const update = (patch: (current: DbState) => Partial<DbState>): DbState =>
  commit({ ...state, ...patch(state) })

export const db = {
  get state(): DbState {
    return state
  },
  get nfts(): NftDetail[] {
    return state.nfts
  },
  get scenario(): string {
    return state.scenario
  },
  setScenario(scenario: string): DbState {
    // Data scenarios are re-derived from the seed here, so the catalog, the
    // detail screen, the cart and the quote all agree on the same numbers.
    return update(() => ({ scenario, nfts: applyScenarioData(scenario) }))
  },

  /** Session ------------------------------------------------------------- */
  get session(): SessionState | null {
    return state.session
  },

  /** Accounts ------------------------------------------------------------ */
  findUserByEmail(email: string): UserFixture | undefined {
    const target = email.trim().toLowerCase()
    return state.users.find((user) => user.email.toLowerCase() === target)
  },
  findUserById(userId: string): UserFixture | undefined {
    return state.users.find((user) => user.id === userId)
  },
  /** Creates an account from the registration form (digest, never the password). */
  createUser(input: {
    name: string
    email: string
    passwordHash: string
  }): UserFixture {
    const user: UserFixture = {
      id: `user_${(state.users.length + 1).toString().padStart(3, 'x')}_${Date.now().toString(36)}`,
      name: input.name.trim(),
      email: input.email.trim(),
      passwordHash: input.passwordHash,
      bio: null,
      avatarUrl: null,
    }
    update((current) => ({ users: [...current.users, user] }))
    return user
  },

  signIn(userId: string): DbState {
    return update(() => ({
      session: { userId, createdAt: new Date().toISOString() },
    }))
  },
  signOut(): DbState {
    return update(() => ({ session: null }))
  },

  /** Favorites ------------------------------------------------------------ */
  favoritesFor(userId: string): string[] {
    return state.favorites[userId] ?? []
  },
  setFavoritesFor(userId: string, nftIds: string[]): DbState {
    return update(() => ({ favorites: { ...state.favorites, [userId]: nftIds } }))
  },

  /** Cart ----------------------------------------------------------------- */
  cartFor(scope: string): CartEntry[] {
    return state.carts[scope] ?? []
  },
  setCartFor(scope: string, items: CartEntry[]): DbState {
    return update(() => ({ carts: { ...state.carts, [scope]: items } }))
  },

  /** Wallets -------------------------------------------------------------- */
  walletsFor(userId: string): WalletFixture[] {
    return state.wallets.filter((wallet) => wallet.userId === userId)
  },
  findWallet(userId: string, walletId: string): WalletFixture | undefined {
    return state.wallets.find(
      (wallet) => wallet.userId === userId && wallet.id === walletId,
    )
  },
  createWallet(input: {
    userId: string
    label: string
    provider: WalletFixture['provider']
    address: string
    network: WalletFixture['network']
    primary: boolean
  }): WalletFixture {
    const wallet: WalletFixture = {
      id: `wal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      ...input,
      supportedNetworks: WALLETS[0]?.supportedNetworks ?? [],
    }
    update((current) => ({ wallets: [...current.wallets, wallet] }))
    return wallet
  },
  updateWallet(
    userId: string,
    walletId: string,
    patch: Partial<Pick<WalletFixture, 'label' | 'provider' | 'address' | 'network' | 'primary'>>,
  ): WalletFixture | undefined {
    const wallets = state.wallets.map((wallet) =>
      wallet.userId === userId && wallet.id === walletId
        ? { ...wallet, ...patch }
        : wallet,
    )
    const wallet = wallets.find(
      (candidate) => candidate.userId === userId && candidate.id === walletId,
    )
    if (!wallet) return undefined
    update(() => ({ wallets }))
    return wallet
  },
  deleteWallet(userId: string, walletId: string): boolean {
    const wallet = state.wallets.find(
      (candidate) => candidate.userId === userId && candidate.id === walletId,
    )
    if (!wallet) return false
    if (wallet.primary) return false
    update((current) => ({
      wallets: current.wallets.filter(
        (candidate) =>
          !(candidate.userId === userId && candidate.id === walletId),
      ),
    }))
    return true
  },

  /** Profile -------------------------------------------------------------- */
  getProfile(userId: string) {
    const user = state.users.find((candidate) => candidate.id === userId)
    if (!user) return null
    return {
      displayName: user.name,
      email: user.email,
      bio: user.bio ?? '',
      avatarUrl: user.avatarUrl,
    }
  },
  updateProfile(
    userId: string,
    patch: {
      displayName?: string
      email?: string
      bio?: string
      avatarUrl?: string | null
    },
  ) {
    const user = state.users.find((candidate) => candidate.id === userId)
    if (!user) return null
    const next: UserFixture = {
      ...user,
      bio: patch.bio !== undefined ? patch.bio : user.bio,
    }
    if (patch.displayName !== undefined) next.name = patch.displayName
    if (patch.email !== undefined) next.email = patch.email
    if (patch.avatarUrl !== undefined) next.avatarUrl = patch.avatarUrl
    update((current) => ({ users: current.users.map((candidate) =>
      candidate.id === userId ? next : candidate,
    )}))
    return {
      displayName: next.name,
      email: next.email,
      bio: next.bio ?? '',
      avatarUrl: next.avatarUrl,
    }
  },
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): { ok: true } | { error: 'CURRENT_WRONG' | 'NEW_WEAK' } {
    const user = state.users.find((candidate) => candidate.id === userId)
    if (!user) return { error: 'CURRENT_WRONG' }
    if (user.passwordHash !== hashPassword(currentPassword)) return { error: 'CURRENT_WRONG' }
    if (!isStrongPassword(newPassword)) return { error: 'NEW_WEAK' }
    update((current) => ({
      users: current.users.map((candidate) =>
        candidate.id === userId ? { ...candidate, passwordHash: hashPassword(newPassword) } : candidate,
      ),
    }))
    return { ok: true }
  },

  /** Orders --------------------------------------------------------------- */
  /** Deterministic next id (`ord_0001`), persisted so ids never repeat. */
  nextOrderId(): string {
    const seq = state.orderSeq + 1
    update(() => ({ orderSeq: seq }))
    return `ord_${String(seq).padStart(4, '0')}`
  },
  ordersFor(userId: string): StoredOrder[] {
    return state.orders.filter((order) => order.userId === userId)
  },
  findOrder(userId: string, orderId: string): StoredOrder | undefined {
    return state.orders.find(
      (order) => order.userId === userId && order.id === orderId,
    )
  },
  /** Same key + same user = the same order, which is what makes retries safe. */
  findOrderByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): StoredOrder | undefined {
    return state.orders.find(
      (order) =>
        order.userId === userId && order.idempotencyKey === idempotencyKey,
    )
  },
  createOrder(order: StoredOrder): StoredOrder {
    update((current) => ({ orders: [...current.orders, order] }))
    return order
  },

  /**
   * Settles due payments (docs/PLAN.md → Seção 8).
   *
   * Called by the order handlers before answering, so a refresh (or a GET after
   * the socket reconnects) always observes the same terminal state a live
   * client would have received. The outcome is a scenario rule:
   *
   * - `payment-declined` → **declined**, and nothing is taken from the cart;
   * - any other scenario → **confirmed**, which decrements the edition's stock
   *   and removes *only* the bought quantities from the buyer's cart.
   */
  settleOrders(now = Date.now()): StoredOrder[] {
    const due = state.orders.filter(
      (order) =>
        order.status === 'pending' && Date.parse(order.settleAt) <= now,
    )
    if (due.length === 0) return []

    const orders = [...state.orders]
    let nfts = state.nfts
    let carts = { ...state.carts }
    const settled: StoredOrder[] = []

    for (const target of due) {
      const index = orders.findIndex((order) => order.id === target.id)
      const order = orders[index]
      if (!order) continue

      if (state.scenario === 'payment-declined') {
        const declined: StoredOrder = {
          ...order,
          status: 'declined',
          updatedAt: new Date(now).toISOString(),
          failureReason: 'Pagamento recusado pela simulação.',
        }
        orders[index] = declined
        settled.push(declined)
        continue
      }

      const confirmedAt = new Date(now).toISOString()
      const hash = transactionHash(order.id)
      const confirmed: StoredOrder = {
        ...order,
        status: 'confirmed',
        updatedAt: confirmedAt,
        transaction: {
          hash,
          explorerUrl: `${EXPLORER_URLS[order.wallet.network]}${hash}`,
          confirmedAt,
        },
        failureReason: null,
      }
      orders[index] = confirmed
      settled.push(confirmed)

      // Stock leaves only when the payment is confirmed...
      nfts = nfts.map((nft) => {
        const line = order.lines.find((candidate) => candidate.nftId === nft.id)
        return line
          ? { ...nft, available: Math.max(0, nft.available - line.quantity) }
          : nft
      })

      // ...and only the bought quantities leave the cart.
      const cart = carts[order.userId] ?? []
      carts = {
        ...carts,
        [order.userId]: cart
          .map((entry) => {
            const line = order.lines.find(
              (candidate) => candidate.nftId === entry.nftId,
            )
            return line
              ? { ...entry, quantity: entry.quantity - line.quantity }
              : entry
          })
          .filter((entry) => entry.quantity > 0),
      }
    }

    commit({ ...state, orders, nfts, carts })
    return settled
  },

  /**
   * Next monotonic version for a resource (docs/PLAN.md → Seção 10).
   *
   * Based on the wall clock with a `+1` guard, so it strictly increases even
   * for several emissions in the same millisecond — and stays above anything a
   * client has seen after a reset (old versions are timestamps too).
   */
  nextVersion(resourceId: string): number {
    const previous = state.versions[resourceId] ?? 0
    const version = Math.max(Date.now(), previous + 1)
    update((current) => ({
      versions: { ...current.versions, [resourceId]: version },
    }))
    return version
  },
  /**
   * Re-reads the persisted state (docs/PLAN.md → Seção 10).
   *
   * Handlers run in the page, so every tab keeps its own in-memory copy. When
   * another tab mutates the shared `localStorage`, this tab calls `reload()`
   * before answering anything else — otherwise a REST refetch triggered by a
   * realtime event would answer with stale data.
   */
  reload(): DbState {
    const fresh = readState()
    if (fresh) state = fresh
    return state
  },
  /** Replaces the whole state and persists it. */
  commit,
  /** Restores the deterministic seed (used by demo reset and tests). */
  reset(): DbState {
    return commit(createState())
  },
}
