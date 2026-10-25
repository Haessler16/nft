import { http, HttpResponse } from 'msw'

import type {
  LoginInput,
  RegisterInput,
  SessionResponse,
} from '@/features/auth/api/contracts'
import {
  EMAIL_PATTERN,
  isStrongPassword,
  PASSWORD_RULE,
} from '@/features/auth/api/contracts'
import { db, GUEST_SCOPE } from '@/mocks/db'
import { hashPassword, toSessionUser } from '@/mocks/fixtures/users'
import { errorEnvelope } from '@/mocks/handlers/envelope'

/**
 * Session handlers (docs/PLAN.md → Seção 4, slice needed by Seção 6).
 *
 * - `GET /session` answers 401 for visitors, which the client treats as
 *   "signed out" rather than as a failure;
 * - login validates before touching the session and returns the same error
 *   envelope as the rest of the API;
 * - registration reuses those rules and answers 409 with the field that
 *   conflicts, so the form can point at the e-mail input;
 * - the visitor cart is merged into the account on login (quantities are capped
 *   by availability) so nothing the visitor added is lost.
 */

/** Deterministic merge: same NFT sums quantities, capped by availability. */
const mergeGuestCart = (userId: string): void => {
  const guestItems = db.cartFor(GUEST_SCOPE)
  if (guestItems.length === 0) return

  const merged = db.cartFor(userId).map((item) => ({ ...item }))
  for (const guestItem of guestItems) {
    const nft = db.nfts.find((candidate) => candidate.id === guestItem.nftId)
    if (!nft) continue

    const existing = merged.find((item) => item.nftId === guestItem.nftId)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + guestItem.quantity, nft.available)
    } else {
      merged.push({ nftId: guestItem.nftId, quantity: Math.min(guestItem.quantity, nft.available) })
    }
  }

  db.setCartFor(userId, merged.filter((item) => item.quantity > 0))
  db.setCartFor(GUEST_SCOPE, [])
}

export const sessionHandlers = [
  http.get('/api/session', () => {
    const session = db.session
    if (!session) {
      return errorEnvelope(401, 'UNAUTHORIZED', 'Nenhuma sessão atativa.')
    }
    // Seção 2 → Seção 4: the `session-expired` scenario revokes an active
    // session server-side, which is exactly what a token expiring mid-flow
    // looks like to the client (401 while the tab still believes it is in).
    if (db.scenario === 'session-expired') {
      db.signOut()
      return errorEnvelope(401, 'UNAUTHORIZED', 'Sessão expirada.')
    }
    const user = db.findUserById(session.userId)
    if (!user) {
      db.signOut()
      return errorEnvelope(401, 'UNAUTHORIZED', 'Sessão expirada.')
    }
    const body: SessionResponse = { user: toSessionUser(user) }
    return HttpResponse.json(body)
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const input = (await request.json().catch(() => null)) as LoginInput | null
    const email = input?.email?.trim() ?? ''
    const password = input?.password ?? ''

    const fields: Record<string, string> = {}
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (password.length < 6) fields.senha = 'A senha precisa ter ao menos 6 caracteres.'
    if (Object.keys(fields).length > 0) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados inválidos.', fields)
    }

    const user = db.findUserByEmail(email)
    if (!user || user.passwordHash !== hashPassword(password)) {
      return errorEnvelope(401, 'UNAUTHORIZED', 'E-mail ou senha inválidos.')
    }

    db.signIn(user.id)
    mergeGuestCart(user.id)

    const body: SessionResponse = { user: toSessionUser(user) }
    return HttpResponse.json(body)
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const input = (await request.json().catch(() => null)) as RegisterInput | null
    const name = input?.name?.trim() ?? ''
    const email = input?.email?.trim() ?? ''
    const password = input?.password ?? ''

    // Field names match the form, so the client can map the envelope straight
    // onto the inputs (`setError`) without a translation table.
    const fields: Record<string, string> = {}
    if (name.length < 2) fields.nome = 'Informe seu nome.'
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (!isStrongPassword(password)) fields.senha = PASSWORD_RULE.message
    if (Object.keys(fields).length > 0) {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Dados inválidos.', fields)
    }

    // The e-mail is already taken: 409 + the offending field, never a generic
    // failure, so the form can point at the input the user must change.
    if (db.findUserByEmail(email)) {
      return errorEnvelope(409, 'CONFLICT', 'Este e-mail já está cadastrado.', {
        email: 'E-mail já cadastrado.',
      })
    }

    const user = db.createUser({ name, email, passwordHash: hashPassword(password) })
    db.signIn(user.id)
    mergeGuestCart(user.id)

    const body: SessionResponse = { user: toSessionUser(user) }
    return HttpResponse.json(body)
  }),

  http.post('/api/auth/logout', () => {
    db.signOut()
    return new HttpResponse(null, { status: 204 })
  }),
]
