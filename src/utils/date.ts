const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Data de hoje no fuso LOCAL ("YYYY-MM-DD").
 * Nunca usar `toISOString()` aqui: ele converte para UTC e, à noite no Brasil
 * (UTC-3), retornaria o dia seguinte.
 */
export function getLocalTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "YYYY-MM" do mês atual, no fuso local. */
export function getCurrentMonthKey(): string {
  const now = new Date();
  return toMonthKey(now.getFullYear(), now.getMonth() + 1);
}

/** month: 1-12 */
export function toMonthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [y, m] = monthKey.split('-');
  return { year: Number(y), month: Number(m) };
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const zeroBased = year * 12 + (month - 1) + delta;
  return toMonthKey(Math.floor(zeroBased / 12), (zeroBased % 12) + 1);
}

/** Quantidade de dias do mês (28/29/30/31). */
export function daysInMonth(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey);
  // Dia 0 do mês seguinte = último dia do mês atual (construtor local, sem UTC).
  return new Date(year, month, 0).getDate();
}

/** "2026-11-05" -> "2026-11" (comparação por string, sem Date). */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function dayOf(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

/** "2026-11-05" -> "05/11/2026" */
export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function formatMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1] ?? ''} ${year}`;
}

/**
 * Data padrão para lançar num mês selecionado: hoje, se for o mês corrente;
 * senão, o dia 1 daquele mês.
 */
export function defaultDateForMonth(monthKey: string): string {
  const today = getLocalTodayISO();
  return monthKeyOf(today) === monthKey ? today : `${monthKey}-01`;
}
