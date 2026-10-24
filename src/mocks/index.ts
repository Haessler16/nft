import { env } from '@/lib/env'

/**
 * Starts MSW before the first render when `VITE_ENABLE_MOCKS=true`.
 *
 * The whole mocking layer is configuration-driven: the demo build keeps it on,
 * a build pointed at a real API keeps it off, and nothing else in the app has to
 * change. The worker is imported dynamically so mocks never ship in the bundle
 * when they are disabled.
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
