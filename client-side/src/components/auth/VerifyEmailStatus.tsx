"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, CircleX, Loader2 } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

type Phase = "verifying" | "done" | "failed";

export default function VerifyEmailStatus({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("verifying");
  const [message, setMessage] = useState("");
  // React 18 dev runs effects twice, the second call would burn the token
  // and report failure, so guard it.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (async () => {
      try {
        const msg = await authApi.verifyEmail(token);
        setMessage(msg);
        setPhase("done");
      } catch (err) {
        setMessage(
          err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
        );
        setPhase("failed");
      }
    })();
  }, [token]);

  if (phase === "verifying") {
    return (
      <div className="flex items-center gap-3 text-fog">
        <Loader2 className="h-5 w-5 animate-spin" />
        Confirming your email…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-5">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          phase === "done" ? "bg-accent/12 text-accent" : "bg-red-500/10 text-red-400"
        }`}
      >
        {phase === "done" ? <BadgeCheck className="h-5 w-5" /> : <CircleX className="h-5 w-5" />}
      </span>
      <p className="text-[15px] leading-relaxed text-fog">{message}</p>
      {phase === "done" ? (
        <Link href="/dashboard" className="nav-link text-[13px] font-medium text-accent">
          Go to your dashboard
        </Link>
      ) : (
        <p className="text-[13px] text-fog">
          Links expire after 24 hours, sign in and use{" "}
          <span className="text-cream">Resend verification</span> on your dashboard to get a new
          one.
        </p>
      )}
    </div>
  );
}
