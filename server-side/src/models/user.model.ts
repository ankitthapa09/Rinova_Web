import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env } from '@/config/env';

export type UserRole = 'user' | 'admin';

/** Reset link lifetime — short since it sits in an inbox. */
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
/** Verification link lifetime — lower stakes, so it can live longer. */
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
/** How many previous passwords a new one may not repeat. */
export const PASSWORD_HISTORY_LIMIT = 5;
/** Failed logins before the account locks, and for how long. */
export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
/** Max sessions kept per user; oldest is evicted past this. */
export const MAX_SESSIONS = 10;
/** How long the just-replaced token stays acceptable after a rotation. Two tabs
 *  reloading together send the same token at the same moment; without this the
 *  slower one looks like a replay and would revoke every session. */
export const ROTATION_GRACE_MS = 20 * 1000;

/** One active refresh token. Only its hash is stored, never the token itself. */
export interface RefreshSession {
  /** Rotation chain id — constant across rotations, new per login. */
  family: string;
  tokenHash: string;
  /** The hash this one replaced, honoured briefly (see ROTATION_GRACE_MS). */
  previousTokenHash?: string;
  rotatedAt?: Date;
  expiresAt: Date;
  userAgent?: string;
  createdAt: Date;
}

export interface IUser {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  /** SHA-256 of the reset token — never the token itself. */
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  /** Tokens minted before this are rejected, logging old sessions out. */
  passwordChangedAt?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  /** Recent bcrypt hashes, newest first — blocks password reuse. */
  passwordHistory?: string[];
  failedLoginAttempts?: number;
  lockUntil?: Date;
  /** One session per signed-in device, rotated on every refresh. */
  refreshSessions?: RefreshSession[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  /** True if the candidate matches the current password or a recent one. */
  isPasswordReused(candidate: string): Promise<boolean>;
  /** Mints a reset token, stores only its hash, returns the raw token to email. */
  createPasswordResetToken(): string;
  clearPasswordReset(): void;
  createEmailVerificationToken(): string;
  clearEmailVerification(): void;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      // Nepali mobile numbers: 10 digits starting 97/98 (basic shape check;
      // the request validator enforces the stricter rule with clear messages)
      match: [/^9[78]\d{8}$/, 'Enter a valid 10-digit mobile number'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    // Reset state is never selected by default and never serialized.
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordHistory: {
      type: [String],
      select: false,
      default: undefined,
    },
    failedLoginAttempts: {
      type: Number,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    refreshSessions: {
      type: [
        new Schema<RefreshSession>(
          {
            family: { type: String, required: true },
            tokenHash: { type: String, required: true },
            previousTokenHash: { type: String },
            rotatedAt: { type: Date },
            expiresAt: { type: Date, required: true },
            userAgent: { type: String },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      select: false,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Strip sensitive/internal fields from any serialized user.
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.passwordChangedAt;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordHistory;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.refreshSessions;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Hash the password whenever it's set or changed, so no write path can accidentally store it raw.

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);

  // Backdated a second so a token signed just before this save still counts as "before".
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.method('comparePassword', function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
});

userSchema.method('isPasswordReused', async function isPasswordReused(candidate: string) {
  const hashes = [this.password, ...(this.passwordHistory ?? [])].filter(Boolean);
  for (const hash of hashes) {
    if (await bcrypt.compare(candidate, hash)) return true;
  }
  return false;
});

userSchema.method('createPasswordResetToken', function createPasswordResetToken() {
  // 32 random bytes — unguessable, and never stored in this form.
  const raw = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(raw).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  return raw;
});

userSchema.method('clearPasswordReset', function clearPasswordReset() {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
});

userSchema.method('createEmailVerificationToken', function createEmailVerificationToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(raw).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
  return raw;
});

userSchema.method('clearEmailVerification', function clearEmailVerification() {
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
});

export const User = model<IUser, UserModel>('User', userSchema);
