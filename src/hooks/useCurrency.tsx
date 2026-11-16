import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { settingsService } from '../services/settingsService';
import { DEFAULT_CURRENCY, currencySymbol, getCurrency } from '../utils/currency';
import type { CurrencyCode, CurrencyConfig } from '../utils/currency';
import { createMoneyFormatter } from '../utils/money';
import type { MoneyFormatter } from '../utils/money';

interface CurrencyContextValue extends MoneyFormatter {
  currency: CurrencyConfig;
  symbol: string;
  setCurrency: (code: CurrencyCode) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    void settingsService.get().then((s) => setCode(s.currency));
  }, []);

  const setCurrency = useCallback(async (next: CurrencyCode) => {
    const saved = await settingsService.update({ currency: next });
    setCode(saved.currency);
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const currency = getCurrency(code);
    return { currency, symbol: currencySymbol(currency), setCurrency, ...createMoneyFormatter(currency) };
  }, [code, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside <CurrencyProvider>.');
  return ctx;
}
