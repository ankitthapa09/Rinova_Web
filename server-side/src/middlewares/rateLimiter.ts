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

// Much stricter on credential endpoints: only failed attempts count, so a
// brute-force gets cut off after a handful of tries per window.
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited,
});

// Login has its own per-account lockout (12 failed tries → 15-min lock), which
// is the real brake here — so this IP limiter is set high enough to let that
// lockout message surface instead of a generic "too many requests". Only failed
// attempts count; a script hammering many accounts from one IP still gets cut off.
export const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited,
});

// Reset endpoints count every request — forgot-password always answers 200,
// so a failures-only limiter would never throttle it.
export const resetLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited,
});
