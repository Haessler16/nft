import { useMutation } from '@tanstack/react-query'

import { connectWallet } from '@/features/wallets/api/endpoints'

/**
 * Wallet connection simulation (docs/PLAN.md → Seção 8).
 *
 * A refusal is a `200` with `status: "refused"` (the contract models an
 * extension answering "wrong network"), so it is *not* an error here: the
 * checkout renders the reason next to the wallet controls and keeps the rest of
 * the form usable.
 */
export const useConnectWallet = () =>
  useMutation({ mutationFn: connectWallet })
