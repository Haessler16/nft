import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'

import { useSession } from '@/app/session/hooks'
import { useToggleFavorite } from '@/features/favorites/api/mutations'
import { favoritesQueryOptions } from '@/features/favorites/api/queries'

export interface FavoriteToggle {
  /** Desired/optimistic state of this NFT for the signed-in user. */
  favorited: boolean
  /** First load of the user's favorites (controls a disabled heart). */
  isLoading: boolean
  /** Mutation in flight — the optimistic state is already on screen. */
  isPending: boolean
  /** Mutation failed: the optimistic state was rolled back. */
  isError: boolean
  /** Toggles, or sends a visitor to `/login` coming back to this URL. */
  toggle: () => void
}

/**
 * Session-aware favorite toggle, shared by the catalog card and the detail
 * screen (docs/PLAN.md → Seção 6).
 *
 * - the favorites list is only requested for a signed-in user, so a visitor
 *   never triggers the 401 the API answers with;
 * - a visitor clicking the heart goes to `/login?redirect=<current URL>`, the
 *   same contract used by the private-route guards;
 * - the mutation itself is optimistic with rollback
 *   (`features/favorites/api/mutations.ts`).
 */
export const useFavoriteToggle = (nftId: string): FavoriteToggle => {
  const { isAuthenticated, scope } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const query = useQuery(favoritesQueryOptions(scope, isAuthenticated))
  const mutation = useToggleFavorite(scope)

  const favorited = query.data?.nftIds.includes(nftId) ?? false

  const toggle = () => {
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect: location.href } })
      return
    }
    mutation.mutate({ nftId, favorited: !favorited })
  }

  return {
    favorited,
    isLoading: isAuthenticated && query.isPending,
    isPending: mutation.isPending,
    isError: mutation.isError,
    toggle,
  }
}
