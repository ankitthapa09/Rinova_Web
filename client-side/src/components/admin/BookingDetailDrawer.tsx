"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2, BadgeCheck, CircleDashed } from "lucide-react";
import { CATEGORY_LABELS, formatNpr } from "@/lib/vehicleApi";
import { type Booking, type BookingUser } from "@/lib/bookingApi";

const STATUS_STYLES: Record<Booking["status"], string> = {
  pending: "border border-line text-fog",
  confirmed: "bg-accent/12 text-accent",
  declined: "bg-red-500/10 text-red-400",
  cancelled: "border border-line text-fog/60 line-through",
};

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function specRows(specs: NonNullable<Booking["vehicle"]["specs"]> | undefined): [string, string][] {
  if (!specs) return [];
  const rows: [string, string][] = [];
  if (specs.seats) rows.push(["Seats", String(specs.seats)]);
  if (specs.transmission) rows.push(["Transmission", specs.transmission]);
  if (specs.fuel) rows.push(["Fuel", specs.fuel]);
  if (specs.topSpeed) rows.push(["Top speed", specs.topSpeed]);
  if (specs.engineCC) rows.push(["Engine", `${specs.engineCC} cc`]);
  if (specs.range) rows.push(["Range", `${specs.range} km`]);
  if (specs.batteryCapacity) rows.push(["Battery", `${specs.batteryCapacity} kWh`]);
  return rows;
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
  booking: Booking | null;
  busy: boolean;
  onClose: () => void;
  onResolve: (status: "confirmed" | "declined") => void;
}

export default function BookingDetailDrawer({ booking, busy, onClose, onResolve }: Props) {
  // Mount at translate-x-full, then slide in on the next frame.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true));
    // Close on Escape.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!booking || typeof document === "undefined") return null;

  const who = typeof booking.user === "object" ? (booking.user as BookingUser) : null;
  const v = booking.vehicle;
  const specs = specRows(v.specs);
  const isEv = !!(v.specs?.range || v.specs?.batteryCapacity);

  return createPortal(
    <div className="fixed inset-0 z-[130]">
      <button
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/50 transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-[min(440px,100vw)] flex-col border-l border-line bg-surface transition-transform duration-300 ease-out ${entered ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">Booking details</p>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-fog transition-colors hover:text-cream">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Vehicle */}
          <section>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.imageUrl} alt={v.name} className="h-40 w-full rounded-xl object-cover" />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-2xl text-cream">{v.name}</h2>
                {v.tagline ? <p className="mt-1 text-[13px] text-fog">{v.tagline}</p> : null}
              </div>
              <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-fog">
                {isEv ? "EV" : CATEGORY_LABELS[v.category]}
              </span>
            </div>
            <p className="mt-3 font-serif text-xl text-accent">{formatNpr(v.pricePerDay)}<span className="text-[12px] text-fog"> / day</span></p>

            {specs.length > 0 ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 text-[13px]">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-line/60 py-2">
                    <dt className="text-fog">{label}</dt>
                    <dd className="text-cream">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>

          {/* Booking */}
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">Booking</h3>
              <span className={`rounded-full px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.1em] ${STATUS_STYLES[booking.status]}`}>
                {booking.status}
              </span>
            </div>
            <dl className="mt-3 text-[13px]">
              <Field label="Pick-up" value={fullDate(booking.startDate)} />
              <Field label="Return" value={fullDate(booking.endDate)} />
              <Field label="Length" value={`${booking.days} day${booking.days === 1 ? "" : "s"}`} />
              <Field label="Total" value={formatNpr(booking.totalPrice)} />
              <Field label="Requested" value={fullDate(booking.createdAt)} />
            </dl>
          </section>

          {/* Customer */}
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">Customer</h3>
              {who?.isEmailVerified ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-accent"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
              ) : who ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-fog"><CircleDashed className="h-3.5 w-3.5" /> Unverified</span>
              ) : null}
            </div>
            {who ? (
              <dl className="mt-3 text-[13px]">
                <Field label="Name" value={who.name} />
                <Field label="Email" value={who.email} />
                <Field label="Phone" value={who.phone} />
                {who.address ? <Field label="Address" value={who.address} /> : null}
                {who.createdAt ? <Field label="Member since" value={monthYear(who.createdAt)} /> : null}
              </dl>
            ) : (
              <p className="mt-3 text-[13px] text-fog">Customer details unavailable.</p>
            )}
          </section>
        </div>

        {/* Actions */}
        {booking.status === "pending" ? (
          <div className="flex gap-3 border-t border-line px-6 py-4">
            <button
              onClick={() => onResolve("confirmed")}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
            </button>
            <button
              onClick={() => onResolve("declined")}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line px-4 py-3 text-sm text-cream transition-colors hover:text-red-400 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Decline
            </button>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
