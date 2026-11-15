import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { Category, Transaction, TransactionInput, TransactionType } from '../types/finance';
import { isCategoryCompatible } from '../utils/finance';
import { parseCurrencyInput, toCurrencyInput } from '../utils/money';
import { formatMonthLabel, monthKeyOf } from '../utils/date';
import { getErrorMessage } from '../services';
import { useToast } from '../hooks/useToast';
import { Modal } from './ui/Modal';
import { TypeToggle } from './ui/TypeToggle';
import { CurrencyInput } from './ui/CurrencyInput';
import { CategorySelect } from './ui/CategorySelect';

interface TransactionEditModalProps {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSave: (id: string, input: TransactionInput) => Promise<Transaction>;
}

export function TransactionEditModal({ transaction, categories, onClose, onSave }: TransactionEditModalProps) {
  const toast = useToast();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setType(transaction.type);
    setAmount(toCurrencyInput(transaction.amount));
    setDescription(transaction.description);
    setCategoryId(transaction.categoryId);
    setDate(transaction.date);
    setError(null);
  }, [transaction]);

  const compatible = useMemo(() => categories.filter((c) => isCategoryCompatible(c.type, type)), [categories, type]);
  const effectiveCategory = compatible.some((c) => c.id === categoryId) ? categoryId : (compatible[0]?.id ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const value = parseCurrencyInput(amount);
    if (value <= 0) return setError('Informe um valor maior que zero.');
    if (!description.trim()) return setError('Informe uma descrição.');
    if (!effectiveCategory) return setError('Selecione uma categoria.');
    if (!date) return setError('Informe a data.');
    setSaving(true);
    try {
      const saved = await onSave(transaction.id, { type, amount: value, description, categoryId: effectiveCategory, date });
      const movedTo = monthKeyOf(saved.date);
      toast.success(
        movedTo !== monthKeyOf(transaction.date)
          ? `Lançamento atualizado e movido para ${formatMonthLabel(movedTo)}.`
          : 'Lançamento atualizado.',
      );
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={transaction !== null} onClose={onClose} title="Editar lançamento" size="md">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <span className="label">Tipo</span>
          <TypeToggle value={type} onChange={setType} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-amount" className="label">
              Valor
            </label>
            <CurrencyInput id="edit-amount" value={amount} onValueChange={setAmount} data-autofocus />
          </div>
          <div>
            <label htmlFor="edit-date" className="label">
              Data
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
            Descrição
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
            Categoria
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
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </form>
    </Modal>
  );
}
