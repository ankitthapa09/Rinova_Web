"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, BadgeCheck, CircleDashed, ShieldCheck, ShieldOff } from "lucide-react";
import { type ApiUser } from "@/lib/api";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function fullDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-line/60 py-2.5 last:border-0">
      <dt className="shrink-0 text-fog">{label}</dt>
      <dd className="truncate text-right text-cream">{value}</dd>
    </div>
  );
}

interface Props {
  customer: ApiUser | null;
  onClose: () => void;
}

export default function CustomerDetailDrawer({ customer, onClose }: Props) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!customer || typeof document === "undefined") return null;
  const isAdmin = customer.role === "admin";

  return createPortal(
    <div className="fixed inset-0 z-[130]">
      <button
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/50 transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-[min(420px,100vw)] flex-col border-l border-line bg-surface transition-transform duration-300 ease-out ${entered ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">Customer details</p>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-fog transition-colors hover:text-cream">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Identity */}
          <div className="flex flex-col items-center text-center">
            {customer.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={customer.profileImageUrl} alt="" className="h-24 w-24 rounded-full border border-line object-cover" />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-3xl font-medium text-night">
                {initials(customer.name)}
              </span>
            )}
            <h2 className="mt-4 flex items-center gap-2 font-serif text-2xl text-cream">
              {customer.name}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-accent">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              ) : null}
            </h2>
            {customer.isEmailVerified ? (
              <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-accent"><BadgeCheck className="h-4 w-4" /> Verified</span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-fog"><CircleDashed className="h-4 w-4" /> Unverified</span>
            )}
          </div>

          {/* Contact */}
          <section className="mt-7">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">Contact</h3>
            <dl className="mt-3 text-[13px]">
              <Field label="Email" value={customer.email} />
              <Field label="Phone" value={customer.phone} />
              <Field label="Address" value={customer.address} />
            </dl>
          </section>

          {/* Account */}
          <section className="mt-7">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">Account</h3>
            <dl className="mt-3 text-[13px]">
              <Field label="Role" value={isAdmin ? "Admin" : "Customer"} />
              <div className="flex items-center justify-between gap-6 border-b border-line/60 py-2.5">
                <dt className="text-fog">Two-factor</dt>
                <dd className={`inline-flex items-center gap-1.5 ${customer.twoFactorEnabled ? "text-[#4EA8DE]" : "text-fog"}`}>
                  {customer.twoFactorEnabled ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                  {customer.twoFactorEnabled ? "On" : "Off"}
                </dd>
              </div>
              <Field label="Member since" value={fullDate(customer.createdAt)} />
              {customer.lastLoginAt ? <Field label="Last login" value={fullDate(customer.lastLoginAt)} /> : null}
            </dl>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
