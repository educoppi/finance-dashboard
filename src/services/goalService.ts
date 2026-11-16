import type { MonthlyGoal } from '../types/finance';
import { roundMoney } from '../utils/money';
import { ValidationError } from './errors';
import { STORAGE_KEYS, readCollection, resolveAsync, writeCollection } from './storage';

/**
 * Future REST contract: /api/v1/goals
 *
 * How a month's goal is resolved:
 *   1. Explicit goal for the month (monthly_goals table)          -> source "MONTH"
 *   2. Active default: the one with the latest effectiveFrom <= month -> source "DEFAULT"
 *      (default_goals table; "apply to future months")
 *   3. None                                                        -> 0 / source "NONE"
 *
 * A default goal only applies from the month it was set onwards, so it never
 * retroactively changes the history of previous months.
 */

export interface DefaultGoal {
  effectiveFrom: string; // "YYYY-MM"
  targetAmount: number;
}

export interface ResolvedGoal extends MonthlyGoal {
  source: 'MONTH' | 'DEFAULT' | 'NONE';
}

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function loadGoals(): MonthlyGoal[] {
  return readCollection<MonthlyGoal>(STORAGE_KEYS.goals) ?? [];
}

function loadDefaults(): DefaultGoal[] {
  return readCollection<DefaultGoal>(STORAGE_KEYS.defaultGoals) ?? [];
}

function resolve(monthKey: string): ResolvedGoal {
  const explicit = loadGoals().find((g) => g.monthKey === monthKey);
  if (explicit) return { ...explicit, source: 'MONTH' };
  const def = loadDefaults()
    .filter((d) => d.effectiveFrom <= monthKey)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];
  if (def) return { monthKey, targetAmount: def.targetAmount, source: 'DEFAULT' };
  return { monthKey, targetAmount: 0, source: 'NONE' };
}

export const goalService = {
  /** GET /api/v1/goals/{monthKey} */
  getByMonth(monthKey: string): Promise<ResolvedGoal> {
    return resolveAsync(() => resolve(monthKey));
  },

  /**
   * PUT /api/v1/goals/{monthKey}  body: { targetAmount, applyToFutureMonths }
   * With applyToFutureMonths, the goal becomes the default from this month on and
   * explicit goals for future months are removed so they inherit the new default.
   */
  save(monthKey: string, targetAmount: number, applyToFutureMonths: boolean): Promise<ResolvedGoal> {
    return resolveAsync(() => {
      if (!MONTH_KEY_RE.test(monthKey)) throw new ValidationError('Invalid month.');
      const amount = roundMoney(targetAmount);
      if (!Number.isFinite(amount) || amount < 0) throw new ValidationError('The goal cannot be negative.');

      let goals = loadGoals().filter((g) => g.monthKey !== monthKey);

      if (applyToFutureMonths) {
        goals = goals.filter((g) => g.monthKey < monthKey);
        const defaults = loadDefaults().filter((d) => d.effectiveFrom < monthKey);
        writeCollection(STORAGE_KEYS.defaultGoals, [...defaults, { effectiveFrom: monthKey, targetAmount: amount }]);
        writeCollection(STORAGE_KEYS.goals, goals);
      } else {
        writeCollection(STORAGE_KEYS.goals, [...goals, { monthKey, targetAmount: amount }]);
      }
      return resolve(monthKey);
    });
  },
};
