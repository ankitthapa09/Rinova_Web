import jwt, { type SignOptions } from 'jsonwebtoken';
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
  iat?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Short-lived access token + long-lived refresh token, signed with separate secrets so one leaking never compromises the other.
export const tokenService = {
  signTokenPair(payload: AccessTokenPayload): TokenPair {
    return {
      accessToken: jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
      }),
      refreshToken: jwt.sign({ sub: payload.sub }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
      }),
    };
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
