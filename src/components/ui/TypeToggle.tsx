import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { TransactionType } from '../../types/finance';

interface TypeToggleProps {
  value: TransactionType;
  onChange: (t: TransactionType) => void;
}

export function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Transaction type" className="flex h-10 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'EXPENSE'}
        onClick={() => onChange('EXPENSE')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition ${
          value === 'EXPENSE' ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <ArrowDownRight className="size-4" />
        Expense
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'INCOME'}
        onClick={() => onChange('INCOME')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition ${
          value === 'INCOME'
            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <ArrowUpRight className="size-4" />
        Income
      </button>
    </div>
  );
}
