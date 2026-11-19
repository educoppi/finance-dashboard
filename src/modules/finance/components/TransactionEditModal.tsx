import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { Category, Transaction, TransactionInput, TransactionType } from '../types/finance';
import { isCategoryCompatible } from '../utils/finance';
import { formatMonthLabel, monthKeyOf } from '../../../shared/utils/date';
import { getErrorMessage } from '../services';
import { useToast } from '../../../shared/hooks/useToast';
import { useCurrency } from '../../../shared/hooks/useCurrency';
import { Modal } from '../../../shared/components/Modal';
import { TypeToggle } from '../../../shared/components/TypeToggle';
import { CurrencyInput } from '../../../shared/components/CurrencyInput';
import { CategorySelect } from './ui/CategorySelect';

interface TransactionEditModalProps {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSave: (id: string, input: TransactionInput) => Promise<Transaction>;
}

export function TransactionEditModal({ transaction, categories, onClose, onSave }: TransactionEditModalProps) {
  const toast = useToast();
  const { parse, toInput } = useCurrency();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  // Prefilled mask of the stored amount. If the user leaves the field untouched we keep the
  // stored value: a 0-decimal currency (JPY) would otherwise round 12.34 to 12 on save.
  const [initialAmount, setInitialAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setType(transaction.type);
    const prefill = toInput(transaction.amount);
    setAmount(prefill);
    setInitialAmount(prefill);
    setDescription(transaction.description);
    setCategoryId(transaction.categoryId);
    setDate(transaction.date);
    setError(null);
  }, [transaction, toInput]);

  const compatible = useMemo(() => categories.filter((c) => isCategoryCompatible(c.type, type)), [categories, type]);
  const effectiveCategory = compatible.some((c) => c.id === categoryId) ? categoryId : (compatible[0]?.id ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const value = amount === initialAmount ? transaction.amount : parse(amount);
    if (value <= 0) return setError('Enter an amount greater than zero.');
    if (!description.trim()) return setError('Enter a description.');
    if (!effectiveCategory) return setError('Select a category.');
    if (!date) return setError('Enter a date.');
    setSaving(true);
    try {
      const saved = await onSave(transaction.id, { type, amount: value, description, categoryId: effectiveCategory, date });
      const movedTo = monthKeyOf(saved.date);
      toast.success(
        movedTo !== monthKeyOf(transaction.date)
          ? `Transaction updated and moved to ${formatMonthLabel(movedTo)}.`
          : 'Transaction updated.',
      );
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={transaction !== null} onClose={onClose} title="Edit transaction" size="md">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <span className="label">Type</span>
          <TypeToggle value={type} onChange={setType} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-amount" className="label">
              Amount
            </label>
            <CurrencyInput id="edit-amount" value={amount} onValueChange={setAmount} data-autofocus />
          </div>
          <div>
            <label htmlFor="edit-date" className="label">
              Date
            </label>
            <input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="field money"
            />
          </div>
        </div>
        <div>
          <label htmlFor="edit-desc" className="label">
            Description
          </label>
          <input
            id="edit-desc"
            type="text"
            maxLength={120}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="edit-cat" className="label">
            Category
          </label>
          <CategorySelect id="edit-cat" categories={compatible} value={effectiveCategory} onChange={setCategoryId} />
        </div>
        {error && (
          <p className="text-xs text-rose-400" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
