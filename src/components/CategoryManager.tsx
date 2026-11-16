import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Check, Loader2, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Category, CategoryInput, CategoryType } from '../types/finance';
import { getErrorMessage } from '../services';
import { useToast } from '../hooks/useToast';
import { Modal } from './ui/Modal';

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  usage: Record<string, number>;
  onCreate: (input: CategoryInput) => Promise<Category>;
  onUpdate: (id: string, input: CategoryInput) => Promise<Category>;
  onRemove: (id: string) => Promise<void>;
}

const PALETTE = [
  '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  '#ef4444', '#78716c', '#64748b', '#94a3b8',
];

const TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
];

const TYPE_CHIP: Record<CategoryType, string> = {
  EXPENSE: 'bg-rose-500/10 text-rose-300 ring-rose-500/25',
  INCOME: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const EMPTY: CategoryInput = { name: '', color: '#6366f1', type: 'EXPENSE' };

export function CategoryManager({ open, onClose, categories, usage, onCreate, onUpdate, onRemove }: CategoryManagerProps) {
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryInput>(EMPTY);
  const [hexDraft, setHexDraft] = useState(EMPTY.color);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      resetForm();
      setPendingDelete(null);
      setBlockedDelete(null);
    }
  }, [open]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY);
    setHexDraft(EMPTY.color);
    setError(null);
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({ name: c.name, color: c.color, type: c.type });
    setHexDraft(c.color);
    setError(null);
    setPendingDelete(null);
    setBlockedDelete(null);
    window.setTimeout(() => document.getElementById('cat-name')?.focus(), 0);
  };

  const setColor = (color: string) => {
    setForm((f) => ({ ...f, color }));
    setHexDraft(color);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Enter a category name.');
    if (!HEX_RE.test(form.color)) return setError('Invalid color. Use the #RRGGBB format.');
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate(editingId, form);
        toast.success('Category updated. History and charts already reflect the change.');
      } else {
        await onCreate(form);
        toast.success('Category created.');
      }
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (c: Category) => {
    if ((usage[c.id] ?? 0) > 0) {
      setBlockedDelete(c.id);
      setPendingDelete(null);
      return;
    }
    setBlockedDelete(null);
    setPendingDelete(c.id);
  };

  const confirmDelete = async (id: string) => {
    setDeleting(true);
    try {
      await onRemove(id);
      if (editingId === id) resetForm();
      toast.success('Category deleted.');
      setPendingDelete(null);
    } catch (err) {
      // Defense in depth: the service also blocks this (409).
      toast.error(getErrorMessage(err));
      setPendingDelete(null);
      setBlockedDelete(id);
    } finally {
      setDeleting(false);
    }
  };

  const grouped = useMemo(() => {
    const order: CategoryType[] = ['EXPENSE', 'INCOME'];
    return order
      .map((type) => ({
        type,
        items: categories
          .filter((c) => c.type === type)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories]);

  const groupTitle: Record<CategoryType, string> = { EXPENSE: 'Expenses', INCOME: 'Income' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Categories"
      description="Organize your transactions. Changes apply to your whole history."
      size="lg"
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Form */}
        <form onSubmit={submit} noValidate className="space-y-4 md:sticky md:top-0 md:self-start">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit category' : 'New category'}</h3>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-xs text-slate-400 hover:text-slate-200">
                Cancel editing
              </button>
            )}
          </div>

          <div>
            <label htmlFor="cat-name" className="label">
              Name
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute top-1/2 left-3 size-3 -translate-y-1/2 rounded-full ring-2 ring-slate-950"
                style={{ backgroundColor: HEX_RE.test(form.color) ? form.color : '#475569' }}
              />
              <input
                id="cat-name"
                type="text"
                maxLength={40}
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setError(null);
                }}
                placeholder="e.g. Education"
                className="field pl-8"
                data-autofocus
              />
            </div>
          </div>

          <div>
            <span className="label">Type</span>
            <div role="radiogroup" className="flex h-10 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={form.type === o.value}
                  onClick={() => setForm((f) => ({ ...f, type: o.value }))}
                  className={`flex-1 rounded-md text-xs font-medium transition ${
                    form.type === o.value ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-700' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Color</span>
            <div className="grid grid-cols-10 gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={`flex aspect-square items-center justify-center rounded-md transition hover:scale-110 ${
                    form.color.toLowerCase() === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {form.color.toLowerCase() === c && <Check className="size-3 text-white drop-shadow" />}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <label
                className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-800"
                style={{ backgroundColor: HEX_RE.test(form.color) ? form.color : '#475569' }}
                title="Pick a custom color"
              >
                <input
                  type="color"
                  value={HEX_RE.test(form.color) ? form.color : '#475569'}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Custom color picker"
                />
              </label>
              <input
                type="text"
                value={hexDraft}
                maxLength={7}
                onChange={(e) => {
                  let v = e.target.value.trim();
                  if (v && !v.startsWith('#')) v = `#${v}`;
                  setHexDraft(v);
                  if (HEX_RE.test(v)) setForm((f) => ({ ...f, color: v.toLowerCase() }));
                }}
                aria-label="Hex color"
                className={`field money uppercase ${HEX_RE.test(hexDraft) ? '' : 'border-amber-500/60'}`}
              />
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-xs text-rose-400" role="alert">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : editingId ? (
              <Check className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {editingId ? 'Save changes' : 'Add category'}
          </button>
        </form>

        {/* List */}
        <div className="space-y-5">
          {categories.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              No categories yet. Create your first one.
            </p>
          )}
          {grouped.map((g) => (
            <div key={g.type}>
              <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{groupTitle[g.type]}</h4>
              <ul className="space-y-1.5">
                {g.items.map((c) => {
                  const count = usage[c.id] ?? 0;
                  const isEditing = editingId === c.id;
                  return (
                    <li
                      key={c.id}
                      className={`rounded-lg border px-3 py-2.5 transition ${
                        isEditing ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-slate-200">{c.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {count === 0 ? 'No transactions' : `${count} transaction${count === 1 ? '' : 's'}`}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${TYPE_CHIP[c.type]}`}>
                          {TYPE_OPTIONS.find((o) => o.value === c.type)?.label}
                        </span>
                        <button type="button" onClick={() => startEdit(c)} className="icon-btn" aria-label={`Edit ${c.name}`}>
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(c)}
                          className={`icon-btn ${count > 0 ? 'text-slate-600 hover:text-amber-400' : 'hover:bg-rose-500/10 hover:text-rose-400'}`}
                          aria-label={`Delete ${c.name}`}
                          title={count > 0 ? 'Category in use — cannot be deleted' : 'Delete category'}
                        >
                          {count > 0 ? <Lock className="size-3.5" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </div>

                      {blockedDelete === c.id && (
                        <div className="fade-in mt-2.5 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                          <AlertTriangle className="mt-px size-3.5 shrink-0 text-amber-400" />
                          <span className="flex-1">
                            <strong>{c.name}</strong> has {count} linked transaction{count === 1 ? '' : 's'} and cannot be deleted.
                            Edit or delete those transactions first, or just rename the category.
                          </span>
                          <button type="button" onClick={() => setBlockedDelete(null)} className="text-amber-300/70 hover:text-amber-100" aria-label="Dismiss warning">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      )}

                      {pendingDelete === c.id && (
                        <div className="fade-in mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                          <span className="flex-1">Permanently delete “{c.name}”?</span>
                          <button type="button" onClick={() => setPendingDelete(null)} className="rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800">
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDelete(c.id)}
                            disabled={deleting}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-500 px-2.5 py-1 font-medium text-white hover:bg-rose-400 disabled:opacity-60"
                          >
                            {deleting && <Loader2 className="size-3 animate-spin" />}
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
