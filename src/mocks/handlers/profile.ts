import { http, HttpResponse } from 'msw'

import { db } from '@/mocks/db'
import {
  PASSWORD_FIELD_ERRORS,
} from '@/features/profile/api/endpoints'
import { errorEnvelope, unauthorized } from '@/mocks/handlers/envelope'

const sessionUserId = (): string | null => db.session?.userId ?? null

export const profileHandlers = [
  http.get('/api/profile', () => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    const profile = db.getProfile(userId)
    if (!profile) return errorEnvelope(404, 'NOT_FOUND', 'Perfil não encontrado.')

    return HttpResponse.json(profile)
  }),

  http.put('/api/profile', async ({ request }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    const raw = await request.json().catch(() => null)

    if (!raw || typeof raw !== 'object' || raw === null) {
      return errorEnvelope(
        422,
        'VALIDATION_ERROR',
        'Dados do perfil inválidos.',
      )
    }

    const body = raw as Record<string, unknown>
    const result = db.updateProfile(
      userId,
      {
        displayName: body.displayName !== undefined ? String(body.displayName ?? '') : undefined,
        email: body.email !== undefined ? String(body.email ?? '') : undefined,
        bio: body.bio !== undefined ? String(body.bio ?? '') : undefined,
        avatarUrl:
          body.avatarUrl !== undefined
            ? body.avatarUrl === null
              ? null
              : String(body.avatarUrl)
            : undefined,
      },
    )

    if (!result) {
      return errorEnvelope(404, 'NOT_FOUND', 'Perfil não encontrado.')
    }

    return HttpResponse.json(result)
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const userId = sessionUserId()
    if (!userId) return unauthorized()

    const body = (await request.json().catch(() => null)) as
      | { currentPassword?: unknown; newPassword?: unknown }
      | null

    if (!body) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados da senha inválidos.')
    }

    const currentPassword = String(body.currentPassword ?? '')
    const newPassword = String(body.newPassword ?? '')

    if (!currentPassword) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Senha atual inválida.', {
        currentPassword: PASSWORD_FIELD_ERRORS.current,
      })
    }

    if (!newPassword) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Nova senha inválida.', {
        newPassword: PASSWORD_FIELD_ERRORS.new,
      })
    }

    const result = db.changePassword(userId, currentPassword, newPassword)

    if (!('ok' in result)) {
      return HttpResponse.json(result, { status: 422 })
    }

    return HttpResponse.json({ ok: true })
  }),
]
