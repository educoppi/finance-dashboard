const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Arredonda para centavos evitando erros de ponto flutuante (0.1 + 0.2). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Soma em centavos inteiros e devolve em reais — sem acúmulo de erro. */
export function sumMoney(values: number[]): number {
  const cents = values.reduce((acc, v) => acc + Math.round(v * 100), 0);
  return cents / 100;
}

export function formatBRL(value: number): string {
  // Evita "-R$ 0,00" quando o valor arredondado é zero.
  const v = roundMoney(value);
  return brl.format(Object.is(v, -0) ? 0 : v);
}

export function formatBRLCompact(value: number): string {
  return brlCompact.format(value);
}

/**
 * Máscara monetária: trata a entrada como centavos digitados.
 * "1" -> "0,01", "1234" -> "12,34", "123456" -> "1.234,56"
 */
export function maskCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
  if (!digits) return '';
  const cents = Number(digits);
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "1.234,56" -> 1234.56 ; string vazia -> 0 */
export function parseCurrencyInput(masked: string): number {
  const digits = masked.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

/** 1234.56 -> "1.234,56" (para preencher o input em modo edição). */
export function toCurrencyInput(value: number): string {
  return maskCurrencyInput(String(Math.round(value * 100)));
}
