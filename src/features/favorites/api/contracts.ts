/**
 * Favorites contracts shared by the MSW handlers, the Axios endpoints and the
 * UI. Favorites are a per-user set, so the response is the list of favorited
 * NFT ids in insertion order (order matters for the "my favorites" listing).
 */
export interface FavoritesResponse {
  nftIds: string[]
}
