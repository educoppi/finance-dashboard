import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Check, CircleSlash, Pencil, PiggyBank, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import type { GoalStatus, MonthSummary } from '../types/finance';
import type { ResolvedGoal } from '../services';
import { getErrorMessage } from '../services';
import { useToast } from '../hooks/useToast';
import { useCurrency } from '../hooks/useCurrency';
import { CurrencyInput } from './ui/CurrencyInput';

interface GoalCardProps {
  summary: MonthSummary;
  goal: ResolvedGoal;
  onSave: (amount: number, applyToFuture: boolean) => Promise<unknown>;
}

const STATUS_STYLE: Record<
  GoalStatus,
  { ring: string; bg: string; bar: string; text: string; chip: string; label: string }
> = {
  NEUTRAL: {
    ring: 'border-slate-700',
    bg: 'from-slate-800/40',
    bar: 'bg-slate-600',
    text: 'text-slate-300',
    chip: 'bg-slate-800 text-slate-300 ring-slate-700',
    label: 'Waiting for income',
  },
  ON_TRACK: {
    ring: 'border-emerald-500/40',
    bg: 'from-emerald-500/10',
    bar: 'bg-emerald-500',
    text: 'text-emerald-300',
    chip: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    label: 'On track',
  },
  WARNING: {
    ring: 'border-amber-500/40',
    bg: 'from-amber-500/10',
    bar: 'bg-amber-500',
    text: 'text-amber-300',
    chip: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    label: 'Heads up',
  },
  EXCEEDED: {
    ring: 'border-rose-500/50',
    bg: 'from-rose-500/10',
    bar: 'bg-rose-500',
    text: 'text-rose-300',
    chip: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
    label: 'Goal at risk',
  },
};

function StatusIcon({ status }: { status: GoalStatus }) {
  const cls = 'size-4 shrink-0';
  switch (status) {
    case 'ON_TRACK':
      return <ShieldCheck className={`${cls} text-emerald-400`} />;
    case 'WARNING':
      return <AlertTriangle className={`${cls} text-amber-400`} />;
    case 'EXCEEDED':
      return <ShieldAlert className={`${cls} text-rose-400`} />;
    default:
      return <CircleSlash className={`${cls} text-slate-400`} />;
  }
}

function Money({ v }: { v: number }) {
  const { format } = useCurrency();
  return <strong className="money font-semibold text-slate-50">{format(v)}</strong>;
}

function StatusMessage({ summary }: { summary: MonthSummary }) {
  const { status, freeMargin, goal, income, spendingCap } = summary;
  switch (status) {
    case 'NEUTRAL':
      return <>Add this month's income to calculate your spending cap and track your goal.</>;
    case 'ON_TRACK':
      return (
        <>
          Goal protected! You can still spend <Money v={freeMargin} /> this month.
        </>
      );
    case 'WARNING':
      return goal > 0 ? (
        <>
          Heads up: only <Money v={freeMargin} /> left before your <Money v={goal} /> goal is affected.
        </>
      ) : (
        <>
          Heads up: only <Money v={freeMargin} /> left before you run out of income.
        </>
      );
    case 'EXCEEDED':
      if (goal <= 0) {
        return (
          <>
            Spending is above income! You are <Money v={Math.abs(freeMargin)} /> in the red this month.
          </>
        );
      }
      if (spendingCap < 0 && summary.expense === 0) {
        return (
          <>
            Your <Money v={goal} /> goal is higher than this month's income (<Money v={income} />). You need{' '}
            <Money v={Math.abs(freeMargin)} /> more to cover it.
          </>
        );
      }
      return (
        <>
          Goal exceeded! You have already used <Money v={Math.min(Math.abs(freeMargin), goal)} /> of the amount set aside
          for your <Money v={goal} /> goal
          {Math.abs(freeMargin) > goal && (
            <>
              {' '}
              and are <Money v={Math.abs(freeMargin) - goal} /> in the red
            </>
          )}
          .
        </>
      );
  }
}

/**
 * Bar scaled to the month's income: the fill is expenses; the hatched end is
 * the goal reserve. The vertical marker is the spending cap.
 */
