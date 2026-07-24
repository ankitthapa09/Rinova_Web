"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import PasswordStrength, { passwordMeetsRules } from "@/components/auth/PasswordStrength";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirm?: string;
};

const inputClass =
  "w-full rounded-lg border border-line bg-night/40 px-4 py-2.5 text-[15px] text-cream outline-none transition-colors focus:border-accent";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-night transition-colors hover:bg-[#FF7A45] disabled:cursor-default disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-2.5 text-[13px] text-cream transition-colors hover:border-cream/40 disabled:cursor-default disabled:opacity-60";

export default function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setErrors({});
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!currentPassword) next.currentPassword = "Enter your current password.";
    if (!passwordMeetsRules(newPassword)) {
      next.newPassword = "Password doesn't meet all the requirements yet.";
    }
    if (confirm !== newPassword || !confirm) next.confirm = "Passwords don't match.";
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const message = await authApi.changePassword(currentPassword, newPassword);
      toast.success(message);
      resetForm();
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({
          currentPassword: err.fieldErrors.currentPassword,
          newPassword: err.fieldErrors.newPassword,
        });
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.message);
      } else {
        toast.error("Couldn't change password. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-dash-item className="rounded-2xl border border-line bg-surface/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/12 text-accent">
            <KeyRound className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
              Change Password
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fog">
              Use your current password to confirm this change.
            </p>
          </div>
        </div>

        {!open ? (
          <button onClick={() => setOpen(true)} className={primaryBtn}>
            Change
          </button>
        ) : null}
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="currentPassword"
              className="block text-[11px] uppercase tracking-[0.16em] text-fog"
            >
              Current password
            </label>
            <div className="relative mt-2">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${inputClass} pr-11 ${errors.currentPassword ? "border-accent" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
                className="absolute inset-y-0 right-3 flex items-center text-fog transition-colors hover:text-cream"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword ? (
              <p className="mt-1.5 text-xs text-accent">{errors.currentPassword}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-[11px] uppercase tracking-[0.16em] text-fog"
            >
              New password
            </label>
            <div className="relative mt-2">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputClass} pr-11 ${errors.newPassword ? "border-accent" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide new password" : "Show new password"}
                className="absolute inset-y-0 right-3 flex items-center text-fog transition-colors hover:text-cream"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword ? <p className="mt-1.5 text-xs text-accent">{errors.newPassword}</p> : null}
            <PasswordStrength password={newPassword} />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-[11px] uppercase tracking-[0.16em] text-fog">
              Confirm new password
            </label>
            <div className="relative mt-2">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`${inputClass} pr-11 ${errors.confirm ? "border-accent" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                className="absolute inset-y-0 right-3 flex items-center text-fog transition-colors hover:text-cream"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm ? <p className="mt-1.5 text-xs text-accent">{errors.confirm}</p> : null}
          </div>

          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? "Updating…" : "Update password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              className={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
