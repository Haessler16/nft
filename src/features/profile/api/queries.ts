import { queryOptions } from '@tanstack/react-query'

import { fetchProfile } from '@/features/profile/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Query options do perfil do colecionista (docs/PLAN.md → Seção 11).
 *
 * O escopo é o id do usuário (ou `guest` antes do login), igual a todas as
 * demais consultas privadas, então logout/troca de usuário invalida o cache
 * do perfil do usuário anterior sem nunca expor outro perfil.
 *
 * `aria-live` dos formulários é acionado pela mutação, não por esta query —
 * o estado de carregamento do perfil é silencioso porque o formulário de
 * leitura já foi renderizado.
 */
export const profileQueryOptions = (scope: UserScope, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.profile.byUser(scope),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled,
    staleTime: 30_000,
  })
