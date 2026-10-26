import { http, HttpResponse } from 'msw'

import type { CartEntry } from '@/features/cart/api/contracts'
import { EMAIL_PATTERN } from '@/features/auth/api/contracts'
import type { NftNetwork } from '@/features/nfts/api/contracts'
import type {
  CreateOrderInput,
  Order,
  OrderCustomer,
  OrdersListResponse,
} from '@/features/orders/api/contracts'
import {
  WALLET_PROVIDERS,
  type WalletProvider,
} from '@/features/wallets/api/contracts'
import { db, type StoredOrder } from '@/mocks/db'
import { ADDRESS_PATTERN, supportsNetwork } from '@/features/wallets/api/contracts'
import { normalizeCoupon } from '@/mocks/fixtures/coupons'
import {
  errorEnvelope,
  notFound,
  unauthorized,
} from '@/mocks/handlers/envelope'
import { priceItems, sameAmount } from '@/mocks/pricing'
import {
  scheduleOrderSettlement,
  settleOrdersAndEmit,
} from '@/mocks/realtime'

/**
 * Order handlers (docs/PLAN.md → Seções 8 e 9).
 *
 * `POST /api/orders` is the only endpoint that can move money, so it is also
 * the strictest one:
 *
 * 1. **Idempotency first.** The `Idempotency-Key` header identifies the
 *    attempt. The same key with the same content answers the existing order
 *    (retry after a timeout, repeated click, reload mid-send); the same key with
 *    different content answers `409` — never a second order.
 * 2. **Server-side revalidation.** The body carries the reviewed snapshot; the
 *    handler re-prices it with the same routine as `GET /api/quote`, rejects an
 *    unavailable edition and compares `expectedTotal` with the fresh total.
 *    A mismatch answers `409` with `fields.cotacao`, which is what forces the
 *    checkout to ask for a new confirmation.
 * 3. **Snapshot.** Prices, names, fees, coupon and customer data are copied
 *    into the order, so later catalog changes cannot rewrite a receipt.
 * 4. **Settlement.** The order starts `pending` and settles after
 *    `ORDER_SETTLE_MS` — confirmed, or declined under `payment-declined`.
 *    `order-timeout` creates the order and then loses the response (`504`),
 *    which is exactly the failure the idempotency key recovers.
 */

export const ORDER_SETTLE_MS = 900

const sessionUserId = (): string | null => db.session?.userId ?? null

const isNetwork = (value: unknown): value is NftNetwork =>
  value === 'Ethereum' || value === 'Polygon' || value === 'Solana'

const isProvider = (value: unknown): value is WalletProvider =>
  typeof value === 'string' &&
  (WALLET_PROVIDERS as readonly string[]).includes(value)

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

/** Strips the bookkeeping only the server needs. */
const publicOrder = (order: StoredOrder): Order => ({
  id: order.id,
  status: order.status,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  customer: order.customer,
  wallet: order.wallet,
  lines: order.lines,
  totals: order.totals,
  transaction: order.transaction,
  failureReason: order.failureReason,
})

interface ParsedCustomer {
  customer: OrderCustomer
  fields: Record<string, string>
}

/**
 * Validates the collector form with the same rules the client uses, returning
 * messages keyed by the **form field names** so the checkout maps them straight
 * onto the inputs (`fields.nomeExibicao`, `fields.email`, …).
 */
const parseCustomer = (raw: unknown): ParsedCustomer => {
  const value = (raw ?? {}) as Partial<Record<keyof OrderCustomer, unknown>>
  const displayName = asText(value.displayName)
  const username = asText(value.username)
  const profileName = asText(value.profileName)
  const email = asText(value.email)
  const network = value.network
  const walletAddress = asText(value.walletAddress)
  const walletProvider = value.walletProvider
  const secondaryWallet = asText(value.secondaryWallet)
  const referralCode = asText(value.referralCode)
  const ensName = asText(value.ensName)
  const note = asText(value.note)

  const fields: Record<string, string> = {}
  if (displayName.length < 2) fields.nomeExibicao = 'Informe o nome de exibição.'
  if (!/^[a-z0-9._-]{3,32}$/i.test(username)) {
    fields.usuario = 'Use de 3 a 32 caracteres: letras, números, ponto, hífen ou _.'
  }
  if (profileName.length < 2) fields.perfil = 'Informe o nome do perfil.'
  if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
  if (!isNetwork(network)) fields.rede = 'Escolha uma rede.'
  if (!ADDRESS_PATTERN.test(walletAddress)) {
    fields.endereco = 'Use um endereço 0x com 40 caracteres hexadecimais.'
  }
  if (!isProvider(walletProvider)) fields.tipoCarteira = 'Escolha o tipo de carteira.'
  if (secondaryWallet.length > 120) fields.carteiraSecundaria = 'Máximo de 120 caracteres.'
  if (referralCode.length > 32) fields.indicacao = 'Máximo de 32 caracteres.'
  // The form sends the full `nome.eth` (the suffix is fixed in the UI).
  if (ensName && !/^[a-z0-9-]{2,}(\.eth)?$/i.test(ensName)) {
    fields.ens = 'Use apenas letras, números e hífen (com .eth opcional).'
  }
  if (note.length > 280) fields.observacao = 'Máximo de 280 caracteres.'

  return {
    fields,
    customer: {
      displayName,
      username,
      profileName,
      email,
      network: isNetwork(network) ? network : 'Ethereum',
      walletAddress,
      secondaryWallet: secondaryWallet || null,
      walletProvider: isProvider(walletProvider) ? walletProvider : 'metamask',
      referralCode: referralCode || null,
      ensName: ensName || null,
      note: note || null,
    },
  }
}

