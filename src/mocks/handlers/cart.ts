import { http, HttpResponse } from 'msw'

import type { CartItem, CartResponse } from '@/features/cart/api/contracts'
import { db, GUEST_SCOPE } from '@/mocks/db'
import { errorEnvelope, notFound } from '@/mocks/handlers/envelope'

/**
 * Cart handlers (docs/PLAN.md → Seções 6 e 7).
 *
 * The cart stores only item + quantity; every price shown to the user comes
 * from the quote endpoint. Visitors keep their own scope (`guest`), which the
 * login handler merges into the account.
 *
 * Availability lives with the NFT, so adding more units than the edition has
 * left answers 409 CONFLICT — the same contract the checkout revalidates
 * against before confirming an order.
 */

const scope = (): string => db.session?.userId ?? GUEST_SCOPE

const cartBody = (items: CartItem[]): CartResponse => ({
  items,
  count: items.reduce((total, item) => total + item.quantity, 0),
})

const respondCart = () => HttpResponse.json(cartBody(db.cartFor(scope())))

const parseQuantity = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return null
  return value
}

export const cartHandlers = [
  http.get('/api/cart', respondCart),

  http.post('/api/cart/items', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { nftId?: unknown; quantity?: unknown } | null
    const nftId = typeof body?.nftId === 'string' ? body.nftId : ''
    const quantity = parseQuantity(body?.quantity)

    if (!nftId) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Informe o NFT.', { nftId: 'NFT obrigatório.' })
    }
    if (quantity === null) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Quantidade inválida.', {
        quantity: 'A quantidade deve ser um inteiro maior que zero.',
      })
    }

    const nft = db.nfts.find((candidate) => candidate.id === nftId)
    if (!nft) return notFound('NFT não encontrado.')

    const items = db.cartFor(scope()).map((item) => ({ ...item }))
    const existing = items.find((item) => item.nftId === nftId)
    const nextQuantity = (existing?.quantity ?? 0) + quantity

    if (nextQuantity > nft.available) {
      return errorEnvelope(
        409,
        'CONFLICT',
        nft.available === 0
          ? 'Esta edição está esgotada.'
          : `Apenas ${nft.available} unidade(s) disponível(eis) desta edição.`,
      )
    }

    if (existing) {
      existing.quantity = nextQuantity
    } else {
      items.push({ nftId, quantity })
    }

    db.setCartFor(scope(), items)
    return HttpResponse.json(cartBody(items))
  }),

  http.patch('/api/cart/items/:nftId', async ({ request, params }) => {
    const nftId = String(params.nftId ?? '')
    const body = (await request.json().catch(() => null)) as { quantity?: unknown } | null
    const quantity = parseQuantity(body?.quantity)
    if (quantity === null) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Quantidade inválida.', {
        quantity: 'A quantidade deve ser um inteiro maior que zero.',
      })
    }

    const nft = db.nfts.find((candidate) => candidate.id === nftId)
    if (!nft) return notFound('NFT não encontrado.')
    if (quantity > nft.available) {
      return errorEnvelope(
        409,
        'CONFLICT',
        `Apenas ${nft.available} unidade(s) disponível(eis) desta edição.`,
      )
    }

    const items = db.cartFor(scope()).map((item) =>
      item.nftId === nftId ? { ...item, quantity } : item,
    )
    db.setCartFor(scope(), items)
    return HttpResponse.json(cartBody(items))
  }),

  http.delete('/api/cart/items/:nftId', ({ params }) => {
    const nftId = String(params.nftId ?? '')
    const items = db.cartFor(scope()).filter((item) => item.nftId !== nftId)
    db.setCartFor(scope(), items)
    return HttpResponse.json(cartBody(items))
  }),
]
