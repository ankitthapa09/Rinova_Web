import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import { isProd } from '@/config/env';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}

// Last middleware in the chain: operational errors return their message;
// anything unexpected is logged with its stack and hidden behind a generic 500.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Duplicate-key race (e.g. two simultaneous signups) — the unique index wins
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json({ success: false, message: 'An account with this email already exists' });
    return;
  }

  logger.error('unexpected error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    message: isProd ? 'Something went wrong' : err instanceof Error ? err.message : 'Unknown error',
  });
}
