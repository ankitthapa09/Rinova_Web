"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";
import { authApi, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import FloatingInput from "./FloatingInput";
import MagneticSubmit, { type SubmitStatus } from "./MagneticSubmit";
import PasswordStrength, { passwordMeetsRules } from "./PasswordStrength";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

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
    if (!passwordMeetsRules(password))
      next.password = "Password doesn't meet all the requirements yet.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      shake();
      return;
    }

    setStatus("loading");
    try {
      const message = await authApi.resetPassword(token, password);
      setStatus("success");
      toast.success(message);
      // Old sessions are dead server-side; sign in fresh.
      window.setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError) {
        // e.g. 400, link expired or already used
        const fieldMsg = Object.values(err.fieldErrors)[0];
        toast.error(fieldMsg ?? err.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      shake();
    }
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <div>
        <FloatingInput
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <PasswordStrength password={password} />
      </div>
      <FloatingInput
        id="confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
      />

      <div data-auth-item className="mt-2">
        <MagneticSubmit status={status} successLabel="Password updated">
          Set New Password
        </MagneticSubmit>
      </div>
    </form>
  );
}
