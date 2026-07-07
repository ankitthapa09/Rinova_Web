import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '@/services/token.service';
import { AppError } from '@/utils/AppError';
import type { UserRole } from '@/models/user.model';

// Verifies the Bearer access token and attaches its payload as req.user.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }

  req.user = tokenService.verifyAccessToken(header.slice('Bearer '.length));
  next();
}

/** Use after requireAuth: restricts a route to the given roles. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}
