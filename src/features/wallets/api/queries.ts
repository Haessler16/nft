import { queryOptions } from '@tanstack/react-query'

import { fetchWallets } from '@/features/wallets/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Registered wallets for the signed-in collector (docs/PLAN.md → Seção 8).
 *
 * Keyed by scope like every private resource, so a user switch can never show
 * another account's addresses, and the checkout reads the same entry the
 * wallets screen will use in Seção 11.
 */
export const walletsQueryOptions = (scope: UserScope, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.wallets.byUser(scope),
    queryFn: ({ signal }) => fetchWallets(signal),
    enabled,
    staleTime: 60_000,
  })
