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
  mocksEnabled: readBoolean(import.meta.env.VITE_ENABLE_MOCKS, false),
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO ?? 'default',
} as const
