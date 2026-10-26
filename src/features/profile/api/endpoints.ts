import type {
  UpdateProfileInput,
  UpdateProfileResponse,
} from '@/features/profile/api/contracts'
import { http } from '@/lib/api/client'

export const fetchProfile = async (signal?: AbortSignal): Promise<UpdateProfileResponse> => {
  const { data } = await http.get<UpdateProfileResponse>('/profile', { signal })
  return data
}
export const updateProfile = async (
  input: UpdateProfileInput,
  signal?: AbortSignal,
): Promise<UpdateProfileResponse> => {
  const { data } = await http.put<UpdateProfileResponse>('/profile', input, { signal })
  return data
}
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
  throw data
}

export const isApiError = (value: unknown): value is { code: string; message: string } =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  typeof (value as { message?: unknown }).message === 'string'

export const PASSWORD_FIELD_ERRORS = {
  current: 'A senha atual está incorreta.',
  new: 'A nova senha não atende aos requisitos.',
} as const

