/** Perfil del coleccionista (docs/PLAN.md → Seção 11). */
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
export const PASSWORD_RULE = {
  minLength: 8,
  message: 'A nova senha precisa ter ao menos 8 caracteres, com letras e números.',
} as const

export const PASSWORD_FIELD_ERRORS = {
  current: 'A senha atual está incorreta.',
  new: PASSWORD_RULE.message,
} as const

