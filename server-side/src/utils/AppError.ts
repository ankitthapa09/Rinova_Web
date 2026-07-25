/**
 * Error for expected, handled failure cases — a bad login, a duplicate email,
 * a missing resource. `isOperational` distinguishes these from unexpected bugs:
 * the error handler returns operational messages to the client but hides the
 * details of anything it didn't anticipate.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  /** When set, the client is told how long to wait (seconds) before retrying. */
  public readonly retryAfterSeconds?: number;

  constructor(statusCode: number, message: string, isOperational = true, retryAfterSeconds?: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): AppError {
    return new AppError(400, message);
  }
  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, message);
  }
  static forbidden(message = 'You do not have permission to do that'): AppError {
    return new AppError(403, message);
  }
  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, message);
  }
  static conflict(message: string): AppError {
    return new AppError(409, message);
  }
  static tooMany(message = 'Too many requests'): AppError {
    return new AppError(429, message);
  }
  /** Account temporarily locked (423) — carries how long the client should wait. */
  static locked(message: string, retryAfterSeconds: number): AppError {
    return new AppError(423, message, true, retryAfterSeconds);
  }
  /** Operational 500 — a dependency failed; safe to show, worth retrying. */
  static internal(message = 'Something went wrong — please try again'): AppError {
    return new AppError(500, message);
  }
}
