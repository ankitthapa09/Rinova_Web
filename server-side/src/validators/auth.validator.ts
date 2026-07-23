import { z } from 'zod';

/**
 * Request-body contracts for the auth endpoints. These run in the `validate`
 * middleware before a request reaches the controller, so the layers below
 * only ever see well-formed, typed input. Rules mirror the client-side form
 * checks — the server is the one that actually enforces them.
 */

/** The one password rule, used everywhere a password is set. Length bounds
 *  plus one of each character class; the 72 cap exists because bcrypt only
 *  hashes the first 72 bytes and would silently truncate longer input. */
export const passwordRule = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number')
  .regex(/[^a-zA-Z0-9]/, 'Add a symbol (e.g. ! @ # $)');

export const registerSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  phone: z
    .string({ error: 'Contact number is required' })
    .trim()
    .regex(/^9[78]\d{8}$/, 'Enter a valid 10-digit mobile number (98XXXXXXXX)'),
  address: z
    .string({ error: 'Address is required' })
    .trim()
    .min(3, 'Address must be at least 3 characters')
    .max(120, 'Address must be at most 120 characters'),
  password: passwordRule,
  captchaToken: z.string({ error: 'Captcha verification is required' }).min(1).optional(),
});

/** Self-service profile edit — the contact fields only, reusing register's rules.
 *  Email and role are intentionally out of reach here. */
export const updateProfileSchema = registerSchema.pick({ name: true, phone: true, address: true });

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string({ error: 'Password is required' }).min(1, 'Enter your password'),
  captchaToken: z.string({ error: 'Captcha verification is required' }).min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  captchaToken: z.string({ error: 'Captcha verification is required' }).min(1).optional(),
});

export const resetPasswordSchema = z.object({
  // the raw token from the emailed link
  token: z
    .string({ error: 'Reset token is missing' })
    .regex(/^[a-f0-9]{64}$/, 'This reset link is not valid'),
  password: passwordRule,
});

export const verifyEmailSchema = z.object({
  token: z
    .string({ error: 'Verification token is missing' })
    .regex(/^[a-f0-9]{64}$/, 'This verification link is not valid'),
});

/** A 6-digit TOTP code or a recovery code like "3f9a-c1b7". */
const codeField = z
  .string({ error: 'Enter your code' })
  .trim()
  .min(6, 'Enter your 6-digit code')
  .max(20, 'That code is too long');

/** Second login step — the challenge proves the password already passed. */
export const twoFactorLoginSchema = z.object({
  challengeToken: z.string({ error: 'Verification session missing' }).min(1),
  code: codeField,
});

/** Confirming setup, or disabling — both need a live code. */
export const twoFactorCodeSchema = z.object({
  code: codeField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
