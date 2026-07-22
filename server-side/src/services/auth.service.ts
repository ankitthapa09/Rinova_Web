import crypto from 'node:crypto';
import { userRepository } from '@/repositories/user.repository';
import { tokenService, type TokenPair } from '@/services/token.service';
import { emailService } from '@/services/email.service';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import { env } from '@/config/env';
import {
  ACCOUNT_LOCK_MS,
  MAX_LOGIN_ATTEMPTS,
  ROTATION_GRACE_MS,
  PASSWORD_HISTORY_LIMIT,
  type UserDocument,
} from '@/models/user.model';
import type { RegisterInput, LoginInput } from '@/validators/auth.validator';

export interface AuthResult {
  user: UserDocument;
  tokens: TokenPair;
}

export interface AuthContext {
  userAgent?: string;
}

/** A refresh always returns an access token; `refreshToken` is absent when the
 *  call lost a rotation race, meaning the caller's cookie must stay as it is. */
export interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
}

/** Turns a freshly-signed refresh token into the record we persist. */
function sessionRecord(
  refreshToken: string,
  family: string,
  context?: AuthContext,
  previousTokenHash?: string,
) {
  return {
    family,
    tokenHash: tokenService.hashRefreshToken(refreshToken),
    previousTokenHash,
    rotatedAt: previousTokenHash ? new Date() : undefined,
    expiresAt: tokenService.getRefreshExpiry(refreshToken),
    userAgent: context?.userAgent,
    createdAt: new Date(),
  };
}

