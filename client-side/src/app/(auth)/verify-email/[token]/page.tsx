import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import VerifyEmailStatus from "@/components/auth/VerifyEmailStatus";

export const metadata: Metadata = {
  title: "Verify Email | Rinova",
  description: "Confirm the email address on your Rinova account.",
};

export default function VerifyEmailPage({ params }: { params: { token: string } }) {
  return (
    <AuthShell
      eyebrow="Account Verification"
      title={[{ text: "One last" }, { text: "check.", accent: true }]}
      subtitle="Confirming that this inbox really belongs to you."
      watermark="VERIFY"
      vehicleUrl="/models/car.glb"
      vehicleLength={4.0}
      switchPrompt="All set?"
      switchLabel="Back to sign in"
      switchHref="/login"
    >
      <VerifyEmailStatus token={params.token} />
    </AuthShell>
  );
}
