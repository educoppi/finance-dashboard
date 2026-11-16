import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Coins, Tags, Wallet } from 'lucide-react';
import { formatMonthLabel, getCurrentMonthKey, shiftMonthKey } from '../utils/date';
import { CURRENCIES, currencySymbol, isCurrencyCode } from '../utils/currency';
import { useCurrency } from '../hooks/useCurrency';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services';

interface HeaderProps {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  onOpenCategories: () => void;
}

const CURRENCY_LIST = Object.values(CURRENCIES);

function CurrencyPicker() {
  const { currency, setCurrency } = useCurrency();
  const toast = useToast();

  const onChange = async (value: string) => {
    if (!isCurrencyCode(value) || value === currency.code) return;
    try {
      await setCurrency(value);
      toast.success(`Currency set to ${CURRENCIES[value].name}. Amounts are shown as-is (no conversion).`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <label className="relative flex h-9 items-center rounded-lg border border-slate-800 bg-slate-900 text-sm text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-400/60">
      <Coins className="pointer-events-none absolute left-2.5 size-4 text-slate-400" />
      <span className="sr-only">Currency</span>
      <select
        value={currency.code}
        onChange={(e) => void onChange(e.target.value)}
        title="Currency"
        className="h-full cursor-pointer appearance-none rounded-lg bg-transparent pr-7 pl-8 font-medium text-slate-200 outline-none"
      >
        {CURRENCY_LIST.map((c) => (
          <option key={c.code} value={c.code} className="bg-slate-900">
            {c.code} ({currencySymbol(c)}) — {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-slate-500" />
    </label>
  );
}

export function Header({ monthKey, onMonthChange, onOpenCategories }: HeaderProps) {
  const current = getCurrentMonthKey();
  const isCurrent = monthKey === current;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Wallet className="size-4 text-white" />
          </div>
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-semibold text-slate-100">Fluxo</p>
            <p className="text-[11px] text-slate-500">Personal finance</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!isCurrent && (
            <button
              type="button"
              onClick={() => onMonthChange(current)}
              className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/10 md:inline-flex"
            >
              <CalendarDays className="size-3.5" />
              This month
            </button>
          )}

          <div className="flex h-9 items-center rounded-lg border border-slate-800 bg-slate-900">
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonthKey(monthKey, -1))}
              className="flex h-full w-8 items-center justify-center rounded-l-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 sm:w-9"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(current)}
              title="Go to the current month"
              className="min-w-[7.5rem] px-1 text-center text-sm font-medium text-slate-100 tabular-nums sm:min-w-[9.5rem] sm:px-2"
              aria-live="polite"
            >
              {formatMonthLabel(monthKey)}
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonthKey(monthKey, 1))}
              className="flex h-full w-8 items-center justify-center rounded-r-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 sm:w-9"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="hidden sm:block">
            <CurrencyPicker />
          </div>

          <button type="button" onClick={onOpenCategories} className="btn-ghost h-9" aria-label="Categories">
            <Tags className="size-4" />
            <span className="hidden md:inline">Categories</span>
          </button>
        </div>
      </div>
      {/* On phones the currency picker gets its own row */}
      <div className="flex justify-end border-t border-slate-800/60 px-4 py-2 sm:hidden">
        <CurrencyPicker />
      </div>
    </header>
  );
}
