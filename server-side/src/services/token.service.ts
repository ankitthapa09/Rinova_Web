import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import type { UserRole } from '@/models/user.model';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  /** issued-at (seconds), set by jwt.sign */
  iat?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  /** Rotation chain id, constant as the token rotates. */
  family: string;
  iat?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Short-lived access token + long-lived refresh token, separate secrets.
export const tokenService = {
  /** New family = new login chain; pass one back in to rotate within a chain. */
  signTokenPair(payload: AccessTokenPayload, family: string = crypto.randomUUID()): TokenPair {
    return {
      accessToken: jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
      }),
      // jwtid keeps rotated tokens distinct even within the same second
      refreshToken: jwt.sign({ sub: payload.sub, family }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
        jwtid: crypto.randomBytes(16).toString('hex'),
      }),
    };
  },

  /** Access token alone, for a refresh that loses a rotation race and so must
   * not mint a new refresh token. */
  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    });
  },

  /** What we store, the raw token never touches the database. */
  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  getRefreshExpiry(token: string): Date {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  },

  /** Short-lived proof that a password was correct, awaiting the 2FA code. The
   * `twofa` claim keeps it from being used as an ordinary access token. */
  sign2faChallenge(userId: string): string {
    return jwt.sign({ sub: userId, twofa: true }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
  },

  verify2faChallenge(token: string): { sub: string } {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; twofa?: boolean };
      if (!payload.twofa) throw new Error('not a 2fa challenge');
      return { sub: payload.sub };
    } catch {
      throw AppError.unauthorized('Your verification session expired, sign in again');
    }
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
  },

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }
  },
};
