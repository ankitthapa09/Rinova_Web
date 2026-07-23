import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password — Rinova",
  description: "Request a link to reset your Rinova account password.",
};

export default function ForgotPasswordPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <AuthShell
      eyebrow="Account Recovery"
      title={[{ text: "Locked" }, { text: "out?", accent: true }]}
      subtitle="Tell us your email and we'll send a link to set a new password — valid for 30 minutes."
      watermark="RESET"
      vehicleUrl="/models/car.glb"
      vehicleLength={4.0}
      switchPrompt="Remembered it?"
      switchLabel="Back to sign in"
      switchHref="/login"
    >
      <ForgotPasswordForm siteKey={siteKey} />
    </AuthShell>
  );
}
