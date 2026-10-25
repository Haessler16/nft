import { HttpResponse } from 'msw'

import type { ApiErrorCode } from '@/lib/api/errors'

/**
 * The one place mocked handlers build an error body.
 *
 * It guarantees every non-2xx response in the demo matches the envelope the
 * Axios layer parses (`src/lib/api/errors.ts`), so the UI sees the same shape
 * whether the failure comes from validation, auth or the network.
 */
export const errorEnvelope = (
  status: number,
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
) => HttpResponse.json({ error: { code, message, fields } }, { status })

export const unauthorized = (message = 'Entre para acessar este recurso.') =>
  errorEnvelope(401, 'UNAUTHORIZED', message)

export const notFound = (message = 'Recurso não encontrado.') =>
  errorEnvelope(404, 'NOT_FOUND', message)

/** `db.scenario` check kept here so scenario rules stay visible in one place. */
export const scenarioFails = (scenario: string): boolean => scenario === 'flaky'