/** Canonical digest of what the client asked to buy (stable across retries). */
const requestHash = (body: Record<string, unknown>): string => {
  const items = Array.isArray(body.items) ? body.items : []
  const serializedItems = items
    .map((item) => {
      const entry = (item ?? {}) as { nftId?: unknown; quantity?: unknown }
      return `${asText(entry.nftId)}x${String(entry.quantity ?? '')}`
    })
    .sort()
  return JSON.stringify({
    items: serializedItems,
    coupon: normalizeCoupon(asText(body.coupon)),
    expectedTotal: asText(body.expectedTotal),
    customer: body.customer ?? null,
    wallet: body.wallet ?? null,
  })
}

const parseItems = (raw: unknown): CartEntry[] | null => {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return null
  const items: CartEntry[] = []
  for (const entry of raw) {
    const item = (entry ?? {}) as { nftId?: unknown; quantity?: unknown }
    const nftId = asText(item.nftId)
    const quantity = item.quantity
    if (!nftId) return null
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      return null
    }
    items.push({ nftId, quantity })
  }
  return items
}

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()
    if (db.scenario === 'session-expired') {
      db.signOut()
      return errorEnvelope(401, 'UNAUTHORIZED', 'Sessão expirada. Entre novamente para concluir o pedido.')
    }

    const body = (await request.json().catch(() => null)) as
      | (Partial<CreateOrderInput> & Record<string, unknown>)
      | null
    if (!body) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Pedido inválido.')
    }

    const idempotencyKey =
      request.headers.get('Idempotency-Key') ?? asText(body.idempotencyKey)
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return errorEnvelope(
        422,
        'VALIDATION_ERROR',
        'Chave de idempotência inválida.',
        { idempotencyKey: 'Envie uma chave entre 8 e 128 caracteres.' },
      )
    }

    const hash = requestHash(body as Record<string, unknown>)

    // 1. The key decides: same content → the same order, other content → 409.
    const existing = db.findOrderByIdempotencyKey(userId, idempotencyKey)
    if (existing) {
      if (existing.requestHash !== hash) {
        return errorEnvelope(
          409,
          'CONFLICT',
          'Esta chave de idempotência já foi usada com outro conteúdo.',
          { idempotencyKey: 'Gere um novo pedido para este conteúdo.' },
        )
      }
      settleOrdersAndEmit()
      const settled = db.findOrder(userId, existing.id) ?? existing
      return HttpResponse.json(publicOrder(settled))
    }

    // 2. Contents the server can price.
    const items = parseItems(body.items)
    if (!items) {
      return errorEnvelope(
        422,
        'VALIDATION_ERROR',
        'Itens do pedido inválidos.',
        { items: 'Informe ao menos um item com quantidade inteira.' },
      )
    }

    const { customer, fields } = parseCustomer(body.customer)
    if (Object.keys(fields).length > 0) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Revise os dados do pedido.', fields)
    }

    // 3. Wallet: a registered one must belong to this user; a manual one must
    //    be well-formed. Either way the provider must sign for the network.
    const walletInput = (body.wallet ?? {}) as Partial<CreateOrderInput['wallet']>
    const walletId = asText(walletInput.id) || null
    const registered = walletId ? db.findWallet(userId, walletId) : undefined
    if (walletId && !registered) return notFound('Carteira não encontrada.')

    const provider = registered?.provider ?? walletInput.provider
    if (!isProvider(provider)) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Tipo de carteira inválido.', {
        tipoCarteira: 'Escolha o tipo de carteira.',
      })
    }
    const address = registered?.address ?? asText(walletInput.address)
    if (!ADDRESS_PATTERN.test(address)) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Endereço de carteira inválido.', {
        endereco: 'Use um endereço 0x com 40 caracteres hexadecimais.',
      })
    }
    if (!supportsNetwork(provider, customer.network)) {
      return errorEnvelope(
        409,
        'CONFLICT',
        'A carteira selecionada não assina na rede escolhida.',
        { rede: 'Escolha outra rede ou outra carteira.' },
      )
    }

    // 4. Revalidation: the exact same pricing routine as the quote.
    const coupon = asText(body.coupon) || null
    const priced = priceItems(items, coupon)
    if (!priced.ok) {
      const { status, code, message, fields: errorFields } = priced.error
      return errorEnvelope(status, code, message, errorFields)
    }
    const quote = priced.quote

    if (quote.alerts.includes('availability-changed')) {
      return errorEnvelope(
        409,
        'CONFLICT',
        'Uma das edições deixou de estar disponível na quantidade pedida.',
        { itens: 'Ajuste as quantidades no carrinho para continuar.' },
      )
    }

    const expectedTotal = asText(body.expectedTotal)
    if (expectedTotal && !sameAmount(expectedTotal, quote.total)) {
      return errorEnvelope(
        409,
        'CONFLICT',
        'Os valores do pedido mudaram desde a revisão.',
        { cotacao: `Novo total: ${quote.total} ETH. Confirme novamente para seguir.` },
      )
    }

    // 5. Snapshot: everything the receipt shows is frozen here.
    const now = Date.now()
    const orderId = db.nextOrderId()
    const stored: StoredOrder = {
      id: orderId,
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      customer,
      wallet: {
        id: registered?.id ?? null,
        label: registered?.label ?? 'Carteira informada',
        provider,
        address,
        network: customer.network,
      },
      lines: quote.lines.map((line) => {
        const nft = db.nfts.find((candidate) => candidate.id === line.nftId)
        return {
          nftId: line.nftId,
          name: nft?.name ?? 'Peça fora do catálogo',
          imageUrl: nft?.imageUrl ?? '',
          edition: nft?.edition ?? { number: 0, of: 0 },
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        }
      }),
      totals: {
        subtotal: quote.subtotal,
        discount: quote.discount,
        networkFee: quote.networkFee,
        total: quote.total,
        coupon: quote.coupon ? { code: quote.coupon.code, percent: quote.coupon.percent } : null,
      },
      transaction: null,
      failureReason: null,
      userId,
      idempotencyKey,
      requestHash: hash,
      settleAt: new Date(now + ORDER_SETTLE_MS).toISOString(),
    }
    db.createOrder(stored)

    // The payment settles on its own clock: the event must fire even if
    // nobody ever fetches this order again (Seção 10).
    scheduleOrderSettlement(stored)

    // The payment happened (or may have): the answer is what got lost.
    if (db.scenario === 'order-timeout') {
      return errorEnvelope(
        504,
        'UNAVAILABLE',
        'A resposta do pedido expirou no caminho. A chave de idempotência permite recuperar o mesmo pedido.',
      )
    }

    return HttpResponse.json(publicOrder(stored), { status: 201 })
  }),

  /**
   * Order history (Seção 9): the session's own orders, newest first. Another
   * collector never sees them — the answer is scoped by the session user.
   */
  http.get('/api/orders', () => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()
    settleOrdersAndEmit()
    const orders = db
      .ordersFor(userId)
      .map(publicOrder)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json<OrdersListResponse>({ orders })
  }),

  /** Recovery lookup: the same key + user always resolves the same order. */
  http.get('/api/orders/by-key/:idempotencyKey', ({ params }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()
    settleOrdersAndEmit()
    const order = db.findOrderByIdempotencyKey(
      userId,
      String(params.idempotencyKey ?? ''),
    )
    if (!order) return notFound('Nenhum pedido para esta chave.')
    return HttpResponse.json(publicOrder(order))
  }),

  http.get('/api/orders/:orderId', ({ params }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()
    settleOrdersAndEmit()
    const order = db.findOrder(userId, String(params.orderId ?? ''))
    // Another collector's order answers 404, not 403: its existence is private.
    if (!order) return notFound('Pedido não encontrado.')
    return HttpResponse.json(publicOrder(order))
  }),
]
