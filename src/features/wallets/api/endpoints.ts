import type {
  ConnectWalletInput,
  WalletConnection,
  WalletsResponse,
  CreateWalletInput,
  CreateWalletResponse,
  UpdateWalletInput,
  UpdateWalletResponse,
} from '@/features/wallets/api/contracts'
import { http } from '@/lib/api/client'

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

export const createWallet = async (
  input: CreateWalletInput,
  signal?: AbortSignal,
): Promise<CreateWalletResponse> => {
  const { data } = await http.post<CreateWalletResponse>('/wallets', input, { signal })
  return data
}

export const updateWallet = async (
  input: UpdateWalletInput,
  signal?: AbortSignal,
): Promise<UpdateWalletResponse> => {
  const { walletId, ...body } = input
  const { data } = await http.put<UpdateWalletResponse>(`/wallets/${walletId}`, body, { signal })
  return data
}

export const deleteWallet = async (
  walletId: string,
  signal?: AbortSignal,
): Promise<{ ok: true }> => {
  const { data } = await http.delete<{ ok: true }>(`/wallets/${walletId}`, { signal })
  return data
}
