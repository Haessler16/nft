import { useContext } from 'react'

import { SessionContext, type SessionValue } from '@/app/session/context'
import type { UserScope } from '@/lib/query/keys'

/**
 * Session hooks. The value comes from `SessionProvider`, which owns the query —
 * there is exactly one session read per render tree, so the header, the route
 * guards and private queries always agree about who is signed in.
 */
export const useSession = (): SessionValue => {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSession precisa estar dentro de <SessionProvider>.')
  }
  return value
}

/** Convenience for private queries: current user id, or `guest` before login. */
export const useSessionScope = (): UserScope => useSession().scope
