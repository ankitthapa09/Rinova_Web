"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, Copy, Download, Check } from "lucide-react";
import { authApi, ApiError, type TwoFactorSetup } from "@/lib/api";
import { useDashboardUser } from "@/components/dashboard/DashboardShell";
import { toast } from "@/components/ui/toast";

// Which face of the card is showing.
type Mode = "idle" | "setup" | "codes" | "disable";

const cardClass = "rounded-2xl border border-line bg-surface/60 p-6";
const inputClass =
  "w-full rounded-lg border border-line bg-night/40 px-4 py-3 text-[15px] tracking-[0.08em] text-cream outline-none transition-colors focus:border-accent";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-night transition-colors hover:bg-[#FF7A45] disabled:cursor-default disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-sm text-cream transition-colors hover:border-cream/40 disabled:cursor-default disabled:opacity-60";

export default function TwoFactorCard() {
  const user = useDashboardUser();
  // Local mirror of the enabled flag, the shell resolves the user once, so we
  // track changes here and a reload re-syncs from /me.
  const [enabled, setEnabled] = useState(user.twoFactorEnabled);
  const [mode, setMode] = useState<Mode>("idle");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setCode("");
    setCodeError(undefined);
  };

  const onError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      setCodeError(err.fieldErrors.code);
      if (!err.fieldErrors.code) toast.error(err.message);
    } else {
      toast.error(fallback);
    }
  };

  // Begin enabling, fetch the QR + secret
  const beginSetup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await authApi.startTwoFactorSetup();
      setSetup(data);
      resetForm();
      setMode("setup");
    } catch (err) {
      onError(err, "Couldn't start setup. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Confirm the scanned code and flip 2FA on
  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!code.trim()) return setCodeError("Enter the 6-digit code.");
    setBusy(true);
    setCodeError(undefined);
    try {
      const codes = await authApi.confirmTwoFactorSetup(code.trim());
      setRecoveryCodes(codes);
      setEnabled(true);
      resetForm();
      setMode("codes");
      toast.success("Two-factor is on.");
    } catch (err) {
      onError(err, "Couldn't verify that code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Turn 2FA off (needs a fresh code)
  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!code.trim()) return setCodeError("Enter a code to confirm.");
    setBusy(true);
    setCodeError(undefined);
    try {
      await authApi.disableTwoFactor(code.trim());
      setEnabled(false);
      resetForm();
      setMode("idle");
      toast.success("Two-factor turned off.");
    } catch (err) {
      onError(err, "Couldn't turn it off. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy, select and copy them manually.");
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([`Rinova recovery codes\n\n${recoveryCodes.join("\n")}\n`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rinova-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Recovery codes (shown once, right after enabling)
  if (mode === "codes") {
    return (
      <div data-dash-item className={cardClass}>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
          Save your recovery codes
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fog">
          Each code works once if you lose your authenticator. Store them somewhere safe -
          this is the only time they&apos;re shown.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-line bg-night/40 p-4 font-mono text-sm text-cream">
          {recoveryCodes.map((c) => (
            <li key={c} className="tracking-[0.15em]">
              {c}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={copyCodes} className={ghostBtn}>
            {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={downloadCodes} className={ghostBtn}>
            <Download className="h-4 w-4" /> Download
          </button>
          <button onClick={() => setMode("idle")} className={primaryBtn}>
            I&apos;ve saved them
          </button>
        </div>
      </div>
    );
  }

  // Setup, scan the QR, then confirm
  if (mode === "setup" && setup) {
    return (
      <form onSubmit={confirmSetup} data-dash-item className={cardClass}>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
          Set up two-factor
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fog">
          Scan this with an authenticator app (Google Authenticator, Authy, 1Password), then
          enter the 6-digit code it shows.
        </p>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-xl border border-line bg-cream p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrDataUrl} alt="Two-factor QR code" className="h-40 w-40" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-fog">Can&apos;t scan?</p>
            <p className="mt-2 break-all rounded-lg border border-line bg-night/40 px-3 py-2 font-mono text-[13px] tracking-[0.1em] text-cream">
              {setup.secret}
            </p>

            <label htmlFor="totp-code" className="mt-5 block text-[11px] uppercase tracking-[0.16em] text-fog">
              Verification code
            </label>
            <input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`mt-2 ${inputClass} ${codeError ? "border-accent" : ""}`}
            />
            {codeError ? <p className="mt-2 text-xs text-accent">{codeError}</p> : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Verifying…" : "Turn on two-factor"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setSetup(null);
              resetForm();
            }}
            className={ghostBtn}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // Disable, confirm with a code
  if (mode === "disable") {
    return (
      <form onSubmit={confirmDisable} data-dash-item className={cardClass}>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
          Turn off two-factor
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fog">
          Enter a code from your authenticator app (or a recovery code) to confirm.
        </p>

        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`mt-5 max-w-xs ${inputClass} ${codeError ? "border-accent" : ""}`}
        />
        {codeError ? <p className="mt-2 text-xs text-accent">{codeError}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Turning off…" : "Turn off"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              resetForm();
            }}
            className={ghostBtn}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // Idle, current status + the entry action
  return (
    <div data-dash-item className={cardClass}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              enabled ? "bg-accent/12 text-accent" : "bg-night/60 text-fog"
            }`}
          >
            {enabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="font-serif text-xl text-cream">Two-factor authentication</h2>
            <p className="mt-1 text-sm leading-relaxed text-fog">
              {enabled
                ? "On, logins ask for a code from your authenticator app."
                : "Add a second step at login with an authenticator app."}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${
            enabled ? "border-accent/40 text-accent" : "border-line text-fog"
          }`}
        >
          {enabled ? "On" : "Off"}
        </span>
      </div>

      <div className="mt-6">
        {enabled ? (
          <button onClick={() => setMode("disable")} className={ghostBtn}>
            Turn off
          </button>
        ) : (
          <button onClick={beginSetup} disabled={busy} className={primaryBtn}>
            {busy ? "Starting…" : "Enable two-factor"}
          </button>
        )}
      </div>
    </div>
  );
}
