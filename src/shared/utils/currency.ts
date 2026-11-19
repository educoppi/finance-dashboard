/**
 * Supported currencies. Each one is formatted with its own native locale
 * conventions (e.g. BRL → "R$ 1.234,56", USD → "$1,234.56", EUR → "1.234,56 €").
 */
export const CURRENCIES = {
  USD: { code: 'USD', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  BRL: { code: 'BRL', name: 'Brazilian Real', locale: 'pt-BR', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', locale: 'de-DE', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', locale: 'ja-JP', decimals: 0 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA', decimals: 2 },
  AUD: { code: 'AUD', name: 'Australian Dollar', locale: 'en-AU', decimals: 2 },
  CHF: { code: 'CHF', name: 'Swiss Franc', locale: 'de-CH', decimals: 2 },
  ARS: { code: 'ARS', name: 'Argentine Peso', locale: 'es-AR', decimals: 2 },
  MXN: { code: 'MXN', name: 'Mexican Peso', locale: 'es-MX', decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  locale: string;
  decimals: number;
}

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && value in CURRENCIES;
}

export function getCurrency(code: CurrencyCode): CurrencyConfig {
  return CURRENCIES[code];
}

/** Narrow symbol for a currency in its own locale ("R$", "$", "€", "¥"…). */
export function currencySymbol(c: CurrencyConfig): string {
  const part = new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find((p) => p.type === 'currency');
  return part?.value ?? c.code;
}
