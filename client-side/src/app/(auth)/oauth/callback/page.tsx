import { Suspense } from "react";
import type { Metadata } from "next";
import OAuthCallback from "@/components/auth/OAuthCallback";

export const metadata: Metadata = {
  title: "Signing in — Rinova",
};

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-night text-sm text-fog">
          Completing sign-in…
        </div>
      }
    >
      <OAuthCallback />
    </Suspense>
  );
}
