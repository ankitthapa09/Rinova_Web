"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, ApiError, type ApiUser } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";

/**
 * Landing page for the Google OAuth redirect. The server has already set the
 * refresh cookie (or, for a 2FA account, handed us a challenge in the URL).
 *
 *  - ?error=<code>  → show why it failed, offer a way back
 *  - ?twofa=<token> → the account has 2FA on; finish with a code
 *  - ?ok=1          → exchange the cookie for a session and route onward
 */

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Google sign-in was cancelled.",
  state: "That sign-in link expired or didn't check out. Please try again.",
  failed: "We couldn't complete Google sign-in. Please try again.",
};

export default function OAuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");
  const twofa = params.get("twofa");

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const ran = useRef(false);

  const land = (user: ApiUser) => {
    toast.success(`Welcome, ${user.name.split(" ")[0]}.`);
    router.replace(user.role === "admin" ? "/admin" : "/dashboard");
  };

  // Plain success: the refresh cookie is set — turn it into a live session, then
  // route. Runs once (refresh() is single-flight, but the ref guards StrictMode).
  useEffect(() => {
    if (error || twofa || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        await authApi.refresh();
        const { user } = await authApi.me();
        land(user);
      } catch {
        toast.error("We couldn't complete sign-in. Please try again.");
        router.replace("/login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, twofa]);

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-fog">
          {ERROR_MESSAGES[error] ?? "Google sign-in failed."}
        </p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="nav-link text-[13px] text-cream hover:text-accent"
        >
          Back to sign in
        </button>
      </Shell>
    );
  }

  // ── 2FA required ──────────────────────────────────────────
  if (twofa) {
    const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (status !== "idle") return;
      if (!code.trim()) {
        setCodeError("Enter your code.");
        return;
      }
      setStatus("loading");
      setCodeError(undefined);
      try {
        const user = await authApi.twoFactorLogin(twofa, code.trim());
        setStatus("success");
        land(user);
      } catch (err) {
        setStatus("idle");
        // A dead challenge (expired/used) means restarting sign-in.
        if (err instanceof ApiError && err.status === 401) {
          toast.error("That sign-in session expired. Please sign in again.");
          router.replace("/login");
          return;
        }
        setCodeError(err instanceof ApiError ? err.message : "Invalid code.");
      }
    };

    return (
      <Shell>
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-xs flex-col gap-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
              Two-step verification
            </p>
            <p className="mt-3 text-sm leading-relaxed text-fog">
              Open your authenticator app and enter the 6-digit code. No phone? Use a
              recovery code instead.
            </p>
          </div>

          <FloatingInput
            id="code"
            label="Authentication code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={codeError}
          />

          <MagneticSubmit status={status} successLabel="Verified">
            Verify
          </MagneticSubmit>
        </form>
      </Shell>
    );
  }

  // ── Working (exchanging the cookie) ───────────────────────
  return (
    <Shell>
      <p className="text-sm text-fog">Completing sign-in…</p>
    </Shell>
  );
}

/** Minimal centred frame — the (auth) layout has no chrome of its own. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-night px-6 text-center">
      <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">Rinova</div>
      {children}
    </div>
  );
}
