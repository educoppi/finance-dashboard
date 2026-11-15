import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categoryService, goalService, transactionService } from '../services';
import type { ResolvedGoal } from '../services';
import type { Category, CategoryInput, Transaction, TransactionInput } from '../types/finance';
import { monthKeyOf } from '../utils/date';

/**
 * Orquestra o estado da tela a partir dos services. Os componentes só
 * conhecem este hook — nunca o mecanismo de armazenamento.
 */
export function useFinanceData(monthKey: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goal, setGoal] = useState<ResolvedGoal>({ monthKey, targetAmount: 0, source: 'NONE' });
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Evita que respostas de um mês antigo sobrescrevam o mês atual (race condition).
  const monthRef = useRef(monthKey);
  monthRef.current = monthKey;

  const refreshCategories = useCallback(async () => {
    const [cats, usage] = await Promise.all([categoryService.list(), transactionService.usageByCategory()]);
    setCategories(cats);
    setCategoryUsage(usage);
  }, []);

  const refreshMonth = useCallback(async (key: string) => {
    const [txs, g] = await Promise.all([transactionService.list({ monthKey: key }), goalService.getByMonth(key)]);
    if (monthRef.current !== key) return;
    setTransactions(txs);
    setGoal(g);
  }, []);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    setLoading(true);
    void refreshMonth(monthKey).finally(() => {
      if (monthRef.current === monthKey) setLoading(false);
    });
  }, [monthKey, refreshMonth]);

  // ---- Transactions --------------------------------------------------------

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      const created = await transactionService.create(input);
      await Promise.all([refreshMonth(monthRef.current), refreshCategories()]);
      return created;
    },
    [refreshMonth, refreshCategories],
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const updated = await transactionService.update(id, input);
      await Promise.all([refreshMonth(monthRef.current), refreshCategories()]);
      return updated;
    },
    [refreshMonth, refreshCategories],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await transactionService.remove(id);
      await Promise.all([refreshMonth(monthRef.current), refreshCategories()]);
    },
    [refreshMonth, refreshCategories],
  );

  // ---- Categories ----------------------------------------------------------

  const createCategory = useCallback(
    async (input: CategoryInput) => {
      const created = await categoryService.create(input);
      await refreshCategories();
      return created;
    },
    [refreshCategories],
  );

  const updateCategory = useCallback(
    async (id: string, input: CategoryInput) => {
      const updated = await categoryService.update(id, input);
      await refreshCategories();
      return updated;
    },
    [refreshCategories],
  );

  const removeCategory = useCallback(
    async (id: string) => {
      await categoryService.remove(id);
      await refreshCategories();
    },
    [refreshCategories],
  );

  // ---- Goal ----------------------------------------------------------------

  const saveGoal = useCallback(async (targetAmount: number, applyToFutureMonths: boolean) => {
    const key = monthRef.current;
    const saved = await goalService.save(key, targetAmount, applyToFutureMonths);
    if (monthRef.current === key) setGoal(saved);
    return saved;
  }, []);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Defesa extra: garante isolamento do mês mesmo se a fonte devolver a mais.
  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKeyOf(t.date) === monthKey),
    [transactions, monthKey],
  );

  return {
    loading,
    categories,
    categoriesById,
    categoryUsage,
    transactions: monthTransactions,
    goal,
    addTransaction,
    updateTransaction,
    removeTransaction,
    createCategory,
    updateCategory,
    removeCategory,
    saveGoal,
  };
}

export type FinanceData = ReturnType<typeof useFinanceData>;
