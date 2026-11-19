import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import type { MonthSummary } from '../types/finance';
import type { ResolvedGoal } from '../services';
import { useCurrency } from '../../../shared/hooks/useCurrency';
import { GoalCard } from './GoalCard';

interface SummaryCardsProps {
  summary: MonthSummary;
  goal: ResolvedGoal;
  incomeCount: number;
  expenseCount: number;
  onSaveGoal: (amount: number, applyToFuture: boolean) => Promise<unknown>;
}

function StatCard({
  label,
  value,
  icon,
  tone,
  footer,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: 'emerald' | 'rose' | 'slate' | 'neg';
  footer: ReactNode;
}) {
  const toneMap = {
    emerald: { icon: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', value: 'text-emerald-400' },
    rose: { icon: 'bg-rose-500/10 text-rose-400 ring-rose-500/20', value: 'text-rose-400' },
    slate: { icon: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20', value: 'text-slate-50' },
    neg: { icon: 'bg-rose-500/10 text-rose-400 ring-rose-500/20', value: 'text-rose-400' },
  }[tone];

  return (
    <div className="card flex flex-col p-4 transition hover:border-slate-700 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-lg ring-1 ${toneMap.icon}`}>{icon}</span>
      </div>
      <p className={`money mt-3 truncate text-2xl font-semibold sm:text-[1.75rem] ${toneMap.value}`} title={value}>
        {value}
      </p>
      <div className="mt-auto pt-2 text-xs text-slate-500">{footer}</div>
    </div>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function SummaryCards({ summary, goal, incomeCount, expenseCount, onSaveGoal }: SummaryCardsProps) {
  const { format } = useCurrency();
  const savingsRate = summary.income > 0 ? (summary.balance / summary.income) * 100 : null;

  return (
    <section aria-label="Monthly summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Monthly income"
        value={format(summary.income)}
        tone="emerald"
        icon={<ArrowUpRight className="size-4" />}
        footer={plural(incomeCount, 'transaction', 'transactions')}
      />
      <StatCard
        label="Monthly expenses"
        value={format(summary.expense)}
        tone="rose"
        icon={<ArrowDownRight className="size-4" />}
        footer={plural(expenseCount, 'transaction', 'transactions')}
      />
      <StatCard
        label="Monthly balance"
        value={format(summary.balance)}
        tone={summary.balance < 0 ? 'neg' : 'slate'}
        icon={<Scale className="size-4" />}
        footer={
          savingsRate === null ? (
            'No income this month'
          ) : (
            <span>
              <span className={`money ${savingsRate >= 0 ? 'text-slate-300' : 'text-rose-400'}`}>
                {savingsRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}%
              </span>{' '}
              of income {savingsRate >= 0 ? 'kept' : 'in deficit'}
            </span>
          )
        }
      />
      <GoalCard summary={summary} goal={goal} onSave={onSaveGoal} />
    </section>
  );
}
