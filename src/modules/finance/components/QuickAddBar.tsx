import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { Category, Transaction, TransactionInput, TransactionType } from '../types/finance';
import { defaultDateForMonth, formatMonthLabel, getLocalTodayISO, monthKeyOf } from '../../../shared/utils/date';
import { isCategoryCompatible } from '../utils/finance';
import { getErrorMessage } from '../services';
import { useToast } from '../../../shared/hooks/useToast';
import { useCurrency } from '../../../shared/hooks/useCurrency';
import { CategorySelect } from './ui/CategorySelect';
import { CurrencyInput } from '../../../shared/components/CurrencyInput';
import { TypeToggle } from '../../../shared/components/TypeToggle';

interface QuickAddBarProps {
  categories: Category[];
  monthKey: string;
  onAdd: (input: TransactionInput) => Promise<Transaction>;
}

export function QuickAddBar({ categories, monthKey, onAdd }: QuickAddBarProps) {
  const toast = useToast();
  const { parse, currency } = useCurrency();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  // Last category picked per type, so toggling keeps the selection.
  const [categoryByType, setCategoryByType] = useState<Record<TransactionType, string>>({ EXPENSE: '', INCOME: '' });
  const [date, setDate] = useState(getLocalTodayISO);
  const [dateTouched, setDateTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: boolean; description?: boolean; category?: boolean }>({});

  const amountRef = useRef<HTMLInputElement>(null);

  const compatible = useMemo(
    () => categories.filter((c) => isCategoryCompatible(c.type, type)),
    [categories, type],
  );

  // Always keep a valid category for the current type (also after edits/deletions in the modal).
  const categoryId = compatible.some((c) => c.id === categoryByType[type])
    ? categoryByType[type]
    : (compatible[0]?.id ?? '');

  // Until the user picks a date manually, follow the selected month.
  useEffect(() => {
    if (!dateTouched) setDate(defaultDateForMonth(monthKey));
  }, [monthKey, dateTouched]);

  // Switching currency changes the mask (e.g. JPY has no decimals): clear the draft amount.
  useEffect(() => {
    setAmount('');
  }, [currency.code]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const value = parse(amount);
    const nextErrors = { amount: value <= 0, description: !description.trim(), category: !categoryId };
    setErrors(nextErrors);
    if (nextErrors.amount || nextErrors.description || nextErrors.category) {
      if (nextErrors.amount) amountRef.current?.focus();
      else if (nextErrors.description) document.getElementById('qa-description')?.focus();
      return;
    }

    setSaving(true);
    try {
      const created = await onAdd({ type, amount: value, description, categoryId, date });
      setAmount('');
      setDescription('');
      setErrors({});
      const txMonth = monthKeyOf(created.date);
      if (txMonth !== monthKey) {
        toast.success(`Saved to ${formatMonthLabel(txMonth)} (outside the month on screen).`);
      } else {
        toast.success(type === 'INCOME' ? 'Income added.' : 'Expense added.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
      // Return focus for rapid back-to-back entries.
      amountRef.current?.focus();
    }
  };

  return (
    <section aria-label="Quick entry" className="card p-3 sm:p-4">
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-2 gap-3 md:grid-cols-12 md:items-end">
        <div className="col-span-2 md:col-span-4 lg:col-span-3">
          <span className="label">Type</span>
          <TypeToggle value={type} onChange={setType} />
        </div>

        <div className="col-span-1 md:col-span-3 lg:col-span-2">
          <label htmlFor="qa-amount" className="label">
            Amount
          </label>
          <CurrencyInput
            id="qa-amount"
            ref={amountRef}
            value={amount}
            onValueChange={(v) => {
              setAmount(v);
              if (errors.amount) setErrors((p) => ({ ...p, amount: false }));
            }}
            aria-invalid={errors.amount}
            className={errors.amount ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/25' : ''}
            autoFocus
          />
        </div>

        <div className="col-span-1 md:col-span-5 lg:col-span-2">
          <label htmlFor="qa-description" className="label">
            Description
          </label>
          <input
            id="qa-description"
            type="text"
            value={description}
            maxLength={120}
            autoComplete="off"
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((p) => ({ ...p, description: false }));
            }}
            placeholder={type === 'INCOME' ? 'e.g. Monthly salary' : 'e.g. Lunch at a restaurant'}
            aria-invalid={errors.description}
            className={`field ${errors.description ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/25' : ''}`}
          />
        </div>

        <div className="col-span-1 md:col-span-4 lg:col-span-2">
          <label htmlFor="qa-category" className="label">
            Category
          </label>
          <CategorySelect
            id="qa-category"
            categories={compatible}
            value={categoryId}
            onChange={(id) => setCategoryByType((p) => ({ ...p, [type]: id }))}
            placeholder="Create a category"
          />
        </div>

        <div className="col-span-1 md:col-span-4 lg:col-span-2">
          <label htmlFor="qa-date" className="label">
            Date
          </label>
          <input
            id="qa-date"
            type="date"
            value={date}
            required
            onChange={(e) => {
              if (!e.target.value) return;
              setDate(e.target.value);
              setDateTouched(true);
            }}
            className="field money"
          />
        </div>

        <div className="col-span-2 md:col-span-4 lg:col-span-1">
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            <span className="lg:hidden xl:inline">Add</span>
          </button>
        </div>
      </form>
      {(errors.amount || errors.description || errors.category) && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {errors.amount
            ? 'Enter an amount greater than zero.'
            : errors.description
              ? 'Enter a description.'
              : 'Select a matching category.'}
        </p>
      )}
    </section>
  );
}
