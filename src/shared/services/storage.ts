/**
 * Local persistence adapter. This is the ONLY module in the app that touches
 * `localStorage`. In Phase 2 it goes away and the services call the
 * Spring Boot API through an HTTP client (fetch/axios) instead.
 *
 * Keys are namespaced per module (`fluxo:<module>:<collection>`) so other
 * modules of a future Personal Organization suite can live on the same origin
 * without collisions.
 */

export const STORAGE_KEYS = {
  categories: 'fluxo:finance:categories',
  transactions: 'fluxo:finance:transactions',
  goals: 'fluxo:finance:goals',
  defaultGoals: 'fluxo:finance:default_goals',
  settings: 'fluxo:shared:settings',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Phase 1 keys → namespaced keys. Only the app's own `fluxo:v1:` keys are
 * migrated: bare keys like `transactions` are never touched, because a GitHub
 * Pages origin is shared with every other project of the same account.
 */
const LEGACY_KEYS: Record<StorageKey, string> = {
  [STORAGE_KEYS.categories]: 'fluxo:v1:categories',
  [STORAGE_KEYS.transactions]: 'fluxo:v1:transactions',
  [STORAGE_KEYS.goals]: 'fluxo:v1:goals',
  [STORAGE_KEYS.defaultGoals]: 'fluxo:v1:defaultGoals',
  [STORAGE_KEYS.settings]: 'fluxo:v1:settings',
};

let migrated = false;

/**
 * One-time, idempotent key migration. For each collection: if the namespaced
 * key is still empty and the legacy key has data, copy it over; then drop the
 * legacy key. Running it again is a no-op.
 */
export function migrateLegacyKeys(): void {
  if (migrated) return;
  migrated = true;
  try {
    for (const [key, legacy] of Object.entries(LEGACY_KEYS)) {
      const old = localStorage.getItem(legacy);
      if (old === null) continue;
      if (localStorage.getItem(key) === null) localStorage.setItem(key, old);
      localStorage.removeItem(legacy);
    }
  } catch {
    // Storage unavailable (private mode, quota): nothing to migrate.
  }
}

function readJSON(key: StorageKey): unknown {
  migrateLegacyKeys();
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeJSON(key: StorageKey, value: unknown): void {
  migrateLegacyKeys();
  localStorage.setItem(key, JSON.stringify(value));
}

export function readCollection<T>(key: StorageKey): T[] | null {
  const parsed = readJSON(key);
  return Array.isArray(parsed) ? (parsed as T[]) : null;
}

export function writeCollection<T>(key: StorageKey, items: T[]): void {
  writeJSON(key, items);
}

export function readRecord<T extends object>(key: StorageKey): T | null {
  const parsed = readJSON(key);
  return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : null;
}

export function writeRecord<T extends object>(key: StorageKey, value: T): void {
  writeJSON(key, value);
}

/** Generates a v4 UUID (equivalent to the backend-generated UUID in Phase 2). */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Current instant as an ISO-8601 UTC timestamp (sync metadata is absolute time). */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Mimics the asynchronous nature of an HTTP call. */
export function resolveAsync<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    queueMicrotask(() => {
      try {
        resolve(fn());
      } catch (err) {
        reject(err);
      }
    });
  });
}
