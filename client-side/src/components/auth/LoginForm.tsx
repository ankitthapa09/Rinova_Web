"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";
import { authApi, ApiError, type ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/components/ui/toast";
import CaptchaWidget from "./CaptchaWidget";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";
import SocialAuth from "./SocialAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginFormProps {
  siteKey?: string;
}

export default function LoginForm({ siteKey }: LoginFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Set once the server asks for a second factor, flips the form to code entry.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    code?: string;
    captcha?: string;
  }>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  // Account lockout, server hands back how long to wait; we count it down here.
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);
  // Already signed in (e.g. arrived here with the back button)? Don't show the
  // form, send them where they belong. Passive, no network call for guests.
  const { user: session, loading: sessionLoading } = useAuth(true);

  useEffect(() => {
    if (sessionLoading || !session) return;
    router.replace(session.role === "admin" ? "/admin" : "/dashboard");
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!lockUntil) return;
    const tick = () => {
      const rem = Math.ceil((lockUntil - Date.now()) / 1000);
      if (rem <= 0) {
        setLockUntil(null);
        setLockRemaining(0);
      } else {
        setLockRemaining(rem);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lockUntil]);

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
    // replace, not push, going Back should skip the login page, not return to it.
    const destination = user.role === "admin" ? "/admin" : "/dashboard";
    window.setTimeout(() => router.replace(destination), 900);
  };

  const onError = (err: unknown) => {
    setStatus("idle");
    if (err instanceof ApiError) {
      // Lockout (423) / rate-limit (429) tell us how long to disable the button.
      if (err.retryAfter) setLockUntil(Date.now() + err.retryAfter * 1000);
      setErrors({
        ...err.fieldErrors,
        captcha: err.fieldErrors.captchaToken,
      });
      if (Object.keys(err.fieldErrors).length === 0) toast.error(err.message);
    } else {
      toast.error("Something went wrong. Please try again.");
    }
    shake();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle" || lockRemaining > 0) return;

    // Step two, a 2FA code is expected
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

    // Step one, email + password
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    if (!captchaToken) next.captcha = "Complete the captcha challenge.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      shake();
      return;
    }

    setStatus("loading");
    try {
      const result = await authApi.login({ email, password, captchaToken: captchaToken ?? undefined });
      // 2FA on, no session yet. Move to the code step instead of redirecting.
      if ("twoFactorRequired" in result) {
        setStatus("idle");
        setChallengeToken(result.challengeToken);
        setErrors({});
        return;
      }
      finishSignIn(result.user);
    } catch (err) {
      setCaptchaReset((value) => value + 1);
      setCaptchaToken(null);
      onError(err);
    }
  };

  // Second step, authenticator / recovery code
  if (challengeToken) {
    return (
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
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

  // First step, credentials
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <SocialAuth label="Continue with Google" />

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
        <CaptchaWidget siteKey={siteKey} resetSignal={captchaReset} onTokenChange={setCaptchaToken} />
        {errors.captcha ? <p className="mt-2 text-xs text-accent">{errors.captcha}</p> : null}
      </div>

      <div data-auth-item className="mt-2">
        <MagneticSubmit
          status={status}
          successLabel="Welcome back"
          locked={lockRemaining > 0}
          lockedLabel={`Locked · ${Math.floor(lockRemaining / 60)}:${String(lockRemaining % 60).padStart(2, "0")}`}
        >
          Sign In
        </MagneticSubmit>
      </div>
    </form>
  );
}
