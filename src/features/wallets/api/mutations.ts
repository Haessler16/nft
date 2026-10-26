import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  connectWallet,
  createWallet,
  updateWallet,
  deleteWallet,
} from '@/features/wallets/api/endpoints'
import { isApiError } from '@/lib/api/errors'
import { queryKeys, type UserScope } from '@/lib/query/keys'

const errorMessage = (error: unknown, fallback: string): string => {
  if (!isApiError(error)) return fallback
  return Object.values(error.fields)[0] ?? error.message
}

/**
 * Mutação de conexão de carteira (docs/PLAN.md → Seção 8).
 *
 * A recusa é `200` com `status: "refused"` (o contrato modela um extension
 * que responde "rede errada"), então aqui não é tratada como erro: o checkout
 * renderiza o motivo ao lado dos controles e mantém o fluxo reversível.
 */
export const useConnectWallet = () => useMutation({ mutationFn: connectWallet })

/** Cria uma carteira e invalida a lista do usuário. */
export const useCreateWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createWallet>[0]) => createWallet(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
      toast.success('Carteira cadastrada.')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Não foi possível cadastrar a carteira.'))
    },
  })
}

/** Atualiza carteira existente e invalida a lista do usuário. */
export const useUpdateWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof updateWallet>[0]) => updateWallet(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
      toast.success('Carteira atualizada.')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Não foi possível atualizar a carteira.'))
    },
  })
}

/** Remove carteira secundária e invalida a lista do usuário. */
export const useDeleteWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ walletId }: { walletId: string }) => deleteWallet(walletId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
      toast.success('Carteira removida.')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Não foi possível remover a carteira.'))
    },
  })
}
