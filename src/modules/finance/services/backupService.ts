import type { Category, DefaultGoal, MonthlyGoal, Transaction } from '../types/finance';
import { ValidationError } from '../../../shared/services/errors';
import { settingsService } from '../../../shared/services/settingsService';
import { STORAGE_KEYS, nowISO, readCollection, writeCollection } from '../../../shared/services/storage';
import type { StorageKey } from '../../../shared/services/storage';
import { isActive, normalizeMeta, tombstone } from '../../../shared/services/syncMeta';
import type { SyncMeta } from '../../../shared/services/syncMeta';
import { isCurrencyCode } from '../../../shared/utils/currency';
import type { CurrencyCode } from '../../../shared/utils/currency';
import { roundMoney } from '../../../shared/utils/money';
import { categoryService, HEX_COLOR_RE } from './categoryService';
import { goalService, MONTH_KEY_RE } from './goalService';
import { transactionService } from './transactionService';

/**
 * Local backup / restore (data portability).
 *
 * The payload is versioned so future releases can migrate older files. Only
 * ACTIVE records are exported; tombstones are internal sync state.
 */

export const BACKUP_FORMAT = 'fluxo-finance-backup';
export const BACKUP_VERSION = 1;

export interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: {
    categories: Category[];
    transactions: Transaction[];
    goals: MonthlyGoal[];
    defaultGoals: DefaultGoal[];
    settings: { currency: CurrencyCode };
  };
}

export interface ImportResult {
  categories: number;
  transactions: number;
  goals: number;
  defaultGoals: number;
  currency: CurrencyCode;
}

// ---- Validation helpers ------------------------------------------------------

type Obj = Record<string, unknown>;

const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTimestamp = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

function fail(where: string, problem: string): never {
  throw new ValidationError(`Invalid backup file: ${where} ${problem}.`);
}

function str(o: Obj, key: string, where: string, maxLen?: number): string {
  const v = o[key];
  if (typeof v !== 'string' || !v.trim()) fail(where, `is missing "${key}"`);
  if (maxLen !== undefined && v.trim().length > maxLen) fail(where, `has a "${key}" longer than ${maxLen} characters`);
  return v.trim();
}

function amount(o: Obj, key: string, where: string, allowZero: boolean): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(where, `has a non-numeric "${key}"`);
  const rounded = roundMoney(v);
  if (rounded < 0 || (!allowZero && rounded === 0)) fail(where, `has an invalid "${key}" (${v})`);
  return rounded;
}

function flowType(o: Obj, where: string): 'EXPENSE' | 'INCOME' {
  const v = o.type;
  if (v !== 'EXPENSE' && v !== 'INCOME') fail(where, 'has an invalid "type" (expected EXPENSE or INCOME)');
  return v;
}

/** Optional timestamps are accepted when valid; missing ones default to `at`. */
function meta(o: Obj, where: string, at: string): Pick<SyncMeta, 'createdAt'> {
  if (o.createdAt !== undefined && !isTimestamp(o.createdAt)) fail(where, 'has an invalid "createdAt"');
  return { createdAt: isTimestamp(o.createdAt) ? o.createdAt : at };
}

function list(data: Obj, key: string): unknown[] {
  const v = data[key];
  if (v === undefined) return [];
  if (!Array.isArray(v)) fail(`"${key}"`, 'is not a list');
  return v;
}

