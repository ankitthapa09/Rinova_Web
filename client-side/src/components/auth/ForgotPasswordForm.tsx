"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";
import { authApi, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [sent, setSent] = useState(false);

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

    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      shake();
      return;
    }
    setError(undefined);

    setStatus("loading");
    try {
      await authApi.forgotPassword(email);
      setStatus("success");
      setSent(true);
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      shake();
    }
  };

  // "check your inbox" state
  if (sent) {
    return (
      <div className="flex flex-col items-start gap-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent">
          <MailCheck className="h-5 w-5" />
        </span>
        <p className="text-[15px] leading-relaxed text-fog">
          If <span className="text-cream">{email}</span> is registered, a reset link is on its way.
          It works for the next 30 minutes — check the spam folder too.
        </p>
        <Link href="/login" className="nav-link text-[13px] font-medium text-accent">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <FloatingInput
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />

      <div data-auth-item className="mt-2">
        <MagneticSubmit status={status} successLabel="Link sent">
          Send Reset Link
        </MagneticSubmit>
      </div>
    </form>
  );
}
