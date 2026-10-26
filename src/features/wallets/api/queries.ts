import { queryOptions } from '@tanstack/react-query'

import { fetchWallets } from '@/features/wallets/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Carteiras cadastradas do colecionista autenticado (docs/PLAN.md → Seção 8).
 *
 * A chave usa o escopo da sessão, como todo recurso privado, então uma troca
 * de usuário nunca expõe os endereços de outra conta e a tela de carteiras
 * na Seção 11 lê exatamente a mesma entrada que o checkout usa.
 */
export const walletsQueryOptions = (scope: UserScope, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.wallets.byUser(scope),
    queryFn: ({ signal }) => fetchWallets(signal),
    enabled,
    staleTime: 60_000,
  })
