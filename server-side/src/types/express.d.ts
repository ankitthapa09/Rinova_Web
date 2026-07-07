import type { AccessTokenPayload } from '@/services/token.service';

// Adds the field auth.middleware attaches after verifying a Bearer token.
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
