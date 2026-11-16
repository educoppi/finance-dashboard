/**
 * Local persistence adapter. This is the ONLY module in the app that touches
 * `localStorage`. In Phase 2 it goes away and the services call the
 * Spring Boot API through an HTTP client (fetch/axios) instead.
 */

const PREFIX = 'fluxo:v1:';

export const STORAGE_KEYS = {
  categories: 'categories',
  transactions: 'transactions',
  goals: 'goals',
  defaultGoals: 'defaultGoals',
  settings: 'settings',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function readJSON(key: StorageKey): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function readCollection<T>(key: StorageKey): T[] | null {
  const parsed = readJSON(key);
  return Array.isArray(parsed) ? (parsed as T[]) : null;
}

export function writeCollection<T>(key: StorageKey, items: T[]): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(items));
}

export function readRecord<T extends object>(key: StorageKey): T | null {
  const parsed = readJSON(key);
  return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : null;
}

export function writeRecord<T extends object>(key: StorageKey, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
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
