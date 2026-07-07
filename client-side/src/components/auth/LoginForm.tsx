"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const shake = () => {
    if (!formRef.current || !window.matchMedia(MOTION_OK).matches) return;
    gsap.fromTo(
      formRef.current,
      { x: 0 },
      { keyframes: { x: [-9, 9, -6, 6, 0] }, duration: 0.45, ease: "power2.out" },
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;

    const next: typeof errors = {};
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      shake();
      return;
    }

    // TODO(sprint2): POST to the server-side auth API
    setStatus("loading");
    window.setTimeout(() => {
      setStatus("success");
      window.setTimeout(() => router.push("/"), 900);
    }, 1100);
  };

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
        <Link href="#" className="nav-link text-fog hover:text-cream">
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
