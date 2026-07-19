import crypto from 'node:crypto';
import { userRepository } from '@/repositories/user.repository';
import { tokenService, type TokenPair } from '@/services/token.service';
import { emailService } from '@/services/email.service';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import { env } from '@/config/env';
import type { UserDocument } from '@/models/user.model';
import type { RegisterInput, LoginInput } from '@/validators/auth.validator';

export interface AuthResult {
  user: UserDocument;
  tokens: TokenPair;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
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

    return {
      user,
      tokens: tokenService.signTokenPair({ sub: user.id, role: user.role }),
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);

    // Same error whether the email or the password is wrong — a different
    // message would let an attacker probe which emails are registered.
    if (!user || !(await user.comparePassword(input.password))) {
      logger.warn('failed login attempt', { email: input.email });
      throw AppError.unauthorized('Invalid email or password');
    }

    await userRepository.recordLogin(user.id);

    return {
      user,
      tokens: tokenService.signTokenPair({ sub: user.id, role: user.role }),
    };
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    const { sub, iat } = tokenService.verifyRefreshToken(refreshToken);

    const user = await userRepository.findByIdWithPasswordChangedAt(sub);
    if (!user) throw AppError.unauthorized('Account no longer exists');

    // Refresh tokens minted before a password change are dead — this is what
    // logs other sessions out after a reset.
    if (
      user.passwordChangedAt &&
      iat !== undefined &&
      iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      logger.warn('refresh token predates password change', { userId: user.id });
      throw AppError.unauthorized('Session expired — please sign in again');
    }

    return tokenService.signTokenPair({ sub: user.id, role: user.role });
  },

  /** Step 1 — request a reset link. Succeeds whether or not the email exists,
   *  so nobody can probe which emails are registered. */
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
      // Mail failed: clear the token and log, but keep the same 200 response —
      // erroring only for registered emails would leak which emails exist.
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
    // same error for invalid, expired and already-used
    if (!user) throw AppError.badRequest('This reset link is invalid or has expired');

    user.password = password;
    user.clearPasswordReset();
    await user.save();

    logger.info('password reset completed', { userId: user.id });
  },
};
