import { createContext } from 'react'

import type { SessionUser } from '@/features/auth/api/contracts'
import type {
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from '@/features/auth/api/mutations'
import type { UserScope } from '@/lib/query/keys'

/**
 * Session context shape (docs/PLAN.md → Seção 4).
 *
 * One session is read for the whole app: the header, the route guards and every
 * private feature ask who is signed in, so they can never disagree about it.
 *
 * A visitor is answered with 401 by the API; that is a normal state, not an
 * error to render — hence `isSignedOut` instead of a red error box.
 */
export interface SessionValue {
  user: SessionUser | null
  isAuthenticated: boolean
  /** First load of the session (resolves to either a user or a 401). */
  isLoading: boolean
  /** A 401 means "signed out", not a failure to render. */
  isSignedOut: boolean
  /** Real failure (network/5xx) — screens may offer a retry. */
  error: unknown | null
  /** Query scope for private resources: the user id, or `guest`. */
  scope: UserScope
  login: ReturnType<typeof useLoginMutation>
  signup: ReturnType<typeof useRegisterMutation>
  logout: ReturnType<typeof useLogoutMutation>
  refetch: () => void
}

export const SessionContext = createContext<SessionValue | null>(null)
