import { http, HttpResponse } from 'msw'

import type { FavoritesResponse } from '@/features/favorites/api/contracts'
import { db } from '@/mocks/db'
import {
  errorEnvelope,
  notFound,
  scenarioFails,
  unauthorized,
} from '@/mocks/handlers/envelope'

/**
 * Favorites handlers (docs/PLAN.md → Seção 6).
 *
 * The set is stored per user id, so two accounts never share favorites and a
 * visitor always gets 401 — the UI answers that by sending them to the login.
 *
 * The `flaky` scenario makes both mutations fail with 500; it exists so the
 * optimistic update can be observed rolling back in the E2E suite.
 */

const requireUserId = (): string | null => db.session?.userId ?? null

const respond = () => {
  const userId = requireUserId()
  if (!userId) return unauthorized('Entre para ver seus favoritos.')
  const body: FavoritesResponse = { nftIds: db.favoritesFor(userId) }
  return HttpResponse.json(body)
}

export const favoriteHandlers = [
  http.get('/api/favorites', respond),

  http.put('/api/favorites/:nftId', ({ params }) => {
    const userId = requireUserId()
    if (!userId) return unauthorized('Entre para favoritar este NFT.')
    const nftId = String(params.nftId ?? '')
    if (!db.nfts.some((nft) => nft.id === nftId)) {
      return notFound('NFT não encontrado.')
    }
    if (scenarioFails(db.scenario)) {
      return errorEnvelope(503, 'UNAVAILABLE', 'Serviço temporariamente indisponível.')
    }

    const current = db.favoritesFor(userId)
    if (!current.includes(nftId)) {
      db.setFavoritesFor(userId, [...current, nftId])
    }
    const body: FavoritesResponse = { nftIds: db.favoritesFor(userId) }
    return HttpResponse.json(body)
  }),

  http.delete('/api/favorites/:nftId', ({ params }) => {
    const userId = requireUserId()
    if (!userId) return unauthorized('Entre para gerenciar seus favoritos.')
    const nftId = String(params.nftId ?? '')
    if (scenarioFails(db.scenario)) {
      return errorEnvelope(503, 'UNAVAILABLE', 'Serviço temporariamente indisponível.')
    }

    db.setFavoritesFor(
      userId,
      db.favoritesFor(userId).filter((id) => id !== nftId),
    )
    const body: FavoritesResponse = { nftIds: db.favoritesFor(userId) }
    return HttpResponse.json(body)
  }),
]
