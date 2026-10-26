import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  connectWallet,
  createWallet,
  updateWallet,
  deleteWallet,
  fetchWallets,
} from '@/features/wallets/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Mutação de conexão de carteira (docs/PLAN.md → Seção 8).
 *
 * A recusa é `200` com `status: "refused"` (o contrato modela um extension
 * que responde "rede errada"), então aqui não é tratada como erro: o checkout
 * renderiza o motivo ao lado dos controles e mantém o fluxo reversível.
 */
export const useConnectWallet = () =>
  useMutation({ mutationFn: connectWallet })

/**
 * Query de carteiras cadastradas (docs/PLAN.md → Seção 8).
 *
 * Usa o escopo da sessão, como todo recurso privado, para que logout/troca
 * de usuário não exponha endereços de outra conta.
 */
export const useWallets = (scope: UserScope, enabled = true) =>
  useQuery({
    queryKey: queryKeys.wallets.byUser(scope),
    queryFn: () => fetchWallets(),
    enabled,
    staleTime: 60_000,
  })

/** Cria ou atualiza carteira e invalida a lista do usuário. */
export const useCreateWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createWallet>[0] | Parameters<typeof updateWallet>[0]) =>
      'walletId' in input ? updateWallet(input) : createWallet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
    },
  })
}

/** Atualiza carteira existente e invalida a lista do usuário. */
export const useUpdateWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof updateWallet>[0]) =>
      updateWallet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
    },
  })
}

/** Remove carteira secundária e invalida a lista do usuário. */
export const useDeleteWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ walletId }: { walletId: string }) => deleteWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
    },
  })
}
