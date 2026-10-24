import { http, HttpResponse } from 'msw'

/**
 * MSW request handlers.
 *
 * Every mocked endpoint lives in the network layer — components, hooks and the
 * Axios client never contain fake data. Feature handlers are added here in
 * docs/PLAN.md → Seção 2 and share the same `contracts.ts` types used by the app.
 */

/** Health endpoint used by the app/tests to confirm the worker is intercepting. */
const healthHandler = http.get('/api/health', () =>
  HttpResponse.json({ status: 'ok', mocked: true }),
)

export const handlers = [healthHandler]
