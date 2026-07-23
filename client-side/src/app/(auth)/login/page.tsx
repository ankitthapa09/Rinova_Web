import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Rinova",
  description: "Sign in to your Rinova account to manage bookings, washes, and rentals.",
};

export default function LoginPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <AuthShell
      eyebrow="Members Garage"
      title={[{ text: "Welcome" }, { text: "back.", accent: true }]}
      subtitle="Sign in to manage your bookings, washes, and rentals — the garage kept your spot."
      watermark="GARAGE"
      vehicleUrl="/models/car.glb"
      vehicleLength={4.0}
      switchPrompt="New to Rinova?"
      switchLabel="Create an account"
      switchHref="/signup"
    >
      <LoginForm siteKey={siteKey} />
    </AuthShell>
  );
}
