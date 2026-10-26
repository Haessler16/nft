import type { NftNetwork } from '@/features/nfts/api/contracts'

/**
 * Carteiras do colecionista (docs/PLAN.md → Seções 8 e 11).
 *
 * Uma carteira é um endereço cadastrado que o pagamento pode usar; o
 * checkout só oferece o que `GET /api/wallets` devolveu para o usuário
 * autenticado. A conexão é simulada pela API (`POST /api/wallets/connect`),
 * nunca pelo estado local do componente, para que o formulário e os testes
 * exercitem exatamente a mesma resposta do servidor.
 *
 * O provedor define quais redes podem assinar a transação; recusar uma
 * combinação não suportada é regra determinística do mock, não palpite da UI.
 */
export const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export type WalletProvider = (typeof WALLET_PROVIDERS)[number]

export const PROVIDER_NETWORKS: Record<WalletProvider, readonly NftNetwork[]> = {
  metamask: ['Ethereum', 'Polygon'],
  coinbase: ['Ethereum', 'Solana'],
  walletconnect: ['Ethereum', 'Polygon', 'Solana'],
}

export const supportsNetwork = (
  provider: WalletProvider,
  network: NftNetwork,
): boolean => PROVIDER_NETWORKS[provider].includes(network)

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

/** Carteira cadastrada, exatamente no formato que a API devolve. */
export interface Wallet {
  id: string
  label: string
  provider: WalletProvider
  /** Endereço completo `0x…` (a UI truncada só para exibição). */
  address: string
  network: NftNetwork
  /** Redes que esta carteira pode assinar; o checkout usa a união. */
  supportedNetworks: NftNetwork[]
  primary: boolean
}

export interface WalletsResponse {
  wallets: Wallet[]
}

/** Payload aceito por `POST /api/wallets`. */
export interface CreateWalletInput {
  label: string
  address: string
  provider: WalletProvider
  network: NftNetwork
  primary: boolean
}
export type CreateWalletResponse = Wallet

/** Payload aceito por `PUT /api/wallets/:walletId`. */
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
 * Requisição de conexão. Uma carteira cadastrada se conecta por `walletId`;
 * o fluxo manual ("usar outra carteira") envia o endereço digitado pelo
 * colecionista. Quando ambos estão presentes, `walletId` prevalece.
 */
export interface ConnectWalletInput {
  walletId?: string | null
  address?: string
  provider: WalletProvider
  network: NftNetwork
}
export type WalletConnectionStatus = 'connected' | 'refused'

/**
 * Recusa é um desfecho de negócio, não um erro HTTP: a API responde `200`
 * com `status: "refused"` e um motivo que a UI mostra ao lado do controle,
 * igual ao jeito que um extension reporta "wrong network" sem quebrar a tela.
 */
export interface WalletConnection {
  status: WalletConnectionStatus
  provider: WalletProvider
  address: string
  network: NftNetwork
  /** Motivo legível, `null` quando conectada. */
  reason: string | null
}

/** Redes que cada provedor pode assinar. Reexportada aqui para formulário e handlers compartilharem uma única tabela. */
export type ProviderNetworks = typeof PROVIDER_NETWORKS
