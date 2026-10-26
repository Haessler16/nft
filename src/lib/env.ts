/**
 * Single, typed entry point for runtime configuration.
 *
 * Everything that depends on the environment is read here so that features,
 * hooks and the Axios client never touch `import.meta.env` directly.
 */

const readBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? window.location.origin,
  /**
   * The published build **is** the demo: there is no real API behind `/api/*`,
   * so MSW is on unless a deploy explicitly opts out with
   * `VITE_ENABLE_MOCKS=false`. Defaulting to `false` meant a build from a fresh
   * clone (no local `.env.production`, e.g. Vercel) silently shipped a site
   * whose every `/api` request hit the static host and answered 404.
   */
  mocksEnabled: readBoolean(import.meta.env.VITE_ENABLE_MOCKS, true),
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO ?? 'default',
} as const
