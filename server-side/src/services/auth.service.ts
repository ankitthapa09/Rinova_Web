import crypto from 'node:crypto';
import { userRepository } from '@/repositories/user.repository';
import { tokenService, type TokenPair } from '@/services/token.service';
import { totpService } from '@/services/totp.service';
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
import type { RegisterInput, LoginInput, UpdateProfileInput } from '@/validators/auth.validator';

export interface AuthResult {
  user: UserDocument;
  tokens: TokenPair;
}

/** Password was right, but 2FA is on — the client must send a code next. */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeToken: string;
}

export type LoginOutcome = AuthResult | TwoFactorChallenge;

export interface AuthContext {
  userAgent?: string;
}

/** Mints a session (family + token pair) and stores it — the last step of every
 *  successful login, whether or not 2FA was involved. */
async function issueSession(user: UserDocument, context?: AuthContext): Promise<TokenPair> {
  const family = crypto.randomUUID();
  const tokens = tokenService.signTokenPair({ sub: user.id, role: user.role }, family);
  await userRepository.addSession(user.id, sessionRecord(tokens.refreshToken, family, context));
  return tokens;
}

async function verifyCaptcha(captchaToken?: string): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) return;
  if (!captchaToken) {
    throw AppError.badRequest('Complete the captcha challenge and try again');
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: captchaToken,
  });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    logger.warn('captcha verification request failed', { status: response.status });
    throw AppError.internal('Unable to verify captcha right now');
  }

  const result = (await response.json()) as {
    success?: boolean;
    'error-codes'?: string[];
  };

  if (!result.success) {
    logger.warn('captcha verification rejected', { errors: result['error-codes'] });
    throw AppError.badRequest('Captcha verification failed');
  }
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
    await verifyCaptcha(input.captchaToken);

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

    return { user, tokens: await issueSession(user, context) };
  },

  async login(input: LoginInput, context?: AuthContext): Promise<LoginOutcome> {
    await verifyCaptcha(input.captchaToken);

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

    // Password checks out — but if 2FA is on, hand back a short-lived challenge
    // instead of a session. No tokens until the code is verified.
    if (user.twoFactorEnabled) {
      logger.info('login awaiting 2FA', { userId: user.id });
      return { twoFactorRequired: true, challengeToken: tokenService.sign2faChallenge(user.id) };
    }

    await userRepository.recordLogin(user.id);
    return { user, tokens: await issueSession(user, context) };
  },

  /** Second login step — verifies the TOTP (or a recovery code) against the
   *  challenge, then issues the real session. */
  async verifyTwoFactorLogin(
    challengeToken: string,
    code: string,
    context?: AuthContext,
  ): Promise<AuthResult> {
    const { sub } = tokenService.verify2faChallenge(challengeToken);
    const user = await userRepository.findByIdWith2FA(sub);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw AppError.unauthorized('Two-factor is not set up for this account');
    }

    const trimmed = code.trim();
    // A dash marks it as a recovery code; otherwise it's a 6-digit TOTP.
    if (trimmed.includes('-')) {
      const idx = await totpService.matchRecoveryCode(trimmed, user.twoFactorRecoveryCodes ?? []);
      if (idx === -1) throw AppError.unauthorized('Invalid code');
      const remaining = (user.twoFactorRecoveryCodes ?? []).filter((_, i) => i !== idx);
      await userRepository.setRecoveryCodes(user.id, remaining);
      logger.info('2FA login via recovery code', { userId: user.id, remaining: remaining.length });
    } else {
      const result = await totpService.verify(trimmed, user.twoFactorSecret, user.twoFactorLastUsedStep);
      if (!result.valid) throw AppError.unauthorized('Invalid code');
      if (result.step !== undefined) await userRepository.setTwoFactorStep(user.id, result.step);
    }

    await userRepository.recordLogin(user.id);
    return { user, tokens: await issueSession(user, context) };
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

  /** 2FA setup step 1 — mint a secret and QR for a signed-in user. 2FA stays
   *  OFF until a code confirms the app is set up (see confirmTwoFactor). */
  async startTwoFactorSetup(userId: string): Promise<{ secret: string; qrDataUrl: string }> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    if (user.twoFactorEnabled) throw AppError.conflict('Two-factor is already enabled');

    const secret = totpService.generateSecret();
    await userRepository.setTwoFactorSecret(userId, secret);
    const qrDataUrl = await totpService.qrDataUrl(totpService.keyUri(user.email, secret));
    return { secret, qrDataUrl };
  },

  /** 2FA setup step 2 — verify the first code, switch 2FA on, and hand back the
   *  one-time recovery codes (shown to the user exactly once). */
  async confirmTwoFactorSetup(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await userRepository.findByIdWith2FA(userId);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    if (user.twoFactorEnabled) throw AppError.conflict('Two-factor is already enabled');
    if (!user.twoFactorSecret) throw AppError.badRequest('Start the setup before confirming');

    const result = await totpService.verify(code.trim(), user.twoFactorSecret);
    if (!result.valid) throw AppError.badRequest('That code is incorrect — try the current one');

    const { plain, hashed } = await totpService.generateRecoveryCodes();
    await userRepository.enableTwoFactor(userId, hashed);
    if (result.step !== undefined) await userRepository.setTwoFactorStep(userId, result.step);
    logger.info('2FA enabled', { userId });
    return { recoveryCodes: plain };
  },

  /** Turns 2FA off — a fresh code (or recovery code) re-proves the second factor
   *  first, so a hijacked session can't quietly remove it. */
  async disableTwoFactor(userId: string, code: string): Promise<void> {
    const user = await userRepository.findByIdWith2FA(userId);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw AppError.badRequest('Two-factor is not enabled');
    }

    const trimmed = code.trim();
    const ok = trimmed.includes('-')
      ? (await totpService.matchRecoveryCode(trimmed, user.twoFactorRecoveryCodes ?? [])) !== -1
      : (await totpService.verify(trimmed, user.twoFactorSecret, user.twoFactorLastUsedStep)).valid;
    if (!ok) throw AppError.badRequest('That code is incorrect');

    await userRepository.disableTwoFactor(userId);
    logger.info('2FA disabled', { userId });
  },

  /** Step 1 — request a reset link. Same response whether the email exists. */
  async forgotPassword(email: string, captchaToken?: string): Promise<void> {
    await verifyCaptcha(captchaToken);

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

  /** Self-service profile edit — contact fields only (email/role can't change here). */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDocument> {
    const user = await userRepository.updateProfile(userId, input);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    logger.info('profile updated', { userId: user.id });
    return user;
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
