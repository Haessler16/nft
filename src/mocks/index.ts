import { env } from '@/lib/env'

/**
 * Starts MSW before the first render (docs/PLAN.md → Seção 2).
 *
 * The mocking layer is configuration-driven: the demo build keeps it on (that
 * is also the fallback — see `src/lib/env.ts`), and a build pointed at a real
 * API turns it off with `VITE_ENABLE_MOCKS=false`. The worker is imported
 * dynamically so mocks never ship in that build.
 */
export const enableMocking = async (): Promise<void> => {
  if (!env.mocksEnabled) return

  const { worker } = await import('@/mocks/browser')

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: false,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
