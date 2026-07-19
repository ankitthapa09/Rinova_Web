"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";
import { authApi, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";
import PasswordStrength, { passwordMeetsRules } from "./PasswordStrength";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^9[78]\d{8}$/;

interface Fields {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  confirm: string;
}

export default function SignupForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Fields>({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirm: "",
  });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | "terms", string>>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;

    const next: typeof errors = {};
    if (fields.name.trim().length < 2) next.name = "Enter your full name.";
    if (!EMAIL_RE.test(fields.email)) next.email = "Enter a valid email address.";
    if (!PHONE_RE.test(fields.phone)) next.phone = "Enter a valid 10-digit mobile (98XXXXXXXX).";
    if (fields.address.trim().length < 3) next.address = "Enter your address.";
    if (!passwordMeetsRules(fields.password))
      next.password = "Password doesn't meet all the requirements yet.";
    if (fields.confirm !== fields.password || !fields.confirm)
      next.confirm = "Passwords don't match.";
    if (!terms) next.terms = "Please accept the terms to continue.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      shake();
      return;
    }

    setStatus("loading");
    try {
      const user = await authApi.register({
        name: fields.name.trim(),
        email: fields.email,
        phone: fields.phone,
        address: fields.address.trim(),
        password: fields.password,
      });
      setStatus("success");
      toast.success(`Welcome to the garage, ${user.name.split(" ")[0]}.`);
      window.setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      shake();
    }
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
      <FloatingInput
        id="phone"
        label="Mobile number"
        type="tel"
        autoComplete="tel"
        value={fields.phone}
        onChange={set("phone")}
        error={errors.phone}
      />
      <FloatingInput
        id="address"
        label="Address"
        autoComplete="street-address"
        value={fields.address}
        onChange={set("address")}
        error={errors.address}
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
        <PasswordStrength password={fields.password} />
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
