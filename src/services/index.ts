export { categoryService } from './categoryService';
export { transactionService } from './transactionService';
export type { TransactionQuery } from './transactionService';
export { goalService } from './goalService';
export type { ResolvedGoal } from './goalService';
export { IntegrityError, NotFoundError, ServiceError, ValidationError } from './errors';

/** Extrai uma mensagem amigável de qualquer erro vindo da camada de serviços. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
