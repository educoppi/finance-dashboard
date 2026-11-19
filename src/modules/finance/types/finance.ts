/**
 * Domain model — mirrors the future JPA entities / MySQL tables.
 *
 *   categories    (id CHAR(36) PK, name, color CHAR(7), type ENUM, created_at, updated_at, deleted_at NULL)
 *   transactions  (id CHAR(36) PK, type ENUM, amount DECIMAL(12,2), description,
 *                  category_id CHAR(36) FK -> categories.id, date DATE, created_at, updated_at, deleted_at NULL)
 *   monthly_goals (month_key CHAR(7) PK, target_amount DECIMAL(12,2), created_at, updated_at, deleted_at NULL)
 *   default_goals (effective_from CHAR(7) PK, target_amount DECIMAL(12,2), created_at, updated_at, deleted_at NULL)
 *
 * Every entity carries sync metadata for future bidirectional delta sync:
 * `updatedAt` drives "changed since" queries and last-write-wins resolution,
 * and `deletedAt` is a tombstone so deletions propagate instead of vanishing.
 */

import type { SyncMeta } from '../../../shared/services/syncMeta';

export type { SyncMeta };

export type TransactionType = 'EXPENSE' | 'INCOME';

export type CategoryType = TransactionType;

export interface Category extends SyncMeta {
  id: string; // UUID
  name: string;
  color: string; // Hex (e.g. "#10b981")
  type: CategoryType;
}

export interface Transaction extends SyncMeta {
  id: string; // UUID
  type: TransactionType;
  amount: number; // Positive amount in the user's currency
  description: string;
  categoryId: string; // Logical FK -> Category.id
  date: string; // ISO local "YYYY-MM-DD"
}

export interface MonthlyGoal extends SyncMeta {
  monthKey: string; // "YYYY-MM"
  targetAmount: number;
}

/** "Apply to future months" goal: active from `effectiveFrom` until a newer default replaces it. */
export interface DefaultGoal extends SyncMeta {
  effectiveFrom: string; // "YYYY-MM"
  targetAmount: number;
}

/** Create/update payloads (equivalent to the API request DTOs). */
export type TransactionInput = Omit<Transaction, 'id' | keyof SyncMeta>;
export type CategoryInput = Omit<Category, 'id' | keyof SyncMeta>;

export type GoalStatus = 'NEUTRAL' | 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  goal: number;
  spendingCap: number; // Spending cap = Income - Goal
  freeMargin: number; // Free margin = Cap - Expenses
  status: GoalStatus;
}
