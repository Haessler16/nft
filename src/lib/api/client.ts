import axios, { AxiosError, type AxiosInstance } from 'axios'

import {
  ApiError,
  isApiErrorEnvelope,
  type ApiErrorBody,
  type ApiErrorCode,
} from '@/lib/api/errors'
import { env } from '@/lib/env'

/**
 * The only HTTP client in the app. Features build typed endpoint functions on
 * top of `http`; no component or hook talks to Axios directly.
 *
 * Conventions:
 * - requests are cancellable through `signal` (TanStack Query passes one);
 * - non-2xx responses are normalised into `ApiError`;
 * - session cookies are sent with `withCredentials`.
 */
export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const statusToCode = (status: number): ApiErrorCode => {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status >= 500) return 'INTERNAL'
  return 'VALIDATION_ERROR'
}

const networkErrorBody = (error: AxiosError): ApiErrorBody => {
  if (error.code === 'ERR_CANCELED') {
    return { code: 'CANCELED', message: 'Requisição cancelada.' }
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return { code: 'TIMEOUT', message: 'A requisição excedeu o tempo limite.' }
  }
  return { code: 'NETWORK_ERROR', message: 'Não foi possível conectar ao servidor.' }
}

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0
    if (error.response && isApiErrorEnvelope(error.response.data)) {
      return new ApiError(error.response.data.error, status)
    }
    if (!error.response) {
      return new ApiError(networkErrorBody(error), status)
    }
    return new ApiError(
      { code: statusToCode(status), message: error.message },
      status,
    )
  }

  return new ApiError(
    { code: 'INTERNAL', message: 'Erro inesperado.' },
    0,
  )
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
