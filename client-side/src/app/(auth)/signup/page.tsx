import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account — Rinova",
  description: "Join Rinova to book premium vehicle rentals and professional washes in minutes.",
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Join the Club"
      title={[{ text: "Join the" }, { text: "garage.", accent: true }]}
      subtitle="One account for rentals and washes — book a ride or a detail in under a minute."
      watermark="MEMBER"
      vehicleUrl="/models/suv.glb"
      vehicleLength={3.9}
      switchPrompt="Already have an account?"
      switchLabel="Sign in"
      switchHref="/login"
    >
      <SignupForm />
    </AuthShell>
  );
}
