import type { Category, CategoryType, MonthSummary, Transaction, TransactionType } from '../types/finance';
import { dayOf, daysInMonth, monthKeyOf } from './date';
import { roundMoney, sumMoney } from './money';

/** Warning zone threshold: free margin <= 20% of the spending cap. */
export const WARNING_THRESHOLD = 0.2;

export function filterByMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => monthKeyOf(t.date) === monthKey);
}

export function isCategoryCompatible(categoryType: CategoryType, txType: TransactionType): boolean {
  return categoryType === txType;
}

/**
 * Savings goal rules:
 *   Spending cap = Income - Goal
 *   Free margin  = Cap - Expenses
 *
 * States:
 *   NEUTRAL  — no income this month (no basis for a cap)
 *   EXCEEDED — margin < 0
 *   WARNING  — 0 <= margin <= 20% of the cap
 *   ON_TRACK — margin > 20% of the cap
 *
 * Edge cases:
 *  - goal == income, no expenses → cap 0, margin 0 → WARNING (no room to spend).
 *  - goal > income → cap < 0, margin < 0 → EXCEEDED even without expenses: income
 *    does not cover the reserve (the UI shows a dedicated message).
 *  - expenses > income with goal 0 → EXCEEDED (negative balance).
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
        name: cat?.name ?? 'Uncategorized',
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

/** Day-by-day cumulative expense series (days 1..N of the month). */
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
