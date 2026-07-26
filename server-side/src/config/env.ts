import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // Database
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // JWT, secrets must be long enough to be meaningfully hard to brute force
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Admin seed, credentials for the `seed:admin` script.

  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().default('Rinova Admin'),
  ADMIN_PHONE: z.string().default('9800000000'),
  ADMIN_ADDRESS: z.string().default('Kathmandu, Nepal'),

  // Cloudinary, media storage for vehicle photos and 3D models.

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // App URL, the canonical client origin used in email links.
  CLIENT_URL: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((url) => url.trim()).filter(Boolean))
    .pipe(z.array(z.url())),

  // Email (SMTP), optional in dev; auth flows degrade gracefully without it
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Rinova <no-reply@rinova.com.np>'),

  // Captcha, Turnstile is used for the public auth forms when configured.
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // OAuth (Google), optional; the "Continue with Google" button is hidden and
  // the routes 404 when these are unset, so the app runs fine without them.
  // The client secret lives only here on the server, never in the browser.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Must exactly match the redirect URI registered in Google Cloud Console. */
  GOOGLE_CALLBACK_URL: z
    .url()
    .default('http://localhost:4000/api/v1/auth/oauth/google/callback'),

  // Rate limiting
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // Logger isn't available this early, it depends on validated config itself.
  console.error(`\n Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && !parsed.data.TURNSTILE_SECRET_KEY) {
  console.error('\n Invalid environment configuration:\n  • TURNSTILE_SECRET_KEY: is required in production\n');
  process.exit(1);
}

const clientUrls = parsed.data.CLIENT_URL;

export const env = {
  ...parsed.data,
  CLIENT_URL: clientUrls[0],
};

export const clientUrlList = clientUrls;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
