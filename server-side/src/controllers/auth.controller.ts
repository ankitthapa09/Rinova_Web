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
    const { user, tokens } = await authService.login(req.body, {
      userAgent: req.get('user-agent'),
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: { user, accessToken: tokens.accessToken },
    });
  }),

  refresh: catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw AppError.unauthorized('No refresh token provided');

    const tokens = await authService.refresh(token, { userAgent: req.get('user-agent') });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
    res.status(200).json({ success: true, data: null });
  }),

  forgotPassword: catchAsync(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
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
};
