import type { Category, CategoryInput, Transaction } from '../types/finance';
import { IntegrityError, NotFoundError, ValidationError } from './errors';
import { STORAGE_KEYS, generateId, readCollection, resolveAsync, writeCollection } from './storage';
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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Migration: the legacy "BOTH" category type no longer exists. A former BOTH
 * category becomes INCOME if only income transactions use it, otherwise EXPENSE.
 */
function migrateLegacyBoth(stored: Category[]): Category[] {
  const legacy = stored.filter((c) => (c.type as string) === 'BOTH');
  if (legacy.length === 0) return stored;
  const txs = readCollection<Pick<Transaction, 'categoryId' | 'type'>>(STORAGE_KEYS.transactions) ?? [];
  const migrated = stored.map((c) => {
    if ((c.type as string) !== 'BOTH') return c;
    const linked = txs.filter((t) => t.categoryId === c.id);
    const onlyIncome = linked.length > 0 && linked.every((t) => t.type === 'INCOME');
    return { ...c, type: onlyIncome ? 'INCOME' : 'EXPENSE' } satisfies Category;
  });
  writeCollection(STORAGE_KEYS.categories, migrated);
  return migrated;
}

function load(): Category[] {
  const stored = readCollection<Category>(STORAGE_KEYS.categories);
  if (stored !== null) return migrateLegacyBoth(stored);
  // Seed on first access (equivalent to a Flyway migration with initial data).
  const seeded = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: generateId() }));
  writeCollection(STORAGE_KEYS.categories, seeded);
  return seeded;
}

function validate(input: CategoryInput, all: Category[], ignoreId?: string): CategoryInput {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Enter a category name.');
  if (name.length > 40) throw new ValidationError('The name must be at most 40 characters.');
  if (!HEX_RE.test(input.color)) throw new ValidationError('Invalid color. Use the #RRGGBB format.');
  const duplicate = all.some(
    (c) => c.id !== ignoreId && c.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  if (duplicate) throw new ValidationError('A category with this name already exists.');
  return { name, color: input.color.toLowerCase(), type: input.type };
}

export const categoryService = {
  /** GET /api/v1/categories */
  list(): Promise<Category[]> {
    return resolveAsync(() => load());
  },

  /** POST /api/v1/categories */
  create(input: CategoryInput): Promise<Category> {
    return resolveAsync(() => {
      const all = load();
      const created: Category = { ...validate(input, all), id: generateId() };
      writeCollection(STORAGE_KEYS.categories, [...all, created]);
      return created;
    });
  },

  /** PUT /api/v1/categories/{id} */
  async update(id: string, input: CategoryInput): Promise<Category> {
    const all = load();
    const current = all.find((c) => c.id === id);
    if (!current) throw new NotFoundError('Category not found.');
    const data = validate(input, all, id);

    // Integrity: do not allow a type change that would leave transactions incompatible.
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

    const updated: Category = { ...current, ...data };
    writeCollection(
      STORAGE_KEYS.categories,
      all.map((c) => (c.id === id ? updated : c)),
    );
    return updated;
  },

  /** DELETE /api/v1/categories/{id} — 409 if transactions are linked to it. */
  async remove(id: string): Promise<void> {
    const all = load();
    if (!all.some((c) => c.id === id)) throw new NotFoundError('Category not found.');
    const { total } = await transactionService.countByCategory(id);
    if (total > 0) {
      throw new IntegrityError(
        `This category has ${total} linked transaction(s) and cannot be deleted. ` +
          'Reassign or delete those transactions first.',
      );
    }
    writeCollection(
      STORAGE_KEYS.categories,
      all.filter((c) => c.id !== id),
    );
  },
};
