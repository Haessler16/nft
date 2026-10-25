import { queryOptions } from '@tanstack/react-query'

import { fetchFavorites } from '@/features/favorites/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Favorites are private, so the query is keyed by user scope and is only
 * enabled for a signed-in user — a visitor never issues the request (the API
 * would answer 401 and the UI would offer the login instead).
 */
export const favoritesQueryOptions = (scope: UserScope, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.favorites.byUser(scope),
    queryFn: ({ signal }) => fetchFavorites(signal),
    enabled,
    staleTime: 60_000,
  })
