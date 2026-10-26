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
 * Wallet connection simulation (docs/PLAN.md → Seção 8).
 *
 * A refusal is a `200` with `status: "refused"` (the contract models an
 * extension answering "wrong network"), so it is *not* an error here: the
 * checkout renders the reason next to the wallet controls and keeps the rest of
 * the form usable.
 */
export const useConnectWallet = () =>
  useMutation({ mutationFn: connectWallet })

export const useWallets = (scope: UserScope, enabled = true) =>
  useQuery({
    queryKey: queryKeys.wallets.byUser(scope),
    queryFn: () => fetchWallets(),
    enabled,
    staleTime: 60_000,
  })

export const useCreateWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createWallet>[0]) =>
      createWallet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
    },
  })
}

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

export const useDeleteWallet = (scope: UserScope) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ walletId }: { walletId: string }) => deleteWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.byUser(scope) })
    },
  })
}
