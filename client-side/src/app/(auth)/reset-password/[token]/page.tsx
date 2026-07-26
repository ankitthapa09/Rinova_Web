import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password | Rinova",
  description: "Set a new password for your Rinova account.",
};

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return (
    <AuthShell
      eyebrow="Account Recovery"
      title={[{ text: "New" }, { text: "password.", accent: true }]}
      subtitle="Pick something strong you haven't used elsewhere. This signs out every other session."
      watermark="RESET"
      vehicleUrl="/models/car.glb"
      vehicleLength={4.0}
      switchPrompt="Remembered the old one?"
      switchLabel="Back to sign in"
      switchHref="/login"
    >
      <ResetPasswordForm token={params.token} />
    </AuthShell>
  );
}