function GoalBar({ summary }: { summary: MonthSummary }) {
  const { format } = useCurrency();
  const { income, expense, goal, status } = summary;
  const style = STATUS_STYLE[status];
  if (income <= 0) {
    return <div className="h-2 rounded-full bg-slate-800" />;
  }
  const spentPct = Math.min(100, (expense / income) * 100);
  const reservePct = Math.min(100, (goal / income) * 100);
  const capPct = 100 - reservePct;
  const capUsedPct = summary.spendingCap > 0 ? (expense / summary.spendingCap) * 100 : expense > 0 ? Infinity : 0;

  return (
    <div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label="Expenses relative to income"
        aria-valuenow={Math.round(spentPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {reservePct > 0 && (
          <div
            className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,rgb(148_163_184/0.25)_0_3px,transparent_3px_6px)]"
            style={{ width: `${reservePct}%` }}
          />
        )}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${style.bar}`}
          style={{ width: `${spentPct}%` }}
        />
        {reservePct > 0 && reservePct < 100 && (
          <div className="absolute inset-y-0 w-0.5 bg-slate-200/80" style={{ left: `calc(${capPct}% - 1px)` }} />
        )}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-slate-500">
        <span>
          {Number.isFinite(capUsedPct) ? (
            <>
              <span className="money text-slate-300">{Math.round(capUsedPct)}%</span> of cap used
            </>
          ) : (
            'Cap fully taken by goal'
          )}
        </span>
        <span className="truncate">
          Cap <span className="money text-slate-300">{format(summary.spendingCap)}</span>
        </span>
      </div>
    </div>
  );
}

export function GoalCard({ summary, goal, onSave }: GoalCardProps) {
  const toast = useToast();
  const { format, parse, toInput } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [applyFuture, setApplyFuture] = useState(true);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const style = STATUS_STYLE[summary.status];

  useEffect(() => {
    setEditing(false);
  }, [goal.monthKey]);

  const startEdit = () => {
    setValue(goal.targetAmount > 0 ? toInput(goal.targetAmount) : '');
    setApplyFuture(goal.source !== 'MONTH');
    setEditing(true);
    window.setTimeout(() => inputRef.current?.select(), 0);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(parse(value), applyFuture);
      setEditing(false);
      toast.success(applyFuture ? 'Goal saved and applied to future months.' : 'Goal saved for this month.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border bg-gradient-to-br to-slate-900/90 to-60% p-4 shadow-sm shadow-black/20 transition sm:p-5 ${style.ring} ${style.bg}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <PiggyBank className="size-4 text-indigo-300" />
          Savings goal
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${style.chip}`}>{style.label}</span>
      </div>

      {editing ? (
        <form onSubmit={submit} className="mt-3 space-y-2.5">
          <CurrencyInput
            ref={inputRef}
            value={value}
            onValueChange={setValue}
            aria-label="Monthly savings goal"
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400 select-none">
            <input
              type="checkbox"
              checked={applyFuture}
              onChange={(e) => setApplyFuture(e.target.checked)}
              className="size-3.5 rounded accent-indigo-500"
            />
            Use as the default for future months
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary h-8 flex-1 text-xs">
              <Check className="size-3.5" /> Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost h-8 text-xs">
              <X className="size-3.5" /> Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="money truncate text-2xl font-semibold text-slate-50 sm:text-[1.75rem]">
                {format(goal.targetAmount)}
              </p>
              <p className="text-[11px] text-slate-500">
                {goal.source === 'MONTH'
                  ? 'Goal for this month only'
                  : goal.source === 'DEFAULT'
                    ? 'Default goal'
                    : 'No goal set'}
              </p>
            </div>
            <button type="button" onClick={startEdit} className="btn-ghost h-8 shrink-0 px-2.5 text-xs">
              <Pencil className="size-3.5" />
              {goal.source === 'NONE' ? 'Set' : 'Edit'}
            </button>
          </div>

          <div className="mt-3">
            <GoalBar summary={summary} />
          </div>

          <p className={`mt-3 flex gap-2 text-xs leading-relaxed ${style.text}`}>
            <StatusIcon status={summary.status} />
            <span>
              <StatusMessage summary={summary} />
            </span>
          </p>
        </>
      )}
    </div>
  );
}
