import { http, HttpResponse } from 'msw'

import type { NftNetwork } from '@/features/nfts/api/contracts'
import {
  WALLET_PROVIDER_LABELS,
  WALLET_PROVIDERS,
  type ConnectWalletInput,
  type Wallet,
  type WalletConnection,
} from '@/features/wallets/api/contracts'
import { db, type WalletFixture } from '@/mocks/db'
import { ADDRESS_PATTERN, supportsNetwork } from '@/mocks/fixtures/wallets'
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

export const walletHandlers = [
  http.get('/api/wallets', () => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    return HttpResponse.json({ wallets: db.walletsFor(userId).map(toWallet) })
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
    if (!isProvider(resolvedProvider)) fields.provider = 'Escolha o tipo de carteira.'
    if (!isNetwork(network)) fields.network = 'Escolha uma rede.'
    if (!address) fields.address = 'Informe o endereço da carteira.'
    else if (!ADDRESS_PATTERN.test(address)) {
      fields.address = 'Use um endereço 0x com 40 caracteres hexadecimais.'
    }
    if (Object.keys(fields).length > 0) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados da carteira inválidos.', fields)
    }

    // `fields` is non-empty above, so the narrowing below is safe.
    const safeProvider = resolvedProvider as WalletConnection['provider']
    const safeNetwork = network as NftNetwork

    // Deterministic refusal: the extension cannot sign for this chain.
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

    // The `flaky` scenario drops the extension handshake, like a blocked popup.
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
