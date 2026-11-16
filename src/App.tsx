import { useCallback, useMemo, useState } from 'react';
import type { Transaction, TransactionInput } from './types/finance';
import { useFinanceData } from './hooks/useFinanceData';
import { useToast } from './hooks/useToast';
import { getErrorMessage } from './services';
import { getCurrentMonthKey, formatDate } from './utils/date';
import { computeMonthSummary, cumulativeExpenses, expensesByCategory } from './utils/finance';
import { useCurrency } from './hooks/useCurrency';
import { Header } from './components/Header';
import { QuickAddBar } from './components/QuickAddBar';
import { SummaryCards } from './components/SummaryCards';
import { CategoryDonut } from './components/charts/CategoryDonut';
import { SpendingPaceChart } from './components/charts/SpendingPaceChart';
import { MonthlyBalanceChart } from './components/charts/MonthlyBalanceChart';
import { TransactionHistory } from './components/TransactionHistory';
import { TransactionEditModal } from './components/TransactionEditModal';
import { CategoryManager } from './components/CategoryManager';
import { ConfirmDialog } from './components/ui/ConfirmDialog';

export default function App() {
  const toast = useToast();
  const { format } = useCurrency();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const data = useFinanceData(monthKey);
  const { transactions, categories, categoriesById, goal } = data;

  // Every derived value is recomputed from the same state → fully reactive.
  const summary = useMemo(() => computeMonthSummary(transactions, goal.targetAmount), [transactions, goal.targetAmount]);
  const slices = useMemo(() => expensesByCategory(transactions, categories), [transactions, categories]);
  const pace = useMemo(() => cumulativeExpenses(transactions, monthKey), [transactions, monthKey]);
  const counts = useMemo(
    () => ({
      income: transactions.filter((t) => t.type === 'INCOME').length,
      expense: transactions.filter((t) => t.type === 'EXPENSE').length,
    }),
    [transactions],
  );

  const { addTransaction, removeTransaction } = data;
  const handleAdd = useCallback(
    async (input: TransactionInput) => {
      const created = await addTransaction(input);
      setHighlightId(created.id);
      return created;
    },
    [addTransaction],
  );

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await removeTransaction(deleting.id);
      toast.success('Transaction deleted.');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgb(99_102_241/0.12),transparent)]">
      <Header monthKey={monthKey} onMonthChange={setMonthKey} onOpenCategories={() => setCategoriesOpen(true)} />

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <QuickAddBar categories={categories} monthKey={monthKey} onAdd={handleAdd} />

        <SummaryCards
          summary={summary}
          goal={goal}
          incomeCount={counts.income}
          expenseCount={counts.expense}
          onSaveGoal={data.saveGoal}
        />

        <section aria-label="Charts" className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <CategoryDonut data={slices} total={summary.expense} />
          <SpendingPaceChart
            data={pace}
            monthKey={monthKey}
            spendingCap={summary.spendingCap}
            hasIncome={summary.income > 0}
          />
          <MonthlyBalanceChart summary={summary} />
        </section>

        <TransactionHistory
          transactions={transactions}
          categories={categories}
          categoriesById={categoriesById}
          monthKey={monthKey}
          loading={data.loading}
          highlightId={highlightId}
          onEdit={setEditing}
          onDelete={setDeleting}
        />

        <footer className="pt-2 pb-6 text-center text-[11px] text-slate-600">
          Data is stored locally in this browser · Phase 1 (MVP)
        </footer>
      </main>

      <TransactionEditModal
        transaction={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSave={data.updateTransaction}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete transaction"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        message={
          deleting && (
            <>
              Delete <strong className="text-slate-100">“{deleting.description}”</strong> from{' '}
              <span className="money">{formatDate(deleting.date)}</span> for{' '}
              <span className={`money ${deleting.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {format(deleting.amount)}
              </span>
              ? This cannot be undone.
            </>
          )
        }
      />

      <CategoryManager
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={categories}
        usage={data.categoryUsage}
        onCreate={data.createCategory}
        onUpdate={data.updateCategory}
        onRemove={data.removeCategory}
      />
    </div>
  );
}
