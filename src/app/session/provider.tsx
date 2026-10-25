import { useQuery } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'

import { SessionContext, type SessionValue } from '@/app/session/context'
import {
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from '@/features/auth/api/mutations'
import { sessionQueryOptions } from '@/features/auth/api/queries'
import { isApiError } from '@/lib/api/errors'
import { GUEST_SCOPE } from '@/lib/query/keys'

/**
 * Provides the session to the whole tree (docs/PLAN.md → Seção 4).
 *
 * The session is a query, so it lives in the TanStack Query cache (`['session']`):
 * a refresh restores it, logout removes it, and route guards read the very same
 * entry through `ensureQueryData`.
 *
 * It must be rendered inside `QueryClientProvider`.
 */
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const query = useQuery(sessionQueryOptions())
  const login = useLoginMutation()
  const signup = useRegisterMutation()
  const logout = useLogoutMutation()

  const apiError = isApiError(query.error) ? query.error : null
  const user = query.data?.user ?? null

  const value = useMemo<SessionValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: query.isPending,
      isSignedOut: query.isError && apiError?.isUnauthorized === true,
      error: query.isError && apiError?.isUnauthorized !== true ? query.error : null,
      scope: user?.id ?? GUEST_SCOPE,
      login,
      signup,
      logout,
      refetch: query.refetch,
    }),
    [
      user,
      query.isPending,
      query.isError,
      query.error,
      query.refetch,
      apiError,
      login,
      signup,
      logout,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
