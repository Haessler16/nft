import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { FavoritesResponse } from '@/features/favorites/api/contracts'
import { addFavorite, removeFavorite } from '@/features/favorites/api/endpoints'
import { isApiError } from '@/lib/api/errors'
import { queryKeys, type UserScope } from '@/lib/query/keys'

export interface ToggleFavoriteInput {
  nftId: string
  /** Desired state after the mutation (what the user just asked for). */
  favorited: boolean
}

/**
 * Favorite toggle with **optimistic update + rollback** (docs/PLAN.md → Seção 6).
 *
 * 1. `onMutate` cancels in-flight refetches, snapshots the current list and
 *    applies the toggle immediately, so the heart reacts on the same click;
 * 2. `onError` restores the snapshot — a failed mutation never leaves a
 *    favorite that the server does not have;
 * 3. `onSettled` refetches, reconciling the UI with the server's answer.
 *
 * The error is surfaced as a toast (global) and, in the component, through a
 * polite live region, so screen readers announce the rollback.
 */
export const useToggleFavorite = (scope: UserScope) => {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.favorites.byUser(scope)

  return useMutation({
    mutationFn: ({ nftId, favorited }: ToggleFavoriteInput) =>
      favorited ? addFavorite(nftId) : removeFavorite(nftId),

    onMutate: async ({ nftId, favorited }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FavoritesResponse>(queryKey)

      queryClient.setQueryData<FavoritesResponse>(queryKey, (current) => {
        const nftIds = current?.nftIds ?? []
        const next = favorited
          ? nftIds.includes(nftId)
            ? nftIds
            : [...nftIds, nftId]
          : nftIds.filter((id) => id !== nftId)
        return { nftIds: next }
      })

      return { previous }
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      const message = isApiError(error)
        ? error.message
        : 'Não foi possível atualizar os favoritos.'
      toast.error(message)
      return message
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
