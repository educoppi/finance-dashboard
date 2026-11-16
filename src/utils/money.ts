import type { CurrencyConfig } from './currency';

/** Rounds to cents, avoiding floating-point drift (0.1 + 0.2). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Sums in integer cents and returns the total in currency units — no error accumulation. */
export function sumMoney(values: number[]): number {
  const cents = values.reduce((acc, v) => acc + Math.round(v * 100), 0);
  return cents / 100;
}

export interface MoneyFormatter {
  /** Full format, e.g. "$1,234.56" */
  format: (value: number) => string;
  /** Compact format for chart axes, e.g. "$1.2K" */
  formatCompact: (value: number) => string;
  /** Input mask: treats typed digits as minor units ("1234" → "12.34" in USD). */
  mask: (raw: string) => string;
  /** Masked string → number ("1,234.56" → 1234.56). */
  parse: (masked: string) => number;
  /** Number → masked string, to prefill inputs when editing. */
  toInput: (value: number) => string;
  /** Zero in the input's format, e.g. "0.00" (USD), "0,00" (BRL), "0" (JPY). */
  placeholder: string;
}

export function createMoneyFormatter(currency: CurrencyConfig): MoneyFormatter {
  const { locale, code, decimals } = currency;
  const full = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  // Compact suffixes follow the UI language ("1.2K"), not the currency locale ("1,2 mil").
  const compact = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const plain = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const factor = 10 ** decimals;

  const mask = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
    if (!digits) return '';
    return plain.format(Number(digits) / factor);
  };

  return {
    format: (value) => {
      const v = Math.round((value + Number.EPSILON) * factor) / factor;
      return full.format(Object.is(v, -0) ? 0 : v); // never "-$0.00"
    },
    formatCompact: (value) => compact.format(value),
    mask,
    parse: (masked) => {
      const digits = masked.replace(/\D/g, '');
      return digits ? Number(digits) / factor : 0;
    },
    toInput: (value) => mask(String(Math.round(value * factor))),
    placeholder: plain.format(0),
  };
}
