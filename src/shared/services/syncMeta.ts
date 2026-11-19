import { nowISO } from './storage';

/**
 * Sync metadata shared by every persisted entity, in any module.
 * All values are ISO-8601 UTC timestamps.
 *
 * - `updatedAt` drives future "changed since <cursor>" delta queries and
 *   last-write-wins conflict resolution.
 * - `deletedAt` is a tombstone: soft-deleted records stay in storage so the
 *   deletion can be propagated to the server instead of silently vanishing.
 */
export interface SyncMeta {
  createdAt: string;
  updatedAt: string;
  /** Tombstone: set when the record is soft-deleted; `null` while active. */
  deletedAt?: string | null;
}

export const SYNC_META_KEYS = ['createdAt', 'updatedAt', 'deletedAt'] as const;

/** True while the record has not been soft-deleted. */
export function isActive(record: Pick<SyncMeta, 'deletedAt'>): boolean {
  return record.deletedAt == null;
}

/** Metadata for a brand-new record. */
export function createdMeta(at: string = nowISO()): Required<SyncMeta> {
  return { createdAt: at, updatedAt: at, deletedAt: null };
}

/** Marks a record as changed now. */
export function touch<T extends SyncMeta>(record: T, at: string = nowISO()): T {
  return { ...record, updatedAt: at };
}

/** Soft-deletes a record (tombstone). */
export function tombstone<T extends SyncMeta>(record: T, at: string = nowISO()): T {
  return { ...record, deletedAt: at, updatedAt: at };
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Backward compatibility for records written before sync metadata existed:
 * `createdAt` falls back to `updatedAt`, then to now; `updatedAt` falls back to
 * `createdAt`; a missing `deletedAt` becomes `null`. Returns whether anything
 * changed so callers can persist the normalized form once (keeping the
 * fallback timestamp stable across reads).
 */
export function normalizeMeta<T extends Partial<SyncMeta>>(
  records: T[],
  at: string = nowISO(),
): { records: (T & Required<SyncMeta>)[]; changed: boolean } {
  let changed = false;
  const out = records.map((r) => {
    const createdAt = isNonEmptyString(r.createdAt) ? r.createdAt : isNonEmptyString(r.updatedAt) ? r.updatedAt : at;
    const updatedAt = isNonEmptyString(r.updatedAt) ? r.updatedAt : createdAt;
    const deletedAt = isNonEmptyString(r.deletedAt) ? r.deletedAt : null;
    if (createdAt !== r.createdAt || updatedAt !== r.updatedAt || deletedAt !== r.deletedAt) changed = true;
    return { ...r, createdAt, updatedAt, deletedAt };
  });
  return { records: out, changed };
}
