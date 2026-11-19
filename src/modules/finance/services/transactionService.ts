import type { Transaction, TransactionInput, TransactionType } from '../types/finance';
import { monthKeyOf } from '../../../shared/utils/date';
import { roundMoney } from '../../../shared/utils/money';
import { NotFoundError, ValidationError } from '../../../shared/services/errors';
import { STORAGE_KEYS, generateId, readCollection, resolveAsync, writeCollection } from '../../../shared/services/storage';
import { createdMeta, isActive, normalizeMeta, tombstone, touch } from '../../../shared/services/syncMeta';

/** Future REST contract: /api/v1/transactions */

export interface TransactionQuery {
  /** "YYYY-MM" -> GET /api/v1/transactions?month=2026-11 */
  monthKey?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Every stored transaction, tombstones included (normalized to carry sync metadata). */
function loadAll(): Transaction[] {
  const { records, changed } = normalizeMeta(readCollection<Transaction>(STORAGE_KEYS.transactions) ?? []);
  if (changed) save(records);
  return records;
}

/** Active (not soft-deleted) transactions only. */
function loadActive(): Transaction[] {
  return loadAll().filter(isActive);
}

function save(items: Transaction[]): void {
  writeCollection(STORAGE_KEYS.transactions, items);
}

function validate(input: TransactionInput): TransactionInput {
  const description = input.description.trim();
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('The amount must be greater than zero.');
  if (!description) throw new ValidationError('Enter a description.');
  if (description.length > 120) throw new ValidationError('The description must be at most 120 characters.');
  if (!input.categoryId) throw new ValidationError('Select a category.');
  if (!ISO_DATE_RE.test(input.date)) throw new ValidationError('Invalid date.');
  if (input.type !== 'EXPENSE' && input.type !== 'INCOME') throw new ValidationError('Invalid type.');
  return { type: input.type, amount, description, categoryId: input.categoryId, date: input.date };
}

/** Default API ordering: date desc, then creation desc. */
function sortDesc(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

export const transactionService = {
  /** GET /api/v1/transactions?month=YYYY-MM — active records only. */
  list(query: TransactionQuery = {}): Promise<Transaction[]> {
    return resolveAsync(() => {
      const active = loadActive();
      const filtered = query.monthKey ? active.filter((t) => monthKeyOf(t.date) === query.monthKey) : active;
      return [...filtered].sort(sortDesc);
    });
  },

  /** POST /api/v1/transactions */
  create(input: TransactionInput): Promise<Transaction> {
    return resolveAsync(() => {
      const created: Transaction = { ...validate(input), id: generateId(), ...createdMeta() };
      save([...loadAll(), created]);
      return created;
    });
  },

  /** PUT /api/v1/transactions/{id} */
  update(id: string, input: TransactionInput): Promise<Transaction> {
    return resolveAsync(() => {
      const all = loadAll();
      const current = all.find((t) => t.id === id && isActive(t));
      if (!current) throw new NotFoundError('Transaction not found.');
      const updated = touch({ ...current, ...validate(input) });
      save(all.map((t) => (t.id === id ? updated : t)));
      return updated;
    });
  },

  /** DELETE /api/v1/transactions/{id} — soft delete (tombstone kept for sync). */
  remove(id: string): Promise<void> {
    return resolveAsync(() => {
      const all = loadAll();
      if (!all.some((t) => t.id === id && isActive(t))) throw new NotFoundError('Transaction not found.');
      save(all.map((t) => (t.id === id ? tombstone(t) : t)));
    });
  },

  /** GET /api/v1/categories/{id}/transactions/count — active transactions only. */
  countByCategory(categoryId: string): Promise<{ total: number; byType: Record<TransactionType, number> }> {
    return resolveAsync(() => {
      const byType: Record<TransactionType, number> = { EXPENSE: 0, INCOME: 0 };
      for (const t of loadActive()) if (t.categoryId === categoryId) byType[t.type]++;
      return { total: byType.EXPENSE + byType.INCOME, byType };
    });
  },

  /** GET /api/v1/transactions/category-usage -> { [categoryId]: count } — active transactions only. */
  usageByCategory(): Promise<Record<string, number>> {
    return resolveAsync(() => {
      const usage: Record<string, number> = {};
      for (const t of loadActive()) usage[t.categoryId] = (usage[t.categoryId] ?? 0) + 1;
      return usage;
    });
  },
};
