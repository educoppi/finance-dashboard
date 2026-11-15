import type { Category, CategoryType, MonthSummary, Transaction, TransactionType } from '../types/finance';
import { dayOf, daysInMonth, monthKeyOf } from './date';
import { roundMoney, sumMoney } from './money';

/** Limiar da Zona de Atenção: margem livre <= 20% do teto. */
export const WARNING_THRESHOLD = 0.2;

export function filterByMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => monthKeyOf(t.date) === monthKey);
}

export function isCategoryCompatible(categoryType: CategoryType, txType: TransactionType): boolean {
  return categoryType === 'BOTH' || categoryType === txType;
}

/**
 * Regras da meta de economia:
 *   Teto de Gastos = Receitas - Meta
 *   Margem Livre   = Teto - Gastos
 *
 * Estados:
 *   NEUTRAL  — sem receitas no mês (não há base para o teto)
 *   EXCEEDED — margem < 0
 *   WARNING  — 0 <= margem <= 20% do teto
 *   ON_TRACK — margem > 20% do teto
 *
 * Bordas:
 *  - meta == receitas, sem gastos → teto 0, margem 0 → WARNING (nenhum gasto cabe).
 *  - meta > receitas → teto < 0, margem < 0 → EXCEEDED mesmo sem gastos: as
 *    receitas não cobrem a reserva (a UI usa uma mensagem específica).
 *  - gastos > receitas com meta 0 → EXCEEDED (saldo negativo).
 */
export function computeMonthSummary(monthTx: Transaction[], goal: number): MonthSummary {
  const income = sumMoney(monthTx.filter((t) => t.type === 'INCOME').map((t) => t.amount));
  const expense = sumMoney(monthTx.filter((t) => t.type === 'EXPENSE').map((t) => t.amount));
  const balance = roundMoney(income - expense);
  const spendingCap = roundMoney(income - goal);
  const freeMargin = roundMoney(spendingCap - expense);

  let status: MonthSummary['status'];
  if (income <= 0) status = 'NEUTRAL';
  else if (freeMargin < 0) status = 'EXCEEDED';
  else if (freeMargin <= spendingCap * WARNING_THRESHOLD) status = 'WARNING';
  else status = 'ON_TRACK';

  return { income, expense, balance, goal, spendingCap, freeMargin, status };
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  value: number;
  percent: number;
}

export function expensesByCategory(monthTx: Transaction[], categories: Category[]): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of monthTx) {
    if (t.type !== 'EXPENSE') continue;
    totals.set(t.categoryId, Math.round(t.amount * 100) + (totals.get(t.categoryId) ?? 0));
  }
  const totalCents = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([categoryId, cents]) => {
      const cat = byId.get(categoryId);
      return {
        categoryId,
        name: cat?.name ?? 'Sem categoria',
        color: cat?.color ?? '#475569',
        value: cents / 100,
        percent: totalCents ? cents / totalCents : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

export interface DailyPoint {
  day: number;
  daily: number;
  cumulative: number;
}

/** Série de gastos acumulados dia a dia (1..N dias do mês). */
export function cumulativeExpenses(monthTx: Transaction[], monthKey: string): DailyPoint[] {
  const n = daysInMonth(monthKey);
  const dailyCents = new Array<number>(n + 1).fill(0);
  for (const t of monthTx) {
    if (t.type !== 'EXPENSE') continue;
    const d = dayOf(t.date);
    if (d >= 1 && d <= n) dailyCents[d] = (dailyCents[d] ?? 0) + Math.round(t.amount * 100);
  }
  const points: DailyPoint[] = [];
  let acc = 0;
  for (let day = 1; day <= n; day++) {
    const c = dailyCents[day] ?? 0;
    acc += c;
    points.push({ day, daily: c / 100, cumulative: acc / 100 });
  }
  return points;
}
