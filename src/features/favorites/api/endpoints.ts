import type { FavoritesResponse } from '@/features/favorites/api/contracts'
import { http } from '@/lib/api/client'

/**
 * Favorites endpoints. Favorites are a per-user set, so every response is the
 * full list of ids — the same shape the optimistic cache uses.
 */

export const fetchFavorites = async (signal?: AbortSignal): Promise<FavoritesResponse> => {
  const { data } = await http.get<FavoritesResponse>('/favorites', { signal })
  return data
}

export const addFavorite = async (nftId: string): Promise<FavoritesResponse> => {
  const { data } = await http.put<FavoritesResponse>(
    `/favorites/${encodeURIComponent(nftId)}`,
  )
  return data
}

export const removeFavorite = async (nftId: string): Promise<FavoritesResponse> => {
  const { data } = await http.delete<FavoritesResponse>(
    `/favorites/${encodeURIComponent(nftId)}`,
  )
  return data
}
