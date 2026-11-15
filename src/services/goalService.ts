import type { MonthlyGoal } from '../types/finance';
import { roundMoney } from '../utils/money';
import { ValidationError } from './errors';
import { STORAGE_KEYS, readCollection, resolveAsync, writeCollection } from './storage';

/**
 * Contrato REST futuro: /api/v1/goals
 *
 * Resolução da meta de um mês:
 *   1. Meta explícita do mês (tabela monthly_goals)            -> source "MONTH"
 *   2. Meta padrão vigente: a de maior effectiveFrom <= mês     -> source "DEFAULT"
 *      (tabela default_goals; "aplicar para os próximos meses")
 *   3. Nenhuma                                                  -> 0 / source "NONE"
 *
 * A meta padrão só vale a partir do mês em que foi definida, para nunca
 * alterar retroativamente o histórico de meses anteriores.
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
   * Com applyToFutureMonths, a meta vira padrão a partir deste mês e as metas
   * explícitas de meses futuros são removidas para herdarem o novo padrão.
   */
  save(monthKey: string, targetAmount: number, applyToFutureMonths: boolean): Promise<ResolvedGoal> {
    return resolveAsync(() => {
      if (!MONTH_KEY_RE.test(monthKey)) throw new ValidationError('Mês inválido.');
      const amount = roundMoney(targetAmount);
      if (!Number.isFinite(amount) || amount < 0) throw new ValidationError('A meta não pode ser negativa.');

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
