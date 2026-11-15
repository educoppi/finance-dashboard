/**
 * Modelagem de domínio — espelha as futuras entidades JPA / tabelas MySQL.
 *
 *   categories   (id CHAR(36) PK, name, color CHAR(7), type ENUM)
 *   transactions (id CHAR(36) PK, type ENUM, amount DECIMAL(12,2), description,
 *                 category_id CHAR(36) FK -> categories.id, date DATE, created_at DATETIME)
 *   monthly_goals(month_key CHAR(7) PK, target_amount DECIMAL(12,2))
 */

export type TransactionType = 'EXPENSE' | 'INCOME';

export type CategoryType = TransactionType | 'BOTH';

export interface Category {
  id: string; // UUID
  name: string;
  color: string; // Hex (ex: "#10b981")
  type: CategoryType;
}

export interface Transaction {
  id: string; // UUID
  type: TransactionType;
  amount: number; // Valor positivo em reais (2 casas decimais)
  description: string;
  categoryId: string; // FK lógica -> Category.id
  date: string; // ISO local "YYYY-MM-DD"
  createdAt: string; // ISO timestamp
}

export interface MonthlyGoal {
  monthKey: string; // "YYYY-MM"
  targetAmount: number;
}

/** Payloads de criação/edição (equivalentes aos DTOs de request da API). */
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export type CategoryInput = Omit<Category, 'id'>;

export type GoalStatus = 'NEUTRAL' | 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  goal: number;
  spendingCap: number; // Teto de Gastos = Receitas - Meta
  freeMargin: number; // Margem Livre = Teto - Gastos
  status: GoalStatus;
}
