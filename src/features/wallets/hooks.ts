import { useQuery } from '@tanstack/react-query'

import { useSession } from '@/app/session/hooks'
import { walletsQueryOptions } from '@/features/wallets/api/queries'

/**
 * Registered wallets of the current collector (docs/PLAN.md → Seção 8).
 *
 * Private: the query waits for the session to settle and never runs for a
 * visitor, so a guest checkout can never request `GET /api/wallets` (which
 * answers 401).
 */
export const useWallets = () => {
  const { scope, isLoading, isAuthenticated } = useSession()
  const query = useQuery(walletsQueryOptions(scope, !isLoading && isAuthenticated))

  return {
    scope,
    query,
    wallets: query.data?.wallets ?? [],
    primary: query.data?.wallets.find((wallet) => wallet.primary) ?? null,
  }
}
