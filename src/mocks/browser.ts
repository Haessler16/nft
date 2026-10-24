import { setupWorker } from 'msw/browser'

import { handlers } from '@/mocks/handlers'

/**
 * Service worker used by development, the demo build and Playwright.
 * Socket.IO events are intercepted by the same worker once
 * `@mswjs/socket.io-binding` is wired in docs/PLAN.md → Seção 10.
 */
export const worker = setupWorker(...handlers)
