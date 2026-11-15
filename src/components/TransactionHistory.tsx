import { useMemo, useState } from 'react';
import { FilterX, Inbox, Pencil, Receipt, Search, SearchX, Trash2 } from 'lucide-react';
import type { Category, Transaction } from '../types/finance';
import { formatDateBR, formatMonthLabel } from '../utils/date';
import { formatBRL, sumMoney } from '../utils/money';
import { CategorySelect } from './ui/CategorySelect';

type TypeFilter = 'ALL' | 'EXPENSE' | 'INCOME';

interface TransactionHistoryProps {
  transactions: Transaction[];
  categories: Category[];
  categoriesById: Map<string, Category>;
  monthKey: string;
  loading: boolean;
  highlightId: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

const ALL = '__all__';

/** Normaliza para busca sem acento e sem caixa ("Almoço" ~ "almoco"). */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function CategoryBadge({ category }: { category: Category | undefined }) {
  const color = category?.color ?? '#475569';
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}40` }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{category?.name ?? 'Sem categoria'}</span>
    </span>
  );
}

function Amount({ t }: { t: Transaction }) {
  const income = t.type === 'INCOME';
  return (
    <span className={`money font-medium whitespace-nowrap ${income ? 'text-emerald-400' : 'text-rose-400'}`}>
      {income ? '+ ' : '- '}
      {formatBRL(t.amount)}
    </span>
  );
}

export function TransactionHistory({
  transactions,
  categories,
  categoriesById,
  monthKey,
  loading,
  highlightId,
  onEdit,
  onDelete,
}: TransactionHistoryProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  // Se a categoria filtrada for excluída, o filtro volta para "todas".
  const effectiveCategory = categoryFilter !== ALL && !categoriesById.has(categoryFilter) ? ALL : categoryFilter;
  const hasFilters = query.trim() !== '' || typeFilter !== 'ALL' || effectiveCategory !== ALL;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return transactions
      .filter((t) => typeFilter === 'ALL' || t.type === typeFilter)
      .filter((t) => effectiveCategory === ALL || t.categoryId === effectiveCategory)
      .filter((t) => !q || normalize(t.description).includes(q))
      .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1));
  }, [transactions, query, typeFilter, effectiveCategory]);

  const filteredNet = useMemo(
    () => sumMoney(filtered.map((t) => (t.type === 'INCOME' ? t.amount : -t.amount))),
    [filtered],
  );

  const clear = () => {
    setQuery('');
    setTypeFilter('ALL');
    setCategoryFilter(ALL);
  };

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'EXPENSE', label: 'Gastos' },
    { value: 'INCOME', label: 'Receitas' },
  ];

  return (
    <section aria-label="Histórico de lançamentos" className="card">
      <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Histórico</h2>
            <p className="text-xs text-slate-500">Lançamentos de {formatMonthLabel(monthKey)}</p>
          </div>
          {transactions.length > 0 && (
            <p className="text-xs text-slate-500">
              {filtered.length} de {transactions.length} · saldo filtrado{' '}
              <span className={`money ${filteredNet < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatBRL(filteredNet)}
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_14rem_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pela descrição…"
              aria-label="Buscar pela descrição"
              className="field pl-9"
            />
          </div>
          <div role="radiogroup" aria-label="Filtrar por tipo" className="flex h-10 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
            {typeOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={typeFilter === o.value}
                onClick={() => setTypeFilter(o.value)}
                className={`flex-1 rounded-md px-3 text-xs font-medium whitespace-nowrap transition ${
                  typeFilter === o.value
                    ? o.value === 'EXPENSE'
                      ? 'bg-rose-500/15 text-rose-300'
                      : o.value === 'INCOME'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {o.value === 'ALL' ? o.label : `Apenas ${o.label.toLowerCase()}`}
              </button>
            ))}
          </div>
          <CategorySelect
            categories={categories}
            value={effectiveCategory}
            onChange={setCategoryFilter}
            allOption={{ value: ALL, label: 'Todas as categorias' }}
            aria-label="Filtrar por categoria"
          />
          {hasFilters ? (
            <button type="button" onClick={clear} className="btn-ghost text-slate-300">
              <FilterX className="size-4" />
              Limpar filtros
            </button>
          ) : (
            <span className="hidden lg:block" />
          )}
        </div>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800/50" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20">
            <Inbox className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Nenhum lançamento em {formatMonthLabel(monthKey)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Use a barra de lançamento rápido acima para registrar sua primeira receita ou gasto do mês.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              document.getElementById('qa-amount')?.focus({ preventScroll: true });
            }}
            className="btn-primary h-9 text-xs"
          >
            <Receipt className="size-4" />
            Fazer um lançamento
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
            <SearchX className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Nenhum lançamento corresponde aos filtros</p>
            <p className="mt-1 text-xs text-slate-500">Tente outro termo de busca ou remova algum filtro.</p>
          </div>
          <button type="button" onClick={clear} className="btn-ghost h-9 text-xs">
            <FilterX className="size-4" />
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="w-28 px-5 py-2.5 font-medium">Data</th>
                  <th className="w-48 px-3 py-2.5 font-medium">Categoria</th>
                  <th className="px-3 py-2.5 font-medium">Descrição</th>
                  <th className="w-40 px-3 py-2.5 text-right font-medium">Valor</th>
                  <th className="w-24 px-5 py-2.5 text-right font-medium">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className={`group transition-colors hover:bg-slate-800/40 ${t.id === highlightId ? 'row-flash' : ''}`}
                  >
                    <td className="money px-5 py-3 text-slate-400">{formatDateBR(t.date)}</td>
                    <td className="px-3 py-3">
                      <CategoryBadge category={categoriesById.get(t.categoryId)} />
                    </td>
                    <td className="truncate px-3 py-3 text-slate-200" title={t.description}>
                      {t.description}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Amount t={t} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100 focus-within:opacity-100">
                        <button type="button" onClick={() => onEdit(t)} className="icon-btn" aria-label={`Editar ${t.description}`}>
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(t)}
                          className="icon-btn hover:bg-rose-500/10 hover:text-rose-400"
                          aria-label={`Excluir ${t.description}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: lista */}
          <ul className="divide-y divide-slate-800/70 md:hidden">
            {filtered.map((t) => (
              <li key={t.id} className={`flex items-center gap-3 px-4 py-3 ${t.id === highlightId ? 'row-flash' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{t.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="money text-xs text-slate-500">{formatDateBR(t.date)}</span>
                    <CategoryBadge category={categoriesById.get(t.categoryId)} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Amount t={t} />
                  <div className="flex gap-0.5">
                    <button type="button" onClick={() => onEdit(t)} className="icon-btn size-7" aria-label={`Editar ${t.description}`}>
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(t)}
                      className="icon-btn size-7 hover:text-rose-400"
                      aria-label={`Excluir ${t.description}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
