import type { SessionUser } from '@/features/auth/api/contracts'
import { DEMO_ACCOUNTS } from '@/features/auth/demo'

/**
 * Accounts used by the mocked session API.
 *
 * The brief asks for fictional credentials that are never stored in plain text,
 * so the fixtures keep a salted digest (`hashPassword`) instead of the raw
 * value. The accounts are data, not behaviour: they live here and are only read
 * by the MSW handlers, never by components (the login screen reads
 * `features/auth/demo.ts` instead).
 */

export interface UserFixture {
  id: string
  name: string
  email: string
  passwordHash: string
  bio: string | null
  avatarUrl: string | null
}

/**
 * Small deterministic digest (djb2 + a reversed pass).
 *
 * This is a mock backend: it exists so the UI never sees a password in plain
 * text in the fixture file or in the mocked responses — not for real security.
 */
export const hashPassword = (password: string): string => {
  const salted = `kurio::${password}`
  let forward = 5381
  let backward = 52711
  for (let index = 0; index < salted.length; index += 1) {
    forward = ((forward << 5) + forward + salted.charCodeAt(index)) >>> 0
  }
  for (let index = salted.length - 1; index >= 0; index -= 1) {
    backward = ((backward << 5) + backward + salted.charCodeAt(index)) >>> 0
  }
  return `${forward.toString(16).padStart(8, '0')}${backward.toString(16).padStart(8, '0')}`
}

/** Seeded accounts: the demo credentials, digest-only in this file. */
export const USERS: readonly UserFixture[] = DEMO_ACCOUNTS.map((account) => ({
  id: account.id,
  name: account.name,
  email: account.email,
  passwordHash: hashPassword(account.password),
  bio: null,
  avatarUrl: null,
}))

/** Fixture → API mapping: the response never carries the password digest. */
export const toSessionUser = (user: UserFixture): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
})
