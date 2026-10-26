import type { NftNetwork } from '@/features/nfts/api/contracts'
import { PROVIDER_NETWORKS, supportsNetwork } from '@/mocks/fixtures/wallets'

/**
 * Wallet contracts (docs/PLAN.md → Seções 8 e 11).
 *
 * A wallet is a *registered* address the collector can pay with; the checkout
 * only ever offers what `GET /api/wallets` returned for the signed-in user, and
 * the connection is simulated through the API (`POST /api/wallets/connect`) so
 * component state is never the source of truth for "this wallet works".
 *
 * The provider decides which networks can be used: refusing an unsupported
 * combination is a deterministic rule of the mock, not a UI guess.
 */
export const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
export { PROVIDER_NETWORKS, supportsNetwork }
export type { ProviderNetworks }

export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export type WalletProvider = (typeof WALLET_PROVIDERS)[number]

/**
 * Address rule shared by the form, the wallet handler and the order handler:
 * `0x` + 40 hexadecimal characters. One regex, one message, three layers.
 */

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

/** Registered wallet, exactly as the API answers it. */
export interface Wallet {
  id: string
  label: string
  provider: WalletProvider
  /** Full `0x…` address (the UI truncates it for display). */
  address: string
  network: NftNetwork
  /** Networks this wallet can sign for; the checkout enforces the union. */
  supportedNetworks: NftNetwork[]
  primary: boolean
}

export interface WalletsResponse {
  wallets: Wallet[]
}

/** Input accepted by `POST /api/wallets`. */
export interface CreateWalletInput {
  label: string
  address: string
  provider: WalletProvider
  network: NftNetwork
  primary: boolean
}
export type CreateWalletResponse = Wallet

/** Input accepted by `PUT /api/wallets/:walletId`. */
export interface UpdateWalletInput {
  walletId: string
  label?: string
  address?: string
  provider?: WalletProvider
  network?: NftNetwork
  primary?: boolean
}
export type UpdateWalletResponse = Wallet

/**
 * Connection request. A registered wallet is connected by id; the manual
 * ("usar outra carteira") path sends the address typed by the collector.
 * `walletId` wins when both are present.
 */
export interface ConnectWalletInput {
  walletId?: string | null
  address?: string
  provider: WalletProvider
  network: NftNetwork
}
export type WalletConnectionStatus = 'connected' | 'refused'

/**
 * Refusal is a business outcome, not an HTTP failure: it answers `200` with
 * `status: "refused"` and a reason the UI can show next to the control, the
 * same way a wallet extension reports "wrong network" without breaking the page.
 */
export interface WalletConnection {
  status: WalletConnectionStatus
  provider: WalletProvider
  address: string
  network: NftNetwork
  /** Human-readable reason, `null` when connected. */
  reason: string | null
}

/**
 * Networks each provider can sign for. Re-exported here so the form and the
 * handlers share one table; the fixture owns the source of truth so contract
 * and mock can never disagree.
 */
export type ProviderNetworks = typeof PROVIDER_NETWORKS


