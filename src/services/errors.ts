/**
 * Domain errors. In Phase 2 they will be mapped from HTTP status codes:
 *   400 -> ValidationError, 404 -> NotFoundError, 409 -> IntegrityError
 */
export class ServiceError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class IntegrityError extends ServiceError {
  constructor(message: string) {
    super(message, 409);
  }
}
