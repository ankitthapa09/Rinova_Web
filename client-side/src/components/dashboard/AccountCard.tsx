"use client";

import { useState } from "react";
import { BadgeCheck, CircleDashed, Pencil, Lock } from "lucide-react";
import { authApi, ApiError, type ApiUser } from "@/lib/api";
import { useDashboardUser } from "@/components/dashboard/DashboardShell";
import { toast } from "@/components/ui/toast";

type Fields = { name: string; phone: string; address: string };
type FieldErrors = Partial<Fields>;

const inputClass =
  "w-full rounded-lg border border-line bg-night/40 px-4 py-2.5 text-[15px] text-cream outline-none transition-colors focus:border-accent";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-night transition-colors hover:bg-[#FF7A45] disabled:cursor-default disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-2.5 text-[13px] text-cream transition-colors hover:border-cream/40 disabled:cursor-default disabled:opacity-60";

// Mirror the server rules so bad input is caught before the round-trip.
function validate(f: Fields): FieldErrors {
  const e: FieldErrors = {};
  if (f.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
  if (!/^9[78]\d{8}$/.test(f.phone.trim())) e.phone = "Enter a valid 10-digit mobile (98XXXXXXXX).";
  if (f.address.trim().length < 3) e.address = "Address must be at least 3 characters.";
  return e;
}

export default function AccountCard() {
  const user = useDashboardUser();
  // Local mirror — the shell resolves the user once; a reload re-syncs from /me.
  const [profile, setProfile] = useState<ApiUser>(user);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Fields>({
    name: user.name,
    phone: user.phone,
    address: user.address,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Email verification: idle → confirm prompt → sending.
  const [verifyStep, setVerifyStep] = useState<"idle" | "confirm">("idle");
  const [sending, setSending] = useState(false);

  const startEdit = () => {
    setForm({ name: profile.name, phone: profile.phone, address: profile.address });
    setErrors({});
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      setProfile(updated);
      setEditing(false);
      toast.success("Profile updated.");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.message);
      } else {
        toast.error("Couldn't save changes. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const sendVerification = async () => {
    if (sending) return;
    setSending(true);
    try {
      toast.success(await authApi.resendVerification());
      setVerifyStep("idle");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't send the email. Try again.");
    } finally {
      setSending(false);
    }
  };

  const rows: [keyof Fields, string, string][] = [
    ["name", "Name", form.name],
    ["phone", "Phone", form.phone],
    ["address", "Address", form.address],
  ];

  return (
    <div data-dash-item className="rounded-2xl border border-line bg-surface/60 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
          Account Details
        </h2>
        {!editing ? (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 text-[12px] text-fog transition-colors hover:text-accent"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        ) : null}
      </div>

      {/* Details / edit form */}
      {editing ? (
        <form onSubmit={save} className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {rows.map(([key, label, value]) => (
            <div key={key}>
              <label htmlFor={key} className="block text-[11px] uppercase tracking-[0.16em] text-fog">
                {label}
              </label>
              <input
                id={key}
                value={value}
                onChange={(ev) => setForm((f) => ({ ...f, [key]: ev.target.value }))}
                className={`mt-2 ${inputClass} ${errors[key] ? "border-accent" : ""}`}
              />
              {errors[key] ? <p className="mt-1.5 text-xs text-accent">{errors[key]}</p> : null}
            </div>
          ))}

          {/* Email is the login identity — shown but locked. */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-fog">Email</label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-night/20 px-4 py-2.5 text-[15px] text-fog">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
          </div>

          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={ghostBtn}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-5 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-6 border-b border-line/60 pb-3">
            <dt className="shrink-0 text-fog">Name</dt>
            <dd className="truncate text-right text-cream">{profile.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-6 border-b border-line/60 pb-3">
            <dt className="shrink-0 text-fog">Email</dt>
            <dd className="flex min-w-0 items-center justify-end gap-2 text-right">
              <span className="truncate text-cream">{profile.email}</span>
              {profile.isEmailVerified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-label="Verified" />
              ) : (
                <CircleDashed className="h-4 w-4 shrink-0 text-fog" aria-label="Unverified" />
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-6 border-b border-line/60 pb-3">
            <dt className="shrink-0 text-fog">Phone</dt>
            <dd className="truncate text-right text-cream">{profile.phone}</dd>
          </div>
          <div className="flex items-center justify-between gap-6 border-b border-line/60 pb-3">
            <dt className="shrink-0 text-fog">Address</dt>
            <dd className="truncate text-right text-cream">{profile.address}</dd>
          </div>
        </dl>
      )}

      {/* Email verification prompt — only while unverified and not editing. */}
      {!editing && !profile.isEmailVerified ? (
        <div className="mt-5 rounded-xl border border-line bg-night/30 p-4">
          {verifyStep === "idle" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-fog">
                <span className="text-cream">Your email isn&apos;t verified.</span> Confirm it to
                secure your account.
              </p>
              <button onClick={() => setVerifyStep("confirm")} className={primaryBtn}>
                Verify email
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-fog">
                Send a verification link to <span className="text-cream">{profile.email}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={sendVerification} disabled={sending} className={primaryBtn}>
                  {sending ? "Sending…" : "Send link"}
                </button>
                <button
                  onClick={() => setVerifyStep("idle")}
                  disabled={sending}
                  className={ghostBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
