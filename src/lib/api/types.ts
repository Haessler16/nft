/**
 * Shared transport contracts. Resource-specific contracts live next to their
 * feature (`src/features/<feature>/api/contracts.ts`) and are re-used by the
 * MSW handlers so development, demo and tests share a single definition.
 */

/** ETH values always travel as decimal strings, never as floats. */
export type EthAmount = string

/** Quantities are always integers. */
export type Quantity = number

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}

export interface IdResponse {
  id: string
}

/** Envelope used by idempotent order creation. */
export interface IdempotentRequest {
  idempotencyKey: string
}
