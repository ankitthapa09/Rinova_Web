"use client";

import { useEffect, useState } from "react";
import { authApi, getAccessToken, hasSessionHint, type ApiUser } from "./api";

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
}

/**
 * Resolves the current session. The access token lives in memory, so after a
 * hard navigation it's gone, we restore it from the httpOnly refresh cookie
 * (refresh to me). Resolves to user, null when there's no valid session.
 *
 * `passive` (navbar and other optional UI), when nothing suggests a session
 * exists, resolve to null without any network calls, anonymous visitors
 * shouldn't fire doomed 401 probes on every page.
 */
export function useAuth(passive = false): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (passive && !getAccessToken() && !hasSessionHint()) {
        setState({ user: null, loading: false });
        return;
      }
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
  }, [passive]);

  return state;
}
