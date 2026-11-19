import type { DefaultGoal, MonthlyGoal } from '../types/finance';
import { roundMoney } from '../../../shared/utils/money';
import { ValidationError } from '../../../shared/services/errors';
import { STORAGE_KEYS, nowISO, readCollection, resolveAsync, writeCollection } from '../../../shared/services/storage';
import { createdMeta, isActive, normalizeMeta, tombstone } from '../../../shared/services/syncMeta';

export type { DefaultGoal };

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
 *
 * Both tables are keyed by month ("YYYY-MM"). Replacing a goal updates the
 * existing row (reviving it if it was a tombstone); goals made obsolete by
 * "apply to future months" are soft-deleted, never physically removed.
 */

export interface ResolvedGoal {
  monthKey: string;
  targetAmount: number;
  source: 'MONTH' | 'DEFAULT' | 'NONE';
}

export const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function loadGoals(): MonthlyGoal[] {
  const { records, changed } = normalizeMeta(readCollection<MonthlyGoal>(STORAGE_KEYS.goals) ?? []);
  if (changed) writeCollection(STORAGE_KEYS.goals, records);
  return records;
}

function loadDefaults(): DefaultGoal[] {
  const { records, changed } = normalizeMeta(readCollection<DefaultGoal>(STORAGE_KEYS.defaultGoals) ?? []);
  if (changed) writeCollection(STORAGE_KEYS.defaultGoals, records);
  return records;
}

function resolve(monthKey: string): ResolvedGoal {
  const explicit = loadGoals().find((g) => g.monthKey === monthKey && isActive(g));
  if (explicit) return { monthKey, targetAmount: explicit.targetAmount, source: 'MONTH' };
  const def = loadDefaults()
    .filter((d) => isActive(d) && d.effectiveFrom <= monthKey)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];
  if (def) return { monthKey, targetAmount: def.targetAmount, source: 'DEFAULT' };
  return { monthKey, targetAmount: 0, source: 'NONE' };
}

/** Upserts the row matching `matches`, reviving a tombstone if needed. */
function upsert<T extends MonthlyGoal | DefaultGoal>(
  rows: T[],
  matches: (r: T) => boolean,
  create: () => T,
  targetAmount: number,
  at: string,
): T[] {
  const existing = rows.find(matches);
  if (!existing) return [...rows, create()];
  return rows.map((r) => (r === existing ? { ...r, targetAmount, updatedAt: at, deletedAt: null } : r));
}

export const goalService = {
  /** GET /api/v1/goals/{monthKey} — ignores soft-deleted goals. */
  getByMonth(monthKey: string): Promise<ResolvedGoal> {
    return resolveAsync(() => resolve(monthKey));
  },

  /**
   * PUT /api/v1/goals/{monthKey}  body: { targetAmount, applyToFutureMonths }
   * With applyToFutureMonths, the goal becomes the default from this month on and
   * explicit goals for this and future months are soft-deleted so they inherit
   * the new default.
   */
  save(monthKey: string, targetAmount: number, applyToFutureMonths: boolean): Promise<ResolvedGoal> {
    return resolveAsync(() => {
      if (!MONTH_KEY_RE.test(monthKey)) throw new ValidationError('Invalid month.');
      const amount = roundMoney(targetAmount);
      if (!Number.isFinite(amount) || amount < 0) throw new ValidationError('The goal cannot be negative.');
      const at = nowISO();

      if (applyToFutureMonths) {
        // Explicit goals from this month on are superseded by the new default.
        const goals = loadGoals().map((g) => (isActive(g) && g.monthKey >= monthKey ? tombstone(g, at) : g));
        // Defaults starting after this month would shadow the new one: retire them.
        const defaults = loadDefaults().map((d) =>
          isActive(d) && d.effectiveFrom > monthKey ? tombstone(d, at) : d,
        );
        writeCollection(
          STORAGE_KEYS.defaultGoals,
          upsert(
            defaults,
            (d) => d.effectiveFrom === monthKey,
            () => ({ effectiveFrom: monthKey, targetAmount: amount, ...createdMeta(at) }),
            amount,
            at,
          ),
        );
        writeCollection(STORAGE_KEYS.goals, goals);
      } else {
        writeCollection(
          STORAGE_KEYS.goals,
          upsert(
            loadGoals(),
            (g) => g.monthKey === monthKey,
            () => ({ monthKey, targetAmount: amount, ...createdMeta(at) }),
            amount,
            at,
          ),
        );
      }
      return resolve(monthKey);
    });
  },

  /** Active goals (used by backups). */
  listGoals(): Promise<MonthlyGoal[]> {
    return resolveAsync(() => loadGoals().filter(isActive));
  },

  /** Active default goals (used by backups). */
  listDefaults(): Promise<DefaultGoal[]> {
    return resolveAsync(() => loadDefaults().filter(isActive));
  },
};
