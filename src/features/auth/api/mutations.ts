import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { SessionResponse } from '@/features/auth/api/contracts'
import {
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '@/features/auth/api/endpoints'
import { isApiError } from '@/lib/api/errors'
import { GUEST_SCOPE, queryKeys } from '@/lib/query/keys'

/**
 * Login/logout mutations (docs/PLAN.md → Seção 4).
 *
 * The session query is written directly on success instead of invalidated, so
 * the header flips to the signed-in state in the same tick as the response —
 * there is no window where the app looks signed out right after authenticating.
 *
 * Login also drops the guest-scoped cart/favorites: the server merged the cart
 * into the account, so those entries are stale under the old scope.
 *
 * Field-level errors are returned untouched (the form maps them onto its
 * inputs); anything else becomes a toast.
 */

const PRIVATE_ROOTS_AFTER_LOGIN = [queryKeys.cart.all(), queryKeys.favorites.all()] as const

/**
 * Shared post-authentication state: the user is in the cache immediately, and
 * the visitor-scoped cart/favorites are dropped because the server already
 * merged the cart into the account.
 */
const applySignedIn = (queryClient: QueryClient, user: SessionResponse['user']): void => {
  queryClient.setQueryData(queryKeys.session(), { user })

  queryClient.removeQueries({ queryKey: [...queryKeys.cart.all(), GUEST_SCOPE] })
  queryClient.removeQueries({ queryKey: [...queryKeys.favorites.all(), GUEST_SCOPE] })
  for (const root of PRIVATE_ROOTS_AFTER_LOGIN) {
    void queryClient.invalidateQueries({ queryKey: root })
  }
}

export const useLoginMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: ({ user }: SessionResponse) => applySignedIn(queryClient, user),
    onError: (error) => {
      // The form renders the API's own field messages; anything else is global.
      if (isApiError(error) && error.hasFieldErrors) return
      toast.error(
        isApiError(error) ? error.message : 'Não foi possível entrar. Tente novamente.',
      )
    },
  })
}

/**
 * Registration starts the session in the same response, so it reuses the login
 * state transition — a 409 (e-mail taken) reaches the form as a field error.
 */
export const useRegisterMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: registerRequest,
    onSuccess: ({ user }: SessionResponse) => {
      applySignedIn(queryClient, user)
      toast.success(`Conta criada. Bem-vindo, ${user.name.split(' ')[0] ?? user.name}!`)
    },
    onError: (error) => {
      if (isApiError(error) && error.hasFieldErrors) return
      toast.error(
        isApiError(error) ? error.message : 'Não foi possível criar a conta. Tente novamente.',
      )
    },
  })
}

export const useLogoutMutation = () => {  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      // Drop every private entry (favorites, cart, orders, profile, wallets)
      // before anyone can read them under the next user, then re-read the
      // session so the shell returns to the signed-out state.
      for (const root of [
        ['favorites'],
        ['cart'],
        ['quote'],
        ['orders'],
        ['profile'],
        ['wallets'],
      ]) {
        queryClient.removeQueries({ queryKey: root })
      }
      queryClient.removeQueries({ queryKey: queryKeys.session() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.session() })
      toast.success('Sessão encerrada.')
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : 'Não foi possível sair da conta.')
    },
  })
}
