export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, opts?: { statusCode?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "AppError";
    this.statusCode = opts?.statusCode ?? 400;
    this.code = opts?.code ?? "AppError";
    this.details = opts?.details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 400, code: "ValidationError", details });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 404, code: "NotFound", details });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 409, code: "Conflict", details });
    this.name = "ConflictError";
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: unknown, statusCode: number = 401) {
    super(message, { statusCode, code: "AuthError", details });
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Login required", details?: unknown) {
    super(message, { statusCode: 401, code: "UNAUTHORIZED", details });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Not allowed", details?: unknown) {
    super(message, { statusCode: 403, code: "FORBIDDEN", details });
    this.name = "ForbiddenError";
  }
}

export class InternalError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 500, code: "InternalError", details });
    this.name = "InternalError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
