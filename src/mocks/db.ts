import type { CartItem } from '@/features/cart/api/contracts'
import type { NftDetail } from '@/features/nfts/api/contracts'
import { buildNfts } from '@/mocks/fixtures/nfts'
import { USERS, type UserFixture } from '@/mocks/fixtures/users'
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

export interface DbState {
  version: number
  nfts: NftDetail[]
  /** Accounts: the fixture seed plus any account created through `/auth/register`. */
  users: UserFixture[]
  session: SessionState | null
  /** Favorites per user id. */
  favorites: Record<string, string[]>
  /** Carts per scope (`guest` or a user id). */
  carts: Record<string, CartItem[]>
  /** Active deterministic scenario (docs/PLAN.md → Seção 2). */
  scenario: string
}

const STORAGE_KEY = 'kurio:db:v3'
const SCHEMA_VERSION = 3

const createState = (): DbState => ({
  version: SCHEMA_VERSION,
  nfts: buildNfts(),
  users: [...USERS],
  session: null,
  favorites: {},
  carts: { [GUEST_SCOPE]: [] },
  scenario: env.mockScenario,
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
      parsed.carts === null
    ) {
      return null
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
    return update(() => ({ scenario }))
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
  cartFor(scope: string): CartItem[] {
    return state.carts[scope] ?? []
  },
  setCartFor(scope: string, items: CartItem[]): DbState {
    return update(() => ({ carts: { ...state.carts, [scope]: items } }))
  },

  /** Replaces the whole state and persists it. */
  commit,
  /** Restores the deterministic seed (used by demo reset and tests). */
  reset(): DbState {
    return commit(createState())
  },
}
