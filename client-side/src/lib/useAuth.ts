"use client";

import { useEffect, useState } from "react";
import { authApi, getAccessToken, type ApiUser } from "./api";

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
}

/**
 * Resolves the current session. The access token lives in memory, so after a
 * hard navigation it's gone — we restore it from the httpOnly refresh cookie
 * (refresh → me). Resolves to user: null when there's no valid session.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!getAccessToken()) await authApi.refresh();
        const { user } = await authApi.me();
        if (!cancelled) setState({ user, loading: false });
      } catch {
        if (!cancelled) setState({ user: null, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
