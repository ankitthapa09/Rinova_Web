"use client";

import Link from "next/link";
import { useState } from "react";
import { bookingApi, type Booking, type BookingStatus } from "@/lib/bookingApi";
import { formatNpr } from "@/lib/vehicleApi";
import { ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "border border-line text-fog",
  confirmed: "bg-accent/12 text-accent",
  declined: "bg-red-500/10 text-red-400",
  cancelled: "border border-line text-fog/60 line-through",
};

export function dateRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startIso).toLocaleDateString("en-US", opts);
  const end = new Date(endIso).toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${start} – ${end}`;
}

export function isCancellable(b: Booking): boolean {
  return (
    (b.status === "pending" || b.status === "confirmed") &&
    new Date(b.startDate).getTime() > Date.now()
  );
}

/** Rows of the customer's own bookings, with cancel. Parent owns the data;
 *  onChanged fires after a successful cancel so it can refetch. */
export default function RentalsList({
  bookings,
  onChanged,
}: {
  bookings: Booking[];
  onChanged: () => void;
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cancelBooking = async (b: Booking) => {
    if (cancellingId) return;
    setCancellingId(b._id);
    try {
      await bookingApi.cancel(b._id);
      toast.success(`${b.vehicle.name} booking cancelled.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel the booking.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <ul className="flex flex-col gap-3">
      {bookings.map((b) => (
        <li
          key={b._id}
          className="flex items-center gap-4 border-b border-line/60 pb-3 last:border-0 last:pb-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.vehicle.imageUrl}
            alt={b.vehicle.name}
            className="h-11 w-16 shrink-0 rounded-lg object-cover"
          />
          <span className="min-w-0 flex-1">
            <Link
              href={`/vehicles/${b.vehicle.slug}`}
              className="block truncate text-[13.5px] text-cream hover:text-accent"
            >
              {b.vehicle.name}
            </Link>
            <span className="block truncate text-[11.5px] text-fog">
              {dateRange(b.startDate, b.endDate)} · {formatNpr(b.totalPrice)}
            </span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.1em] ${STATUS_STYLES[b.status]}`}
          >
            {b.status}
          </span>
          {isCancellable(b) ? (
            <button
              onClick={() => cancelBooking(b)}
              disabled={cancellingId === b._id}
              className="shrink-0 text-[11.5px] font-medium text-fog transition-colors hover:text-red-400 disabled:opacity-50"
            >
              {cancellingId === b._id ? "…" : "Cancel"}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
