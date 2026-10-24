/**
 * REST error contract shared by MSW handlers, the Axios layer and the UI.
 *
 * Every non-2xx response from the mocked API uses this envelope:
 *
 * {
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Dados inválidos",
 *     "fields": { "email": "E-mail já cadastrado" },
 *     "requestId": "req_01"
 *   }
 * }
 */

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNAVAILABLE',
  'INTERNAL',
  'NETWORK_ERROR',
  'TIMEOUT',
  'CANCELED',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Field-level messages, keyed by form field name. */
  fields?: Record<string, string>
  requestId?: string
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly fields: Record<string, string>
  readonly requestId?: string

  constructor(body: ApiErrorBody, status: number) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
    this.fields = body.fields ?? {}
    this.requestId = body.requestId
  }

  /** 4xx errors are terminal: retrying them cannot succeed. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500
  }

  get isUnauthorized(): boolean {
    return this.code === 'UNAUTHORIZED'
  }

  get isConflict(): boolean {
    return this.code === 'CONFLICT'
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fields).length > 0
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

export const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = (value as { error?: unknown }).error
  if (typeof candidate !== 'object' || candidate === null) return false
  const { code, message } = candidate as { code?: unknown; message?: unknown }
  return typeof code === 'string' && typeof message === 'string'
}
