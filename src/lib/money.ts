import Decimal from 'decimal.js'

/**
 * ETH helpers.
 *
 * ETH never becomes a JS number: prices come from the API as decimal strings,
 * arithmetic happens in Decimal and the UI formats the result. Quantities are
 * integers.
 *
 * API responses may contain up to 18 decimals, so the intermediate precision
 * is raised instead of relying on the library default.
 */
const ETH = 'ETH'

const dec = (value: string | Decimal): Decimal => new Decimal(value)

export const isEthString = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)

export const sumEth = (values: readonly string[]): string =>
  values
    .reduce((total, value) => total.plus(dec(value)), new Decimal(0))
    .toFixed()

/** Integer quantity × ETH unit price. */
export const multiplyEth = (price: string, quantity: number): string => {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('A quantidade deve ser um inteiro não negativo.')
  }
  return dec(price).times(quantity).toFixed()
}

export const subtractEth = (a: string, b: string): string => dec(a).minus(dec(b)).toFixed()

export const isGreaterThan = (a: string, b: string): boolean => dec(a).greaterThan(dec(b))

export interface FormatEthOptions {
  /** Maximum fraction digits shown in the UI (default 4). */
  maxFractionDigits?: number
  /** Append the ETH ticker (default true). */
  symbol?: boolean
}

export const formatEth = (value: string, options: FormatEthOptions = {}): string => {
  const { maxFractionDigits = 4, symbol = true } = options
  const amount = dec(value).toFixed(maxFractionDigits)
  return symbol ? `${amount} ${ETH}` : amount
}

/** Percentage already computed by the API, only formatted for display. */
export const formatDiscount = (percent: string): string => `${dec(percent).toFixed(2)}%`
