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
