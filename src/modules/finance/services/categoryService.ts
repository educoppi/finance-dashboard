import type { Category, CategoryInput, Transaction } from '../types/finance';
import { IntegrityError, NotFoundError, ValidationError } from '../../../shared/services/errors';
import { STORAGE_KEYS, generateId, readCollection, resolveAsync, writeCollection } from '../../../shared/services/storage';
import { createdMeta, isActive, normalizeMeta, tombstone, touch } from '../../../shared/services/syncMeta';
import { transactionService } from './transactionService';

/** Future REST contract: /api/v1/categories */

const DEFAULT_CATEGORIES: CategoryInput[] = [
  { name: 'Food', color: '#f97316', type: 'EXPENSE' },
  { name: 'Transportation', color: '#3b82f6', type: 'EXPENSE' },
  { name: 'Housing & Bills', color: '#8b5cf6', type: 'EXPENSE' },
  { name: 'Leisure', color: '#ec4899', type: 'EXPENSE' },
  { name: 'Health & Fitness', color: '#14b8a6', type: 'EXPENSE' },
  { name: 'Other', color: '#64748b', type: 'EXPENSE' },
  { name: 'Salary', color: '#10b981', type: 'INCOME' },
  { name: 'Side Income', color: '#22c55e', type: 'INCOME' },
];

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Migration: the legacy "BOTH" category type no longer exists. A former BOTH
 * category becomes INCOME if only income transactions use it, otherwise EXPENSE.
 */
function migrateLegacyBoth(stored: Category[]): { records: Category[]; changed: boolean } {
  if (!stored.some((c) => (c.type as string) === 'BOTH')) return { records: stored, changed: false };
  const txs = (readCollection<Pick<Transaction, 'categoryId' | 'type' | 'deletedAt'>>(STORAGE_KEYS.transactions) ?? []).filter(isActive);
  const records = stored.map((c) => {
    if ((c.type as string) !== 'BOTH') return c;
    const linked = txs.filter((t) => t.categoryId === c.id);
    const onlyIncome = linked.length > 0 && linked.every((t) => t.type === 'INCOME');
    return touch({ ...c, type: onlyIncome ? 'INCOME' : 'EXPENSE' } satisfies Category);
  });
  return { records, changed: true };
}

/** Every stored category, tombstones included (normalized + migrated). */
function loadAll(): Category[] {
  const stored = readCollection<Category>(STORAGE_KEYS.categories);
  if (stored === null) {
    // Seed on first access (equivalent to a Flyway migration with initial data).
    const meta = createdMeta();
    const seeded = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: generateId(), ...meta }));
    writeCollection(STORAGE_KEYS.categories, seeded);
    return seeded;
  }
  const normalized = normalizeMeta(stored);
  const migrated = migrateLegacyBoth(normalized.records);
  if (normalized.changed || migrated.changed) writeCollection(STORAGE_KEYS.categories, migrated.records);
  return migrated.records;
}

function validate(input: CategoryInput, active: Category[], ignoreId?: string): CategoryInput {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Enter a category name.');
  if (name.length > 40) throw new ValidationError('The name must be at most 40 characters.');
  if (!HEX_COLOR_RE.test(input.color)) throw new ValidationError('Invalid color. Use the #RRGGBB format.');
  if (input.type !== 'EXPENSE' && input.type !== 'INCOME') throw new ValidationError('Invalid type.');
  // Soft-deleted categories free their name for reuse.
  const duplicate = active.some(
    (c) => c.id !== ignoreId && c.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  if (duplicate) throw new ValidationError('A category with this name already exists.');
  return { name, color: input.color.toLowerCase(), type: input.type };
}

export const categoryService = {
  /** GET /api/v1/categories — active records only. */
  list(): Promise<Category[]> {
    return resolveAsync(() => loadAll().filter(isActive));
  },

  /** POST /api/v1/categories */
  create(input: CategoryInput): Promise<Category> {
    return resolveAsync(() => {
      const all = loadAll();
      const created: Category = { ...validate(input, all.filter(isActive)), id: generateId(), ...createdMeta() };
      writeCollection(STORAGE_KEYS.categories, [...all, created]);
      return created;
    });
  },

  /** PUT /api/v1/categories/{id} */
  async update(id: string, input: CategoryInput): Promise<Category> {
    const all = loadAll();
    const current = all.find((c) => c.id === id && isActive(c));
    if (!current) throw new NotFoundError('Category not found.');
    const data = validate(input, all.filter(isActive), id);

    // Integrity: do not allow a type change that would leave active transactions incompatible.
    if (data.type !== current.type) {
      const linked = await transactionService.countByCategory(id);
      const incompatible = linked.byType[data.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE'];
      if (incompatible > 0) {
        throw new IntegrityError(
          `Cannot change the type: ${incompatible} ${
            data.type === 'EXPENSE' ? 'income' : 'expense'
          } transaction(s) use this category.`,
        );
      }
    }

    const updated = touch({ ...current, ...data });
    writeCollection(
      STORAGE_KEYS.categories,
      all.map((c) => (c.id === id ? updated : c)),
    );
    return updated;
  },

  /**
   * DELETE /api/v1/categories/{id} — soft delete. 409 if ACTIVE transactions
   * are linked to it (soft-deleted transactions do not block the deletion).
   */
  async remove(id: string): Promise<void> {
    const all = loadAll();
    if (!all.some((c) => c.id === id && isActive(c))) throw new NotFoundError('Category not found.');
    const { total } = await transactionService.countByCategory(id);
    if (total > 0) {
      throw new IntegrityError(
        `This category has ${total} linked transaction(s) and cannot be deleted. ` +
          'Reassign or delete those transactions first.',
      );
    }
    writeCollection(
      STORAGE_KEYS.categories,
      all.map((c) => (c.id === id ? tombstone(c) : c)),
    );
  },
};
