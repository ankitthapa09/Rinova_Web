"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";
import { authApi, ApiError, type ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/components/ui/toast";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Set once the server asks for a second factor — flips the form to code entry.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; code?: string }>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  // Already signed in (e.g. arrived here with the back button)? Don't show the
  // form — send them where they belong. Passive: no network call for guests.
  const { user: session, loading: sessionLoading } = useAuth(true);

  useEffect(() => {
    if (sessionLoading || !session) return;
    router.replace(session.role === "admin" ? "/admin" : "/dashboard");
  }, [sessionLoading, session, router]);

  const shake = () => {
    if (!formRef.current || !window.matchMedia(MOTION_OK).matches) return;
    gsap.fromTo(
      formRef.current,
      { x: 0 },
      { keyframes: { x: [-9, 9, -6, 6, 0] }, duration: 0.45, ease: "power2.out" },
    );
  };

  // Shared success landing for both the one-step and two-step flows.
  const finishSignIn = (user: ApiUser) => {
    setStatus("success");
    toast.success(`Welcome back, ${user.name.split(" ")[0]}.`);
    // replace, not push — going Back should skip the login page, not return to it.
    const destination = user.role === "admin" ? "/admin" : "/dashboard";
    window.setTimeout(() => router.replace(destination), 900);
  };

  const onError = (err: unknown) => {
    setStatus("idle");
    if (err instanceof ApiError) {
      setErrors(err.fieldErrors);
      if (Object.keys(err.fieldErrors).length === 0) toast.error(err.message);
    } else {
      toast.error("Something went wrong. Please try again.");
    }
    shake();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;

    // ── Step two: a 2FA code is expected ──────────────────
    if (challengeToken) {
      if (!code.trim()) {
        setErrors({ code: "Enter your code." });
        shake();
        return;
      }
      setStatus("loading");
      try {
        finishSignIn(await authApi.twoFactorLogin(challengeToken, code.trim()));
      } catch (err) {
        // A dead challenge (expired/used) means starting over from credentials.
        if (err instanceof ApiError && err.status === 401) {
          setChallengeToken(null);
          setCode("");
          setPassword("");
        }
        onError(err);
      }
      return;
    }

    // ── Step one: email + password ────────────────────────
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      shake();
      return;
    }

    setStatus("loading");
    try {
      const result = await authApi.login({ email, password });
      // 2FA on — no session yet. Move to the code step instead of redirecting.
      if ("twoFactorRequired" in result) {
        setStatus("idle");
        setChallengeToken(result.challengeToken);
        setErrors({});
        return;
      }
      finishSignIn(result.user);
    } catch (err) {
      onError(err);
    }
  };

  // ── Second step: authenticator / recovery code ──────────
  if (challengeToken) {
    return (
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
        <div data-auth-item>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            Two-step verification
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fog">
            Open your authenticator app and enter the 6-digit code. No phone?
            Use one of your saved recovery codes instead.
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
          error={errors.code}
        />

        <div data-auth-item className="mt-2">
          <MagneticSubmit status={status} successLabel="Verified">
            Verify
          </MagneticSubmit>
        </div>

        <button
          type="button"
          data-auth-item
          onClick={() => {
            setChallengeToken(null);
            setCode("");
            setErrors({});
          }}
          className="nav-link mx-auto text-[13px] text-fog hover:text-cream"
        >
          Use a different account
        </button>
      </form>
    );
  }

  // ── First step: credentials ─────────────────────────────
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <FloatingInput
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <FloatingInput
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />

      <div data-auth-item className="flex items-center justify-between text-[13px]">
        <label className="flex cursor-pointer items-center gap-2.5 text-fog transition-colors hover:text-cream">
          <input type="checkbox" name="remember" className="peer sr-only" />
          <span
            aria-hidden
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-cream/25 text-[11px] leading-none text-transparent transition-all duration-300 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-night peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          >
            ✓
          </span>
          Remember me
        </label>
        <Link href="/forgot-password" className="nav-link text-fog hover:text-cream">
          Forgot password?
        </Link>
      </div>

      <div data-auth-item className="mt-2">
        <MagneticSubmit status={status} successLabel="Welcome back">
          Sign In
        </MagneticSubmit>
      </div>
    </form>
  );
}
