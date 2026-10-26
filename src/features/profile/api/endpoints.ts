import type {
  UpdateProfileInput,
  UpdateProfileResponse,
} from '@/features/profile/api/contracts'
import { http } from '@/lib/api/client'

/** Lê o perfil do usuário autenticado (nome, e-mail, bio, avatar). */
export const fetchProfile = async (signal?: AbortSignal): Promise<UpdateProfileResponse> => {
  const { data } = await http.get<UpdateProfileResponse>('/profile', { signal })
  return data
}

/** Atualiza os campos informados do perfil do usuário autenticado. */
export const updateProfile = async (
  input: UpdateProfileInput,
  signal?: AbortSignal,
): Promise<UpdateProfileResponse> => {
  const { data } = await http.put<UpdateProfileResponse>('/profile', input, { signal })
  return data
}

/**
 * Altera a senha com reautenticação (docs/PLAN.md → Seção 11).
 *
 * Retorna o contrato de erro quando a senha atual está errada ou a nova é
 * fraca; o formulário trata isso como feedback de campo, não como falha de API.
 */
export type ChangePasswordError =
  | { error: 'CURRENT_WRONG' }
  | { error: 'NEW_WEAK' }

export type ChangePasswordResult =
  | { ok: true }
  | ChangePasswordError

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  signal?: AbortSignal,
): Promise<ChangePasswordResult> => {
  const { data } = await http.post<ChangePasswordResult>(
    '/profile/password',
    { currentPassword, newPassword },
    { signal },
  )
  if ('ok' in data) return data
  return data
}

/** Validação leve usada pelo formulário para diferenciar erro de API de contrato. */
export const isApiError = (value: unknown): value is { code: string; message: string } =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  typeof (value as { message?: unknown }).message === 'string'

/** Mensagens de erro de campo vinculadas ao formulário de senha. */
export const PASSWORD_FIELD_ERRORS = {
  current: 'A senha atual está incorreta.',
  new: 'A nova senha não atende aos requisitos.',
} as const
