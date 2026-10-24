/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for every REST call made through Axios. */
  readonly VITE_API_BASE_URL?: string
  /** Origin used by socket.io-client. Defaults to the current origin. */
  readonly VITE_SOCKET_URL?: string
  /** "true" boots MSW before the app renders. Must be enabled in demo builds. */
  readonly VITE_ENABLE_MOCKS?: string
  /** Deterministic MSW scenario id (see src/mocks/scenarios). */
  readonly VITE_MOCK_SCENARIO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
