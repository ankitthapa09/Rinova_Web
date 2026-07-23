import { Router } from 'express';
import { authController } from '@/controllers/auth.controller';
import { validate } from '@/middlewares/validate';
import { requireAuth } from '@/middlewares/auth.middleware';
import { authLimiter, resetLimiter } from '@/middlewares/rateLimiter';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  twoFactorLoginSchema,
  twoFactorCodeSchema,
} from '@/validators/auth.validator';

const router = Router();

// Credential endpoints get the strict limiter (failed attempts only)
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
// Second login step — limited too, so a 6-digit code can't be brute-forced.
router.post(
  '/login/2fa',
  authLimiter,
  validate(twoFactorLoginSchema),
  authController.twoFactorLogin,
);

// 2FA management — all require a live session.
router.post('/2fa/setup', requireAuth, authController.startTwoFactor);
router.post(
  '/2fa/enable',
  requireAuth,
  validate(twoFactorCodeSchema),
  authController.confirmTwoFactor,
);
router.post(
  '/2fa/disable',
  requireAuth,
  validate(twoFactorCodeSchema),
  authController.disableTwoFactor,
);

// Reset endpoints use the count-everything limiter (see rateLimiter.ts)
router.post(
  '/forgot-password',
  resetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  resetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// Email verification: redeeming is public (clicked from an inbox, maybe not
// signed in); resending needs a session and shares the reset limiter.
router.post('/verify-email', resetLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', resetLimiter, requireAuth, authController.resendVerification);

// Failed refreshes count like failed logins — a stolen-cookie brute force
// shouldn't get unlimited tries.
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
