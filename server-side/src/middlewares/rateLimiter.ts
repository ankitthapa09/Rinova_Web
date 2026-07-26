import { rateLimit } from 'express-rate-limit';
import { env } from '@/config/env';

const limited = { success: false, message: 'Too many requests, please try again later' };

/** Baseline limit for the whole API. */
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited,
});

// stricter on credential endpoints, only failed attempts count so a brute force
// gets cut off after a few tries per window
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited,
});

// login also has a per-account lockout (12 tries then 15 min) which is the real brake, so this limiter sits high enough to let that message show
export const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited,
});

// reset endpoints count every request since forgot-password always answers 200,
// so a failures-only limiter would never throttle it
export const resetLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited,
});
