import { z } from 'zod'

import { EMAIL_PATTERN } from '@/features/auth/api/contracts'
import { NFT_NETWORKS } from '@/features/nfts/api/contracts'
import {
  ADDRESS_PATTERN,
  WALLET_PROVIDERS,
} from '@/features/wallets/api/contracts'

/**
 * Checkout form rules (docs/PLAN.md → Seção 8).
 *
 * The client rules mirror the mocked API's, so the user gets instant feedback
 * and the server is still the judge. Field names are the form's own; the API
 * answers in Portuguese and `API_FIELD_ALIAS` maps those messages back onto the
 * inputs (same pattern as login/register).
 *
 * The profile fields follow the "Perfil do colecionador" frame. `referralCode`
 * and `ensName` are optional here (the frame marks them required) so nobody is
 * blocked from buying for not having an invite code — documented as a deviation
 * in ARCHITECTURE.md.
 */
export const checkoutSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  username: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9._-]{3,32}$/i,
      'Use de 3 a 32 caracteres: letras, números, ponto, hífen ou _.',
    ),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  network: z.enum(NFT_NETWORKS),
  walletAddress: z
    .string()
    .trim()
    .regex(ADDRESS_PATTERN, 'Use um endereço 0x com 40 caracteres hexadecimais.'),
  secondaryWallet: z
    .string()
    .trim()
    .max(120, 'Máximo de 120 caracteres.')
    .optional(),
  walletProvider: z.enum(WALLET_PROVIDERS),
  referralCode: z.string().trim().max(32, 'Máximo de 32 caracteres.').optional(),
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .regex(EMAIL_PATTERN, 'Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .max(40, 'Máximo de 40 caracteres.')
    .regex(/^[a-z0-9-]*$/i, 'Use apenas letras, números e hífen.')
    .optional(),
  note: z.string().trim().max(280, 'Máximo de 280 caracteres.').optional(),
  /** Checkout-local flag: pay with a typed address instead of a registered wallet. */
  useCustomWallet: z.boolean(),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>

/** API field names → form fields. */
export const API_FIELD_ALIAS: Partial<Record<string, keyof CheckoutValues>> = {
  nomeExibicao: 'displayName',
  usuario: 'username',
  perfil: 'profileName',
  rede: 'network',
  endereco: 'walletAddress',
  carteiraSecundaria: 'secondaryWallet',
  tipoCarteira: 'walletProvider',
  indicacao: 'referralCode',
  email: 'email',
  ens: 'ensName',
  observacao: 'note',
}
