const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: "user" | "admin";
  isEmailVerified: boolean;
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

export function getAccessToken(): string | null {
  return accessToken;
}

interface ServerEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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

export const authApi = {
  async register(input: RegisterInput): Promise<ApiUser> {
    const data = await request<AuthData>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    accessToken = data.accessToken;
    return data.user;
  },

  async login(input: LoginInput): Promise<ApiUser> {
    const data = await request<AuthData>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    accessToken = data.accessToken;
    return data.user;
  },

  async logout(): Promise<void> {
    await request<null>("/auth/logout", { method: "POST" });
    accessToken = null;
  },

  /** Restores a session from the refresh cookie (e.g. after a page reload). */
  async refresh(): Promise<void> {
    const data = await request<{ accessToken: string }>("/auth/refresh", { method: "POST" });
    accessToken = data.accessToken;
  },

  me(): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>("/auth/me");
  },
};
