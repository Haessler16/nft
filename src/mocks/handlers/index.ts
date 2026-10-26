import { http, HttpResponse } from 'msw'

import type { RealtimeEvent } from '@/lib/realtime'
import { isRealtimeEvent } from '@/lib/realtime'
import { db } from '@/mocks/db'
import { cartHandlers } from '@/mocks/handlers/cart'
import { errorEnvelope } from '@/mocks/handlers/envelope'
import { favoriteHandlers } from '@/mocks/handlers/favorites'
import { nftHandlers } from '@/mocks/handlers/nfts'
import { orderHandlers } from '@/mocks/handlers/orders'
import { profileHandlers } from '@/mocks/handlers/profile'
import { quoteHandlers } from '@/mocks/handlers/quote'
import { sessionHandlers } from '@/mocks/handlers/session'
import { walletHandlers } from '@/mocks/handlers/wallets'
import {
  publishNftChanges,
  publishRealtime,
  realtimeHandlers,
  setRealtimeRelay,
} from '@/mocks/realtime'

/**
 * MSW request handlers.
 *
 * Every mocked endpoint lives in the network layer — components, hooks and the
 * Axios client never contain fake data. Handlers share the same `contracts.ts`
 * types used by the app and the state in `src/mocks/db.ts`.
 */

/** Health endpoint used by the app/tests to confirm the worker is intercepting. */
const healthHandler = http.get('/api/health', () =>
  HttpResponse.json({ status: 'ok', mocked: true }),
)

/**
 * Restores the deterministic seed. Used by the demo reset button and by the E2E
 * suite, so every test starts from a known state.
 */
const resetHandler = http.post('/api/__mock/reset', () => {
  const state = db.reset()
  return HttpResponse.json({ ok: true, nfts: state.nfts.length, scenario: state.scenario })
})

/**
 * Selects the active deterministic scenario (docs/PLAN.md → Seção 2).
 *
 * Scenarios are network behaviour, not UI code: the handler decides how to
 * answer, and the screen only ever sees ordinary REST responses.
 */
const scenarioHandler = http.post('/api/__mock/scenario', async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { scenario?: unknown } | null
  const scenario = typeof body?.scenario === 'string' ? body.scenario.trim() : ''
  if (!scenario) {
    return errorEnvelope(422, 'VALIDATION_ERROR', 'Informe o cenário.', {
      scenario: 'Cenário obrigatório.',
    })
  }
  const before = db.nfts
  const state = db.setScenario(scenario)
  // Data scenarios change the catalog: every affected edition announces
  // itself over the socket so open tabs update without a reload (Seção 10).
  publishNftChanges(before, state.nfts)
  return HttpResponse.json({ ok: true, scenario: state.scenario })
})

/**
 * Injects a crafted realtime event (Seção 10 instrumentation).
 *
 * Used by the E2E suite to deliver a duplicate or an out-of-order event —
 * impossible to produce deterministically through the normal flows. The event
 * still travels the real path (publish → socket.io → client); only its version
 * is supplied by the caller.
 */
const injectEventHandler = http.post('/api/__mock/event', async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { event?: unknown } | null
  const candidate = body?.event
  if (!isRealtimeEvent(candidate)) {
    return errorEnvelope(422, 'VALIDATION_ERROR', 'Evento inválido.', {
      event: 'Envie { event: { type, resourceId, version, payload } }.',
    })
  }
  const event = candidate as RealtimeEvent
  publishRealtime({
    ...event,
    occurredAt: event.occurredAt || new Date().toISOString(),
  })
  return HttpResponse.json({ ok: true, delivered: event.version })
})

/**
 * Simulates a realtime outage or its recovery (Seção 10 instrumentation).
 * `outage` drops every open socket and refuses new ones; `restore` lets the
 * client reconnect with its own backoff. REST keeps working either way, which
 * is exactly what the pending-order recovery scenario needs.
 */
const realtimeControlHandler = http.post(
  '/api/__mock/realtime',
  async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { action?: unknown } | null
    const action = body?.action
    if (action !== 'outage' && action !== 'restore') {
      return errorEnvelope(422, 'VALIDATION_ERROR', 'Ação inválida.', {
        action: 'Use "outage" ou "restore".',
      })
    }
    setRealtimeRelay(action === 'restore')
    return HttpResponse.json({ ok: true, action })
  },
)

export const handlers = [
  healthHandler,
  resetHandler,
  scenarioHandler,
  injectEventHandler,
  realtimeControlHandler,
  ...sessionHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...walletHandlers,
  ...profileHandlers,
  ...orderHandlers,
  ...nftHandlers,
]

export const allHandlers = [
  ...handlers,
  ...realtimeHandlers,
]
