/** Perfil do colecionista (docs/PLAN.md → Seção 11).

 * Contratos compartilhados pela camada MSW, pelos endpoints Axios e pelos
 * componentes do painel de conta. O mesmo tipo atravessa a requisição sem
 * `any`, inclusive no campo `avatarUrl`, que é `null` quando não há imagem.
 */
export interface Profile {
  displayName: string
  email: string
  bio: string
  avatarUrl: string | null
}

export interface ProfileResponse extends Profile {}

export interface UpdateProfileInput {
  displayName?: string
  email?: string
  bio?: string
  avatarUrl?: string | null
}

export interface UpdateProfileResponse extends Profile {}

/** Regra de senha compartilhada pelo schema do formulário e pelo mock. */
export const PASSWORD_RULE = {
  minLength: 8,
  message: 'A nova senha precisa ter ao menos 8 caracteres, com letras e números.',
} as const

/** Mensagens de erro de campo usadas pelo formulário e pelo handler de senha. */
export const PASSWORD_FIELD_ERRORS = {
  current: 'A senha atual está incorreta.',
  new: PASSWORD_RULE.message,
} as const
