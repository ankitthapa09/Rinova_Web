import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { env } from '@/config/env';

/**
 * Time-based one-time passwords (RFC 6238) for authenticator apps, plus the
 * recovery codes that get a user back in without their phone.
 */

const ISSUER = 'Rinova';
const RECOVERY_CODE_COUNT = 10;
// Accept a code ±30s from now, covering a phone whose clock drifts from ours.
const TOLERANCE_SECONDS = 30;

export interface TotpVerifyResult {
  valid: boolean;
  /** The time-step the code belonged to, store it to block replay of that code. */
  step?: number;
}

export const totpService = {
  /** A fresh base32 secret for one account. */
  generateSecret(): string {
    return generateSecret();
  },

  /** The otpauth:// URI the QR code encodes, label ties it to this account. */
  keyUri(email: string, secret: string): string {
    return generateURI({ strategy: 'totp', issuer: ISSUER, label: email, secret });
  },

  /** The QR image as a data URI the browser can render inline. */
  qrDataUrl(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri);
  },

  /**
   * Checks a 6-digit code. `afterStep` rejects any code from that step or
   * earlier, so a code already used can't be replayed inside its window.
 */
  async verify(token: string, secret: string, afterStep?: number): Promise<TotpVerifyResult> {
    // otplib returns timeStep at runtime but doesn't surface it on the success
    // type, read it through a narrow cast.
    const result = (await verify({
      token,
      secret,
      epochTolerance: TOLERANCE_SECONDS,
      ...(afterStep !== undefined ? { afterTimeStep: afterStep } : {}),
    })) as { valid: boolean; timeStep?: number };
    return result.valid ? { valid: true, step: result.timeStep } : { valid: false };
  },

  /**
   * Ten recovery codes. Returns the plaintext (shown once) and their bcrypt
   * hashes (all we keep), formatted in two blocks for easy reading, e.g. "3f9a-c1b7".
 */
  async generateRecoveryCodes(): Promise<{ plain: string[]; hashed: string[] }> {
    const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      const raw = crypto.randomBytes(4).toString('hex');
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    });
    const hashed = await Promise.all(plain.map((code) => bcrypt.hash(code, env.BCRYPT_SALT_ROUNDS)));
    return { plain, hashed };
  },

  /** Index of the stored hash a recovery code matches, or -1. Caller removes it. */
  async matchRecoveryCode(code: string, hashes: string[]): Promise<number> {
    const normalized = code.trim().toLowerCase();
    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(normalized, hashes[i] as string)) return i;
    }
    return -1;
  },
};
