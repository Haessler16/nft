/**
 * Session and account contracts shared by the MSW handlers, the Axios
 * endpoints and the UI (docs/PLAN.md → Seção 4).
 *
 * The session is the only source of "who is signed in": the UI reads it through
 * `GET /session`, never from `localStorage`.
 */

/**
 * Shared client/server rule for new passwords: at least 8 characters with a
 * letter and a digit. Lives with the contract so the form schema and the mocked
 * API validate exactly the same thing.
 */
export const PASSWORD_RULE = {
  minLength: 8,
  message: 'A senha precisa ter ao menos 8 caracteres, com letras e números.',
} as const

export const isStrongPassword = (password: string): boolean =>
  password.length >= PASSWORD_RULE.minLength &&
  /[a-zA-Z]/.test(password) &&
  /\d/.test(password)

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface SessionUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export interface SessionResponse {
  user: SessionUser
}

export interface LoginInput {
  email: string
  password: string
}

/**
 * Registration payload. The API validates the strength rules server-side and
 * answers 409 when the e-mail already exists, so the form can never assume the
 * account is new before the response arrives.
 */
export interface RegisterInput {
  name: string
  email: string
  password: string
}
