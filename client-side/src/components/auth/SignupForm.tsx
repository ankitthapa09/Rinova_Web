"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

/** 0–4: length, upper+lower mix, digit, symbol */
function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score;
}

interface Fields {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export default function SignupForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Fields>({ name: "", email: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | "terms", string>>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const score = passwordScore(fields.password);

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

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
    if (fields.name.trim().length < 2) next.name = "Enter your full name.";
    if (!EMAIL_RE.test(fields.email)) next.email = "Enter a valid email address.";
    if (fields.password.length < 8) next.password = "Use at least 8 characters.";
    if (fields.confirm !== fields.password || !fields.confirm)
      next.confirm = "Passwords don't match.";
    if (!terms) next.terms = "Please accept the terms to continue.";
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
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FloatingInput
        id="name"
        label="Full name"
        autoComplete="name"
        value={fields.name}
        onChange={set("name")}
        error={errors.name}
      />
      <FloatingInput
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={fields.email}
        onChange={set("email")}
        error={errors.email}
      />

      <div>
        <FloatingInput
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={fields.password}
          onChange={set("password")}
          error={errors.password}
        />
        {/* Strength meter: four segments fill as the password hardens */}
        <div data-auth-item className="mt-3 flex items-center gap-3" aria-hidden={!fields.password}>
          <div className="flex flex-1 gap-1.5">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={`h-[3px] flex-1 rounded-full transition-all duration-500 ease-expo ${
                  fields.password && score >= step ? "bg-accent" : "bg-cream/10"
                }`}
              />
            ))}
          </div>
          <span className="w-12 text-right text-[10px] uppercase tracking-[0.15em] text-fog">
            {fields.password ? STRENGTH_LABELS[score] : ""}
          </span>
        </div>
      </div>

      <FloatingInput
        id="confirm"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={fields.confirm}
        onChange={set("confirm")}
        error={errors.confirm}
      />

      <div data-auth-item>
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-fog transition-colors hover:text-cream">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-cream/25 text-[11px] leading-none text-transparent transition-all duration-300 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-night peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          >
            ✓
          </span>
          <span>
            I agree to the <span className="text-cream">Terms of Service</span> and{" "}
            <span className="text-cream">Privacy Policy</span>.
          </span>
        </label>
        {errors.terms ? <p className="mt-2 text-xs text-accent">{errors.terms}</p> : null}
      </div>

      <div data-auth-item className="mt-1">
        <MagneticSubmit status={status} successLabel="You're in">
          Create Account
        </MagneticSubmit>
      </div>
    </form>
  );
}
