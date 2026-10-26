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
 * Falhas de negócio (`CURRENT_WRONG`, `NEW_WEAK`) chegam como `ApiError` com o
 * campo culpado em `fields`, o mesmo envelope de validação do resto da API; o
 * formulário transforma isso em erro de campo.
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  signal?: AbortSignal,
): Promise<{ ok: true }> => {
  const { data } = await http.post<{ ok: true }>(
    '/profile/password',
    { currentPassword, newPassword },
    { signal },
  )
  return data
}
