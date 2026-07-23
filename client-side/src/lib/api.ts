export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: "user" | "admin";
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/** Carries the server's status and per-field validation messages. */
export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Access token lives in memory only — nothing readable in localStorage for
// XSS to lift. The refresh token is an httpOnly cookie the browser manages.
let accessToken: string | null = null;
// Shared promise while a refresh is in flight — see authApi.refresh().
let refreshInFlight: Promise<void> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

// Non-sensitive flag so anonymous visitors don't fire doomed refresh calls
// (and 401 console noise) on every page. The cookie stays the source of truth.
const SESSION_HINT_KEY = "rinova:hasSession";

export function hasSessionHint(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(SESSION_HINT_KEY) === "1";
}

export function setSessionHint(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) window.localStorage.setItem(SESSION_HINT_KEY, "1");
  else window.localStorage.removeItem(SESSION_HINT_KEY);
}

interface ServerEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // Send/receive the auth cookie across origins (localhost:3002 → :4000)
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is it running?");
  }

  const json = (await res.json().catch(() => null)) as ServerEnvelope<T> | null;

  if (!res.ok || !json?.success) {
    const fieldErrors = Object.fromEntries(
      (json?.errors ?? []).map((e) => [e.field, e.message]),
    );
    throw new ApiError(res.status, json?.message ?? "Something went wrong", fieldErrors);
  }

  return json.data;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

type AuthData = { user: ApiUser; accessToken: string };

/**
 * A normal login either signs you in, or — when 2FA is on — hands back a
 * short-lived challenge and asks for a code. The caller branches on
 * `twoFactorRequired`.
 */
export type LoginResult =
  | { user: ApiUser }
  | { twoFactorRequired: true; challengeToken: string };

// Raw server payload for /auth/login — one of the two shapes above, but with
// the tokens the client keeps to itself.
type LoginData =
  | { user: ApiUser; accessToken: string }
  | { twoFactorRequired: true; challengeToken: string };

/** What the enable step returns — the one-time recovery codes to save. */
export interface TwoFactorSetup {
  secret: string;
  qrDataUrl: string;
}

export const authApi = {
  async register(input: RegisterInput): Promise<ApiUser> {
    const data = await request<AuthData>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    accessToken = data.accessToken;
    setSessionHint(true);
    return data.user;
  },

  async login(input: LoginInput): Promise<LoginResult> {
    const data = await request<LoginData>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    // 2FA is on — no session yet. Pass the challenge back for the code step.
    if ("twoFactorRequired" in data) {
      return { twoFactorRequired: true, challengeToken: data.challengeToken };
    }
    accessToken = data.accessToken;
    setSessionHint(true);
    return { user: data.user };
  },

  /** Second login step: exchange the challenge + a TOTP/recovery code for a session. */
  async twoFactorLogin(challengeToken: string, code: string): Promise<ApiUser> {
    const data = await request<AuthData>("/auth/login/2fa", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code }),
    });
    accessToken = data.accessToken;
    setSessionHint(true);
    return data.user;
  },

  async logout(): Promise<void> {
    await request<null>("/auth/logout", { method: "POST" });
    accessToken = null;
    setSessionHint(false);
  },

  /**
   * Restores a session from the refresh cookie (e.g. after a page reload).
   *
   * Single-flight: parallel callers share one request. Refresh tokens rotate,
   * so a second simultaneous call would present a token the first already
   * replaced — indistinguishable from a stolen token being replayed, which
   * revokes every session. React's dev StrictMode double-invokes effects, so
   * this is the normal case, not an edge case.
   */
  refresh(): Promise<void> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      try {
        const data = await request<{ accessToken: string }>("/auth/refresh", { method: "POST" });
        accessToken = data.accessToken;
        setSessionHint(true);
      } catch (err) {
        setSessionHint(false);
        throw err;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  },

  me(): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>("/auth/me");
  },

  /** Requests a reset link — the server never says whether the email exists. */
  async forgotPassword(email: string): Promise<string> {
    const { message } = await request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return message;
  },

  /** Sets a new password using the token from the emailed link. */
  async resetPassword(token: string, password: string): Promise<string> {
    const { message } = await request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    return message;
  },

  /** Confirms an email with the token from the verification link. */
  async verifyEmail(token: string): Promise<string> {
    const { message } = await request<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    return message;
  },

  /** Fresh verification link for the signed-in user. */
  async resendVerification(): Promise<string> {
    const { message } = await request<{ message: string }>("/auth/resend-verification", {
      method: "POST",
    });
    return message;
  },

  // ── Two-factor management (signed-in user) ────────────────

  /** Begins setup: reserves a secret and returns a QR + manual key to scan. */
  startTwoFactorSetup(): Promise<TwoFactorSetup> {
    return request<TwoFactorSetup>("/auth/2fa/setup", { method: "POST" });
  },

  /** Confirms a scanned code and flips 2FA on — returns the one-time recovery codes. */
  async confirmTwoFactorSetup(code: string): Promise<string[]> {
    const { recoveryCodes } = await request<{ recoveryCodes: string[] }>("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    return recoveryCodes;
  },

  /** Turns 2FA off — needs a fresh code to prove it's really the account owner. */
  async disableTwoFactor(code: string): Promise<string> {
    const { message } = await request<{ message: string }>("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    return message;
  },
};
