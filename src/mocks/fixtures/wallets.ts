import type { NftNetwork } from '@/features/nfts/api/contracts'
import type { Wallet } from '@/features/wallets/api/contracts'

/**
 * Wallet fixtures (docs/PLAN.md → Seções 8 e 11).
 *
 * Each demo account starts with one registered wallet and one secondary, so the
 * checkout can exercise selection, network compatibility and the "usar outra
 * carteira" path without any setup. Addresses are fictional but well-formed
 * (`0x` + 40 hex), which is what the form and the handler validate.
 *
 * `PROVIDER_NETWORKS` is the deterministic support table: MetaMask signs for
 * the EVM networks, Coinbase Wallet for Ethereum + Solana and WalletConnect for
 * all three. Choosing Solana with MetaMask is how the refusal scenario is
 * reproduced by hand.
 */
export interface WalletFixture extends Wallet {
  userId: string
}

export const PROVIDER_NETWORKS: Record<Wallet['provider'], readonly NftNetwork[]> = {
  metamask: ['Ethereum', 'Polygon'],
  coinbase: ['Ethereum', 'Solana'],
  walletconnect: ['Ethereum', 'Polygon', 'Solana'],
}
export const supportsNetwork = (
  provider: Wallet['provider'],
  network: NftNetwork,
): boolean => PROVIDER_NETWORKS[provider].includes(network)


export const WALLETS: readonly WalletFixture[] = [
  {
    id: 'wal_ava_primary',
    userId: 'user_ava',
    label: 'Carteira principal',
    provider: 'metamask',
    address: '0x8d1c748a2f4c9b1e5d6a7c8b9d0e1f2a3b4c5d6e',
    network: 'Ethereum',
    supportedNetworks: ['Ethereum', 'Polygon'],
    primary: true,
  },
  {
    id: 'wal_ava_secondary',
    userId: 'user_ava',
    label: 'Coleção paralela',
    provider: 'coinbase',
    address: '0x2b7f4e1d9c8a6b5d4e3f2a1b0c9d8e7f6a5b4c3d',
    network: 'Ethereum',
    supportedNetworks: ['Ethereum', 'Solana'],
    primary: false,
  },
  {
    id: 'wal_noah_primary',
    userId: 'user_noah',
    label: 'Carteira principal',
    provider: 'walletconnect',
    address: '0x5c3e9b7d1f2a4c6e8b0d3f5a7c9e1b2d4f6a8c0e',
    network: 'Polygon',
    supportedNetworks: ['Ethereum', 'Polygon', 'Solana'],
    primary: true,
  },
  {
    id: 'wal_noah_secondary',
    userId: 'user_noah',
    label: 'Estúdio',
    provider: 'metamask',
    address: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    network: 'Ethereum',
    supportedNetworks: ['Ethereum', 'Polygon'],
    primary: false,
  },
]
