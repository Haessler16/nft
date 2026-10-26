import { http, HttpResponse } from 'msw'

import type { NftNetwork } from '@/features/nfts/api/contracts'
import {
  WALLET_PROVIDER_LABELS,
  WALLET_PROVIDERS,
  PROVIDER_NETWORKS,
  type ConnectWalletInput,
  type Wallet,
  type WalletConnection,
  type CreateWalletInput,
  type UpdateWalletInput,
  supportsNetwork,
  ADDRESS_PATTERN,
} from '@/features/wallets/api/contracts'
import { db } from '@/mocks/db'
import type { WalletFixture } from '@/mocks/db'
import { errorEnvelope, notFound, unauthorized } from '@/mocks/handlers/envelope'

/**
 * Wallet handlers (docs/PLAN.md → Seções 8 e 11).
 *
 * `GET /wallets` is scoped to the session: a collector only ever sees their own
 * addresses. `POST /wallets/connect` simulates the wallet extension handshake,
 * including the refusal of a network the provider cannot sign for — the rule
 * lives here, not in the checkout component, so the demo and the tests exercise
 * the same API answer.
 */

const sessionUserId = (): string | null => db.session?.userId ?? null

/** Drops the owner (`userId`) from the response — the client never needs it. */
const toWallet = (wallet: WalletFixture): Wallet => ({
  id: wallet.id,
  label: wallet.label,
  provider: wallet.provider,
  address: wallet.address,
  network: wallet.network,
  supportedNetworks: wallet.supportedNetworks,
  primary: wallet.primary,
})

const isProvider = (value: unknown): value is ConnectWalletInput['provider'] =>
  typeof value === 'string' &&
  (WALLET_PROVIDERS as readonly string[]).includes(value)

const isNetwork = (value: unknown): value is NftNetwork =>
  value === 'Ethereum' || value === 'Polygon' || value === 'Solana'

const validateWalletInput = (
  input: Partial<CreateWalletInput | UpdateWalletInput>,
): Record<string, string> => {
  const fields: Record<string, string> = {}
  if (typeof input.label === 'string') {
    if (input.label.trim().length < 1) {
      fields.label = 'Escolha o tipo de carteira.'
    }
  } else {
    fields.label = 'Escolha o tipo de carteira.'
  }
  if (typeof input.address !== 'string' || input.address.trim().length === 0) {
    fields.address = 'Informe o endereço da carteira.'
  } else if (!ADDRESS_PATTERN.test(input.address.trim())) {
    fields.address = 'Use um endereço 0x com 40 caracteres hexadecimais.'
  }
  if (!isProvider(input.provider)) {
    fields.provider = 'Escolha o tipo de carteira.'
  }
  if (!isNetwork(input.network)) {
    fields.network = 'Escolha uma rede.'
  }
  if (typeof input.provider === 'string' && typeof input.network === 'string') {
    const providerNetworks = PROVIDER_NETWORKS[input.provider as ConnectWalletInput['provider']]
    if (providerNetworks && !providerNetworks.includes(input.network as NftNetwork)) {
      fields.network = 'Este provedor não dá suporte à rede escolhida.'
    }
  }
  return fields
}

export const walletHandlers = [
  http.get('/api/wallets', () => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    return HttpResponse.json({ wallets: db.walletsFor(userId).map(toWallet) })
  }),

  http.post('/api/wallets', async ({ request }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    const body = (await request.json().catch(() => null)) as
      | Partial<CreateWalletInput>
      | null

    const input = body ?? {}
    const fields = validateWalletInput(input)
    if (Object.keys(fields).length > 0) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados da carteira inválidos.', fields)
    }

    const wallet = db.createWallet({
      userId,
      label: input.label!.trim(),
      provider: input.provider as WalletFixture['provider'],
      address: input.address!.trim(),
      network: (input.network as WalletFixture['network']) ?? 'Ethereum',
      primary: input.primary ?? false,
    })

    return HttpResponse.json(toWallet(wallet), { status: 201 })
  }),

  http.put('/api/wallets/:walletId', async ({ params, request }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    const walletId = params.walletId as string
    const existing = db.findWallet(userId, walletId)
    if (!existing) return notFound('Carteira não encontrada.')

    const body = (await request.json().catch(() => null)) as
      | Partial<UpdateWalletInput>
      | null

    const input = body ?? {}
    const fields = validateWalletInput(input)
    if (Object.keys(fields).length > 0) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados da carteira inválidos.', fields)
    }

    const wallet = db.updateWallet(userId, walletId, {
      label: input.label?.trim() ?? existing.label,
      provider: (input.provider as WalletFixture['provider']) ?? existing.provider,
      address: input.address?.trim() ?? existing.address,
      network: (input.network as WalletFixture['network']) ?? existing.network,
      primary: input.primary ?? existing.primary,
    })

    if (!wallet) return notFound('Carteira não encontrada.')

    return HttpResponse.json(toWallet(wallet))
  }),

  http.delete('/api/wallets/:walletId', ({ params }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    const walletId = params.walletId as string
    const deleted = db.deleteWallet(userId, walletId)

    if (!deleted) {
      const existing = db.findWallet(userId, walletId)
      if (!existing) return notFound('Carteira não encontrada.')
      if (existing.primary) {
        return errorEnvelope(409, 'CONFLICT', 'Não é possível eliminar a carteira principal.')
      }
      return errorEnvelope(409, 'CONFLICT', 'Não é possível eliminar a carteira.')
    }

    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/wallets/connect', async ({ request }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    const body = (await request.json().catch(() => null)) as
      | Partial<ConnectWalletInput>
      | null

    const walletId = typeof body?.walletId === 'string' ? body.walletId : null
    const provider = body?.provider
    const network = body?.network

    const registered = walletId ? db.findWallet(userId, walletId) : undefined
    if (walletId && !registered) return notFound('Carteira não encontrada.')

    const resolvedProvider = registered?.provider ?? provider
    const address = registered?.address ?? (typeof body?.address === 'string' ? body.address.trim() : '')

    const fields: Record<string, string> = {}
    if (!isProvider(resolvedProvider)) {
      fields.provider = 'Escolha o tipo de carteira.'
    }
    if (!isNetwork(network)) {
      fields.network = 'Escolha uma rede.'
    }
    if (!address) {
      fields.address = 'Informe o endereço da carteira.'
    } else if (!ADDRESS_PATTERN.test(address)) {
      fields.address = 'Use um endereço 0x com 40 caracteres hexadecimais.'
    }
    if (Object.keys(fields).length > 0) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados da carteira inválidos.', fields)
    }

    const safeProvider = resolvedProvider as WalletConnection['provider']
    const safeNetwork = network as NftNetwork

    if (!supportsNetwork(safeProvider, safeNetwork)) {
      const refused: WalletConnection = {
        status: 'refused',
        provider: safeProvider,
        address,
        network: safeNetwork,
        reason: `${WALLET_PROVIDER_LABELS[safeProvider]} não assina na rede ${safeNetwork}. Escolha outra rede ou outra carteira.`,
      }
      return HttpResponse.json(refused)
    }

    if (db.scenario === 'flaky') {
      return errorEnvelope(
        503,
        'UNAVAILABLE',
        'A carteira não respondeu. Verifique a extensão e tente de novo.',
      )
    }

    const connected: WalletConnection = {
      status: 'connected',
      provider: safeProvider,
      address,
      network: safeNetwork,
      reason: null,
    }
    return HttpResponse.json(connected)
  }),
]