/** Parses and validates a backup. Throws ValidationError on any problem; never touches storage. */
function parseBackup(rawJson: string, at: string): BackupPayload['data'] {
  let root: unknown;
  try {
    root = JSON.parse(rawJson);
  } catch {
    throw new ValidationError('Invalid backup file: it is not valid JSON.');
  }
  if (!isObj(root) || root.format !== BACKUP_FORMAT) {
    throw new ValidationError('Invalid backup file: this is not a Fluxo finance backup.');
  }
  if (typeof root.version !== 'number' || root.version > BACKUP_VERSION) {
    throw new ValidationError('This backup was made by a newer version of Fluxo and cannot be imported.');
  }
  if (!isObj(root.data)) fail('the file', 'has no "data" section');
  const data = root.data;

  // Categories
  const categoryIds = new Set<string>();
  const categoryNames = new Set<string>();
  const categories: Category[] = list(data, 'categories').map((raw, i) => {
    const where = `category #${i + 1}`;
    if (!isObj(raw)) fail(where, 'is not an object');
    const id = str(raw, 'id', where);
    if (categoryIds.has(id)) fail(where, `has a duplicate id "${id}"`);
    categoryIds.add(id);
    const name = str(raw, 'name', where, 40);
    const lower = name.toLocaleLowerCase();
    if (categoryNames.has(lower)) fail(where, `has a duplicate name "${name}"`);
    categoryNames.add(lower);
    const color = str(raw, 'color', where);
    if (!HEX_COLOR_RE.test(color)) fail(where, `has an invalid color "${color}"`);
    return { id, name, color: color.toLowerCase(), type: flowType(raw, where), ...meta(raw, where, at), updatedAt: at, deletedAt: null };
  });

  // Transactions (FK integrity against the backup's own categories)
  const txIds = new Set<string>();
  const transactions: Transaction[] = list(data, 'transactions').map((raw, i) => {
    const where = `transaction #${i + 1}`;
    if (!isObj(raw)) fail(where, 'is not an object');
    const id = str(raw, 'id', where);
    if (txIds.has(id)) fail(where, `has a duplicate id "${id}"`);
    txIds.add(id);
    const categoryId = str(raw, 'categoryId', where);
    if (!categoryIds.has(categoryId)) fail(where, `references a category that is not in the backup ("${categoryId}")`);
    const date = str(raw, 'date', where);
    if (!ISO_DATE_RE.test(date)) fail(where, `has an invalid date "${date}"`);
    return {
      id,
      type: flowType(raw, where),
      amount: amount(raw, 'amount', where, false),
      description: str(raw, 'description', where, 120),
      categoryId,
      date,
      ...meta(raw, where, at),
      updatedAt: at,
      deletedAt: null,
    };
  });

  // Monthly goals
  const goalMonths = new Set<string>();
  const goals: MonthlyGoal[] = list(data, 'goals').map((raw, i) => {
    const where = `goal #${i + 1}`;
    if (!isObj(raw)) fail(where, 'is not an object');
    const monthKey = str(raw, 'monthKey', where);
    if (!MONTH_KEY_RE.test(monthKey)) fail(where, `has an invalid month "${monthKey}"`);
    if (goalMonths.has(monthKey)) fail(where, `duplicates month "${monthKey}"`);
    goalMonths.add(monthKey);
    return { monthKey, targetAmount: amount(raw, 'targetAmount', where, true), ...meta(raw, where, at), updatedAt: at, deletedAt: null };
  });

  // Default goals
  const defaultMonths = new Set<string>();
  const defaultGoals: DefaultGoal[] = list(data, 'defaultGoals').map((raw, i) => {
    const where = `default goal #${i + 1}`;
    if (!isObj(raw)) fail(where, 'is not an object');
    const effectiveFrom = str(raw, 'effectiveFrom', where);
    if (!MONTH_KEY_RE.test(effectiveFrom)) fail(where, `has an invalid month "${effectiveFrom}"`);
    if (defaultMonths.has(effectiveFrom)) fail(where, `duplicates month "${effectiveFrom}"`);
    defaultMonths.add(effectiveFrom);
    return { effectiveFrom, targetAmount: amount(raw, 'targetAmount', where, true), ...meta(raw, where, at), updatedAt: at, deletedAt: null };
  });

  // Settings
  const settings = isObj(data.settings) ? data.settings : {};
  if (!isCurrencyCode(settings.currency)) fail('settings', 'have a missing or unsupported currency');

  return { categories, transactions, goals, defaultGoals, settings: { currency: settings.currency } };
}

/**
 * Replaces a collection with the imported rows, keeping sync semantics:
 * local rows absent from the import are tombstoned (not erased) so a future
 * sync propagates the overwrite as deletions.
 */
function replaceCollection<T extends SyncMeta>(key: StorageKey, incoming: T[], idOf: (r: T) => string, at: string): void {
  const { records: current } = normalizeMeta(readCollection<T>(key) ?? []);
  const incomingIds = new Set(incoming.map(idOf));
  const retired = current
    .filter((r) => !incomingIds.has(idOf(r)))
    .map((r) => (isActive(r) ? tombstone(r, at) : r));
  const kept = new Map(current.map((r) => [idOf(r), r]));
  const merged = incoming.map((r) => {
    const prev = kept.get(idOf(r));
    // Preserve the original creation time when the record already existed locally.
    return prev ? { ...r, createdAt: prev.createdAt } : r;
  });
  writeCollection(key, [...retired, ...merged]);
}

export const backupService = {
  /** Builds a versioned JSON-serializable snapshot of all active finance data. */
  async exportBackup(): Promise<BackupPayload> {
    const [categories, transactions, goals, defaultGoals, settings] = await Promise.all([
      categoryService.list(),
      transactionService.list(),
      goalService.listGoals(),
      goalService.listDefaults(),
      settingsService.get(),
    ]);
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: nowISO(),
      data: { categories, transactions, goals, defaultGoals, settings: { currency: settings.currency } },
    };
  },

  /** Validates a backup without importing it; returns what it contains. Throws ValidationError. */
  async inspectBackup(rawJson: string): Promise<ImportResult> {
    const data = parseBackup(rawJson, nowISO());
    return {
      categories: data.categories.length,
      transactions: data.transactions.length,
      goals: data.goals.length,
      defaultGoals: data.defaultGoals.length,
      currency: data.settings.currency,
    };
  },

  /**
   * Validates a backup file and, only if it is entirely valid, overwrites the
   * local finance data and currency setting with it. Throws ValidationError on
   * malformed files without changing anything.
   */
  async importBackup(rawJson: string): Promise<ImportResult> {
    const at = nowISO();
    const data = parseBackup(rawJson, at);
    replaceCollection(STORAGE_KEYS.categories, data.categories, (c) => c.id, at);
    replaceCollection(STORAGE_KEYS.transactions, data.transactions, (t) => t.id, at);
    replaceCollection(STORAGE_KEYS.goals, data.goals, (g) => g.monthKey, at);
    replaceCollection(STORAGE_KEYS.defaultGoals, data.defaultGoals, (d) => d.effectiveFrom, at);
    await settingsService.update({ currency: data.settings.currency });
    return {
      categories: data.categories.length,
      transactions: data.transactions.length,
      goals: data.goals.length,
      defaultGoals: data.defaultGoals.length,
      currency: data.settings.currency,
    };
  },

  /** Suggested download name, e.g. "fluxo-backup-2026-11-16.json" (local date). */
  fileName(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `fluxo-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
  },
};