export const authService = {
  async register(input: RegisterInput, context?: AuthContext): Promise<AuthResult> {
    if (await userRepository.existsByEmail(input.email)) {
      throw AppError.conflict('An account with this email already exists');
    }

    const user = await userRepository.create(input);
    logger.info('user registered', { userId: user.id });

    // Send the verification link, but never let mail trouble block a signup.
    try {
      const rawToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });
      await emailService.verifyEmail(
        user.email,
        user.name,
        `${env.CLIENT_URL}/verify-email/${rawToken}`,
      );
    } catch (err) {
      logger.error('verification email failed', { userId: user.id, err });
    }

    const family = crypto.randomUUID();
    const tokens = tokenService.signTokenPair({ sub: user.id, role: user.role }, family);
    await userRepository.addSession(user.id, sessionRecord(tokens.refreshToken, family, context));
    return { user, tokens };
  },

  async login(input: LoginInput, context?: AuthContext): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);

    // checked first, so a locked account never confirms the right password
    if (user?.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60_000);
      logger.warn('login attempt on locked account', { userId: user.id });
      throw AppError.tooMany(
        `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}`,
      );
    }

    // same error whether the email or password is wrong — no enumeration
    if (!user || !(await user.comparePassword(input.password))) {
      if (user) {
        const failures = await userRepository.recordFailedLogin(user.id);
        if (failures >= MAX_LOGIN_ATTEMPTS) {
          await userRepository.lockAccount(user.id, new Date(Date.now() + ACCOUNT_LOCK_MS));
          logger.warn('account locked after repeated failures', { userId: user.id });
        }
      }
      logger.warn('failed login attempt', { email: input.email });
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.failedLoginAttempts || user.lockUntil) {
      await userRepository.clearLoginFailures(user.id);
    }

    await userRepository.recordLogin(user.id);

    const family = crypto.randomUUID();
    const tokens = tokenService.signTokenPair({ sub: user.id, role: user.role }, family);
    await userRepository.addSession(user.id, sessionRecord(tokens.refreshToken, family, context));
    return { user, tokens };
  },

  /** Rotating refresh — every use burns the old token and issues a new one in
   *  the same family. A stale token replayed within a live family means theft:
   *  every session is dropped. A missing family just means this one is over. */
  async refresh(refreshToken: string, context?: AuthContext): Promise<RefreshResult> {
    const { sub, family, iat } = tokenService.verifyRefreshToken(refreshToken);

    const user = await userRepository.findByIdWithSessions(sub);
    if (!user) throw AppError.unauthorized('Account no longer exists');

    // tokens minted before a password change are dead
    if (
      user.passwordChangedAt &&
      iat !== undefined &&
      iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      logger.warn('refresh token predates password change', { userId: user.id });
      throw AppError.unauthorized('Session expired — please sign in again');
    }

    const session = user.refreshSessions?.find((s) => s.family === family);
    if (!session) throw AppError.unauthorized('Session expired — please sign in again');

    const presentedHash = tokenService.hashRefreshToken(refreshToken);
    const accessToken = tokenService.signAccessToken({ sub: user.id, role: user.role });

    // Was this token already replaced? Only benign if it's the one we swapped
    // out moments ago — two tabs refreshing together. Anything older is a replay.
    if (session.tokenHash !== presentedHash) {
      const inGrace =
        session.previousTokenHash === presentedHash &&
        session.rotatedAt !== undefined &&
        Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;

      if (!inGrace) {
        logger.warn('refresh token reuse detected — revoking all sessions', { userId: user.id });
        await userRepository.clearAllSessions(user.id);
        throw AppError.unauthorized('Session expired — please sign in again');
      }
      // Don't rotate: the winner's token is the live one, and re-issuing here
      // would orphan it. Fresh access token only, cookie left untouched.
      logger.info('refresh race tolerated within grace window', { userId: user.id });
      return { accessToken };
    }

    const tokens = tokenService.signTokenPair({ sub: user.id, role: user.role }, family);
    const rotated = await userRepository.rotateSession(
      user.id,
      family,
      presentedHash,
      sessionRecord(tokens.refreshToken, family, context, presentedHash),
    );

    // Lost the swap — another request rotated between our read and write.
    // Same reasoning as above: keep their token, hand back access only.
    if (!rotated) {
      logger.info('refresh race lost the swap', { userId: user.id });
      return { accessToken };
    }

    return tokens;
  },

  /** Drops this device's session so its refresh token dies immediately,
   *  rather than whenever the JWT would have expired. Other devices unaffected. */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const { sub, family } = tokenService.verifyRefreshToken(refreshToken);
      await userRepository.removeSessionByFamily(sub, family);
    } catch {
      // malformed/expired token, nothing to remove
    }
  },

  /** Step 1 — request a reset link. Same response whether the email exists. */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmailForReset(email);
    if (!user) {
      logger.info('password reset requested for unknown email');
      return;
    }

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${env.CLIENT_URL}/reset-password/${rawToken}`;
    try {
      await emailService.passwordReset(user.email, user.name, resetUrl);
      logger.info('password reset email sent', { userId: user.id });
    } catch (err) {
      // clear the token but keep the same response — no enumeration on mail failure
      user.clearPasswordReset();
      await user.save({ validateBeforeSave: false });
      logger.error('password reset email failed', { userId: user.id, err });
    }
  },

  /** Flips isEmailVerified using the emailed token. Single-use. */
  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await userRepository.findByValidVerificationTokenHash(tokenHash);
    if (!user) throw AppError.badRequest('This verification link is invalid or has expired');

    user.isEmailVerified = true;
    user.clearEmailVerification();
    await user.save({ validateBeforeSave: false });
    logger.info('email verified', { userId: user.id });
  },

  /** Fresh link for a signed-in user who never got (or lost) the first one. */
  async resendVerification(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    if (user.isEmailVerified) throw AppError.conflict('This email is already verified');

    const rawToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    await emailService.verifyEmail(
      user.email,
      user.name,
      `${env.CLIENT_URL}/verify-email/${rawToken}`,
    );
    logger.info('verification email resent', { userId: user.id });
  },

  /** Step 2 — set the new password with the emailed token. Single-use. */
  async resetPassword(rawToken: string, password: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await userRepository.findByValidResetTokenHash(tokenHash);
    if (!user) throw AppError.badRequest('This reset link is invalid or has expired');

    if (await user.isPasswordReused(password)) {
      throw AppError.badRequest('New password must differ from your recent passwords');
    }

    user.passwordHistory = [user.password, ...(user.passwordHistory ?? [])].slice(
      0,
      PASSWORD_HISTORY_LIMIT,
    );
    user.password = password;
    user.clearPasswordReset();
    await user.save();

    logger.info('password reset completed', { userId: user.id });
  },
};
