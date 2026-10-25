import type {
  ConnectWalletInput,
  WalletConnection,
  WalletsResponse,
} from '@/features/wallets/api/contracts'
import { http } from '@/lib/api/client'

/**
 * Wallet endpoints (docs/PLAN.md → Seções 8 e 11).
 *
 * `connect` goes through the API instead of being solved in the component: the
 * service worker simulates the extension handshake, including the refusal of a
 * network the provider cannot sign for, so the UI only renders the answer.
 */

export const fetchWallets = async (signal?: AbortSignal): Promise<WalletsResponse> => {
  const { data } = await http.get<WalletsResponse>('/wallets', { signal })
  return data
}

export const connectWallet = async (
  input: ConnectWalletInput,
): Promise<WalletConnection> => {
  const { data } = await http.post<WalletConnection>('/wallets/connect', input)
  return data
}
