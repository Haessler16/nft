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

/** Lista as carteiras cadastradas do usuário autenticado. */
export const fetchWallets = async (signal?: AbortSignal): Promise<WalletsResponse> => {
  const { data } = await http.get<WalletsResponse>('/wallets', { signal })
  return data
}

/**
 * Simula a conexão com a extensão de carteira (docs/PLAN.md → Seção 8).
 *
 * Uma recusa é `200` com `status: "refused"` (o contrato modela um extension
 * que responde "rede errada"), então não é erro aqui: o checkout mostra o
 * motivo ao lado dos controles de carteira e mantém o formulário reversível.
 */
export const connectWallet = async (
  input: ConnectWalletInput,
): Promise<WalletConnection> => {
  const { data } = await http.post<WalletConnection>('/wallets/connect', input)
  return data
}

/** Cadastra uma nova carteira para o usuário autenticado. */
export const createWallet = async (
  input: CreateWalletInput,
  signal?: AbortSignal,
): Promise<CreateWalletResponse> => {
  const { data } = await http.post<CreateWalletResponse>('/wallets', input, { signal })
  return data
}

/** Edita uma carteira existente pelo id. */
export const updateWallet = async (
  input: UpdateWalletInput,
  signal?: AbortSignal,
): Promise<UpdateWalletResponse> => {
  const { walletId, ...body } = input
  const { data } = await http.put<UpdateWalletResponse>(`/wallets/${walletId}`, body, { signal })
  return data
}

/** Remove uma carteira secundária. A principal não pode ser removida. */
export const deleteWallet = async (
  walletId: string,
  signal?: AbortSignal,
): Promise<{ ok: true }> => {
  const { data } = await http.delete<{ ok: true }>(`/wallets/${walletId}`, { signal })
  return data
}
