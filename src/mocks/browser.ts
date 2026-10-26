import { setupWorker, type SetupWorkerApi } from 'msw/browser'

import { handlers } from '@/mocks/handlers'

/**
 * Service worker used by development, the demo build and Playwright.
 *
 * HTTP handlers and the WebSocket link (`realtimeHandlers`) are registered
 * together: `setupWorker` accepts `AnyHandler`, and MSW only mocks WebSocket
 * connections when a `ws` handler is present — without one, the socket is
 * passed through to the network and the handshake times out (Seção 10).
 */
export const worker: SetupWorkerApi = setupWorker(...handlers)
