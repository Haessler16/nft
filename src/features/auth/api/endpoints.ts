import type { LoginInput, RegisterInput, SessionResponse } from '@/features/auth/api/contracts'
import { http } from '@/lib/api/client'

/**
 * Auth endpoints — the only place in the feature that knows about HTTP.
 *
 * `fetchSession` rejects with `UNAUTHORIZED` for visitors; hooks translate that
 * into "signed out" so a guest session is not rendered as an error state.
 */
export const fetchSession = async (signal?: AbortSignal): Promise<SessionResponse> => {
  const { data } = await http.get<SessionResponse>('/session', { signal })
  return data
}

export const login = async (input: LoginInput): Promise<SessionResponse> => {
  const { data } = await http.post<SessionResponse>('/auth/login', input)
  return data
}

/** Creates the account and starts the session in the same response. */
export const register = async (input: RegisterInput): Promise<SessionResponse> => {
  const { data } = await http.post<SessionResponse>('/auth/register', input)
  return data
}

export const logout = async (): Promise<void> => {
  await http.post('/auth/logout')
}
