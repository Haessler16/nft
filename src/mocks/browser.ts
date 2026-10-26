import { setupWorker, type SetupWorkerApi } from 'msw/browser'

import { handlers } from '@/mocks/handlers'

/**
 * Service worker used by development, the demo build and Playwright.
 *
 * Only HTTP request handlers are registered here. The WebSocket link
 * (`realtimeHandlers`) is started separately by the runtime that needs it
 * (docs/PLAN.md → Seção 10), because `setupWorker` only accepts `AnyHandler`.
 */
export const worker: SetupWorkerApi = setupWorker(...handlers)
