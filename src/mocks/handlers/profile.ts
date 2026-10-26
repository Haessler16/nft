import { http, HttpResponse } from 'msw'

import { db } from '@/mocks/db'
import { EMAIL_PATTERN } from '@/features/auth/api/contracts'
import { PASSWORD_FIELD_ERRORS } from '@/features/profile/api/contracts'
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
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados do perfil inválidos.')
    }

    const body = raw as Record<string, unknown>
    const fields: Record<string, string> = {}

    let displayName: string | undefined
    if (body.displayName !== undefined) {
      displayName = String(body.displayName ?? '').trim()
      if (displayName.length < 2) {
        fields.displayName = 'Informe um nome de ao menos 2 caracteres.'
      } else if (displayName.length > 60) {
        fields.displayName = 'O nome pode ter no máx. 60 caracteres.'
      }
    }

    let email: string | undefined
    if (body.email !== undefined) {
      email = String(body.email ?? '').trim()
      if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    }

    let bio: string | undefined
    if (body.bio !== undefined) {
      bio = String(body.bio ?? '')
      if (bio.length > 500) {
        fields.bio = 'A biografia pode ter no máx. 500 caracteres.'
      }
    }

    // The e-mail is the login identity: another account cannot take it, or
    // `findUserByEmail` would become ambiguous.
    const emailOwner = email ? db.findUserByEmail(email) : undefined
    const conflict = Boolean(emailOwner && emailOwner.id !== userId)
    if (conflict) fields.email = 'E-mail já cadastrado.'

    if (Object.keys(fields).length > 0) {
      return errorEnvelope(
        conflict ? 409 : 422,
        conflict ? 'CONFLICT' : 'VALIDATION_ERROR',
        conflict ? 'Este e-mail já está cadastrado.' : 'Dados do perfil inválidos.',
        fields,
      )
    }

    const result = db.updateProfile(userId, {
      displayName,
      email,
      bio,
      avatarUrl:
        body.avatarUrl !== undefined
          ? body.avatarUrl === null
            ? null
            : String(body.avatarUrl)
          : undefined,
    })

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
      const currentWrong = result.error === 'CURRENT_WRONG'
      const message = currentWrong
        ? PASSWORD_FIELD_ERRORS.current
        : PASSWORD_FIELD_ERRORS.new
      return errorEnvelope(422, 'VALIDATION_ERROR', message, {
        [currentWrong ? 'currentPassword' : 'newPassword']: message,
      })
    }

    return HttpResponse.json({ ok: true })
  }),
]
