import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env } from '@/config/env';

export type UserRole = 'user' | 'admin';

/** How long a reset link stays usable. Short on purpose — the link sits in an
 *  inbox, which is the weakest part of the chain. */
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export interface IUser {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  /** SHA-256 of the reset token — never the token itself, so a database leak
   *  can't be replayed into a password reset. */
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  /** When the password last changed. Tokens minted before this are rejected,
   *  which logs every existing session out on a reset. */
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  /** Mints a reset token, stores only its hash, and returns the raw token for
   *  the email. The raw value exists in memory and the inbox — nowhere else. */
  createPasswordResetToken(): string;
  clearPasswordReset(): void;
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

  // Stamp the change so tokens issued earlier stop working. Backdated a second
  // because the JWT may be signed just before this save commits, and a token
  // minted in that gap must not look "older" than the change.
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.method('comparePassword', function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
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

export const User = model<IUser, UserModel>('User', userSchema);
