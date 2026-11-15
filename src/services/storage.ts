/**
 * Adaptador de persistência local. É o ÚNICO ponto do app que toca o
 * `localStorage`. Na Fase 2 este arquivo deixa de ser usado e os services
 * passam a usar `httpClient` (fetch/axios) contra a API Spring Boot.
 */

const PREFIX = 'fluxo:v1:';

export const STORAGE_KEYS = {
  categories: 'categories',
  transactions: 'transactions',
  goals: 'goals',
  defaultGoals: 'defaultGoals',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function readCollection<T>(key: StorageKey): T[] | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function writeCollection<T>(key: StorageKey, items: T[]): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(items));
}

/** Gera UUID v4 (equivalente ao UUID gerado pelo backend na Fase 2). */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Simula a natureza assíncrona de uma chamada HTTP. */
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
