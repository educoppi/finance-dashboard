import { DEFAULT_CURRENCY, isCurrencyCode } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import { ValidationError } from './errors';
import { STORAGE_KEYS, readCollection, readRecord, resolveAsync, writeRecord } from './storage';

/** Future REST contract: /api/v1/settings (one row per user in Phase 2). */

export interface UserSettings {
  currency: CurrencyCode;
}

const DEFAULTS: UserSettings = { currency: DEFAULT_CURRENCY };

function load(): UserSettings {
  const stored = readRecord<Partial<UserSettings>>(STORAGE_KEYS.settings);
  if (stored === null) {
    // Legacy migration: Phase 1 data was recorded in Brazilian Real before the
    // currency setting existed, so keep existing users on BRL.
    const hasLegacyData = (readCollection<unknown>(STORAGE_KEYS.transactions)?.length ?? 0) > 0;
    const initial: UserSettings = { currency: hasLegacyData ? 'BRL' : DEFAULTS.currency };
    writeRecord(STORAGE_KEYS.settings, initial);
    return initial;
  }
  return {
    currency: isCurrencyCode(stored.currency) ? stored.currency : DEFAULTS.currency,
  };
}

export const settingsService = {
  /** GET /api/v1/settings */
  get(): Promise<UserSettings> {
    return resolveAsync(load);
  },

  /** PATCH /api/v1/settings */
  update(patch: Partial<UserSettings>): Promise<UserSettings> {
    return resolveAsync(() => {
      if (patch.currency !== undefined && !isCurrencyCode(patch.currency)) {
        throw new ValidationError('Unsupported currency.');
      }
      const next = { ...load(), ...patch };
      writeRecord(STORAGE_KEYS.settings, next);
      return next;
    });
  },
};
