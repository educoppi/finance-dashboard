export { categoryService } from './categoryService';
export { transactionService } from './transactionService';
export type { TransactionQuery } from './transactionService';
export { goalService } from './goalService';
export type { ResolvedGoal } from './goalService';
export { IntegrityError, NotFoundError, ServiceError, ValidationError } from './errors';

/** Extracts a friendly message from any error raised by the service layer. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}
