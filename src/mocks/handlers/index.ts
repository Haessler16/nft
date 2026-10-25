import { http, HttpResponse } from 'msw'

import { db } from '@/mocks/db'
import { cartHandlers } from '@/mocks/handlers/cart'
import { errorEnvelope } from '@/mocks/handlers/envelope'
import { favoriteHandlers } from '@/mocks/handlers/favorites'
import { nftHandlers } from '@/mocks/handlers/nfts'
import { quoteHandlers } from '@/mocks/handlers/quote'
import { sessionHandlers } from '@/mocks/handlers/session'

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
  const state = db.setScenario(scenario)
  return HttpResponse.json({ ok: true, scenario: state.scenario })
})

export const handlers = [
  healthHandler,
  resetHandler,
  scenarioHandler,
  ...sessionHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...nftHandlers,
]
