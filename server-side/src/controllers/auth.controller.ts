import type { Request, Response, CookieOptions } from 'express';
import { authService } from '@/services/auth.service';
import { userRepository } from '@/repositories/user.repository';
import { catchAsync } from '@/utils/catchAsync';
import { AppError } from '@/utils/AppError';
import { env, isProd } from '@/config/env';

const REFRESH_COOKIE = 'refreshToken';

/** '15m' | '12h' | '7d' - milliseconds */
function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const [, amount, unit] = match;
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as 's' | 'm' | 'h' | 'd'];
  return Number(amount) * unitMs;
}

// The refresh token never appears in a JSON body - it lives in an httpOnly
// cookie scoped to the auth routes, out of reach of any script (XSS) and
// only sent where it's needed.
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
};

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.register(req.body, {
      userAgent: req.get('user-agent'),
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    res.status(201).json({
      success: true,
      data: { user, accessToken: tokens.accessToken },
    });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const outcome = await authService.login(req.body, { userAgent: req.get('user-agent') });

    // 2FA on: no session yet — return the challenge and let the client ask for a code.
    if ('twoFactorRequired' in outcome) {
      res.status(200).json({
        success: true,
        data: { twoFactorRequired: true, challengeToken: outcome.challengeToken },
      });
      return;
    }

    res.cookie(REFRESH_COOKIE, outcome.tokens.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: { user: outcome.user, accessToken: outcome.tokens.accessToken },
    });
  }),

  twoFactorLogin: catchAsync(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.verifyTwoFactorLogin(
      req.body.challengeToken,
      req.body.code,
      { userAgent: req.get('user-agent') },
    );

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: { user, accessToken: tokens.accessToken },
    });
  }),

  refresh: catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw AppError.unauthorized('No refresh token provided');

    const result = await authService.refresh(token, { userAgent: req.get('user-agent') });

    // No refreshToken means this call lost a rotation race — the cookie already
    // holds the live token, so leave it alone.
    if (result.refreshToken) {
      res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions);
    }
    res.status(200).json({
      success: true,
      data: { accessToken: result.accessToken },
    });
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
    res.status(200).json({ success: true, data: null });
  }),

  forgotPassword: catchAsync(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email, req.body.captchaToken);
    // Identical response whether the account exists or not.
    res.status(200).json({
      success: true,
      data: { message: 'If that email is registered, a reset link is on its way.' },
    });
  }),

  resetPassword: catchAsync(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({
      success: true,
      data: { message: 'Password updated — you can sign in with it now.' },
    });
  }),

  verifyEmail: catchAsync(async (req: Request, res: Response) => {
    await authService.verifyEmail(req.body.token);
    res.status(200).json({
      success: true,
      data: { message: 'Email verified — thanks for confirming.' },
    });
  }),

  // Requires requireAuth before it in the chain.
  resendVerification: catchAsync(async (req: Request, res: Response) => {
    await authService.resendVerification(req.user!.sub);
    res.status(200).json({
      success: true,
      data: { message: 'Verification email sent — check your inbox.' },
    });
  }),

  // Requires requireAuth before it in the chain.
  me: catchAsync(async (req: Request, res: Response) => {
    const user = await userRepository.findById(req.user!.sub);
    if (!user) throw AppError.unauthorized('Account no longer exists');

    res.status(200).json({ success: true, data: { user } });
  }),

  // Requires requireAuth before it in the chain.
  updateMe: catchAsync(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.sub, req.body);
    res.status(200).json({ success: true, data: { user } });
  }),

  // Requires requireAuth + uploadSingle('file', 'image') before it in the chain.
  updateAvatar: catchAsync(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest('No image was uploaded');
    const user = await authService.updateProfileImage(req.user!.sub, req.file.buffer);
    res.status(200).json({ success: true, data: { user } });
  }),

  // Requires requireAuth before it in the chain.
  changeMyPassword: catchAsync(async (req: Request, res: Response) => {
    const tokens = await authService.changePassword(req.user!.sub, req.body, {
      userAgent: req.get('user-agent'),
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        message: 'Password changed successfully.',
      },
    });
  }),

  // ── 2FA management (all requireAuth) ──────────────────────
  startTwoFactor: catchAsync(async (req: Request, res: Response) => {
    const data = await authService.startTwoFactorSetup(req.user!.sub);
    res.status(200).json({ success: true, data });
  }),

  confirmTwoFactor: catchAsync(async (req: Request, res: Response) => {
    const { recoveryCodes } = await authService.confirmTwoFactorSetup(req.user!.sub, req.body.code);
    res.status(200).json({
      success: true,
      data: { recoveryCodes, message: 'Two-factor is on. Save these recovery codes somewhere safe.' },
    });
  }),

  disableTwoFactor: catchAsync(async (req: Request, res: Response) => {
    await authService.disableTwoFactor(req.user!.sub, req.body.code);
    res.status(200).json({ success: true, data: { message: 'Two-factor turned off.' } });
  }),
};
