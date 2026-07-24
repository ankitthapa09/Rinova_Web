"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { bookingApi, type Booking, type BookingStatus, type BookingUser } from "@/lib/bookingApi";
import { formatNpr } from "@/lib/vehicleApi";
import { ApiError } from "@/lib/api";
import { useFocusItem } from "@/lib/useFocusItem";
import { toast } from "@/components/ui/toast";
import BookingDetailDrawer from "@/components/admin/BookingDetailDrawer";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "border border-line text-fog",
  confirmed: "bg-accent/12 text-accent",
  declined: "bg-red-500/10 text-red-400",
  cancelled: "border border-line text-fog/60 line-through",
};

function dateRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startIso).toLocaleDateString("en-US", opts);
  const end = new Date(endIso).toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${start} – ${end}`;
}

/** The admin list always has the customer joined in. */
function customer(b: Booking): BookingUser | null {
  return typeof b.user === "object" ? b.user : null;
}

export default function RentalsManager() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const autoOpened = useRef(false);
  useFocusItem(bookings);

  // The drawer reads the live booking by id, so it reflects status changes.
  const selected = bookings?.find((b) => b._id === selectedId) ?? null;

  // A notification deep-link (?focus=<id>) opens that booking's drawer once.
  useEffect(() => {
    if (!bookings || autoOpened.current) return;
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (focus && bookings.some((b) => b._id === focus)) {
      setSelectedId(focus);
      autoOpened.current = true;
    }
  }, [bookings]);

  const reload = useCallback(async () => {
    try {
      setLoadError(null);
      setBookings(await bookingApi.listAll());
    } catch (e) {
      setBookings([]);
      setLoadError(e instanceof ApiError ? e.message : "Couldn't load bookings.");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const resolve = async (b: Booking, status: "confirmed" | "declined") => {
    setBusyId(b._id);
    try {
      await bookingApi.resolve(b._id, status);
      toast.success(
        status === "confirmed"
          ? `${b.vehicle.name} booking confirmed.`
          : `${b.vehicle.name} booking declined.`,
      );
      await reload();
    } catch (e) {
      // e.g. 409 — another confirmed booking already covers those dates
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the booking.");
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = (bookings ?? []).filter((b) => b.status === "pending").length;

  return (
    <div>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Manage</p>
        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          Rental Bookings
          {bookings ? (
            <span className="ml-3 align-middle text-lg text-fog">
              {pendingCount > 0 ? `${pendingCount} pending` : bookings.length}
            </span>
          ) : null}
        </h1>
      </header>

      <div className="mt-10">
        {bookings === null ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fog" />
          </div>
        ) : loadError ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line p-8 text-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <p className="text-sm text-fog">{loadError}</p>
            <button onClick={reload} className="text-[13px] font-medium text-accent">
              Try again
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="font-serif text-xl text-cream">No booking requests yet</p>
            <p className="mt-2 max-w-[340px] text-sm text-fog">
              Rental requests will land here as customers book from the fleet.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {bookings.map((b) => {
              const rowBusy = busyId === b._id;
              const who = customer(b);
              return (
                <li
                  key={b._id}
                  id={`item-${b._id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(b._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(b._id);
                    }
                  }}
                  className="flex cursor-pointer scroll-mt-28 items-center gap-4 rounded-2xl border border-line bg-surface/60 p-4 transition duration-500 hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent data-[focus=true]:ring-2 data-[focus=true]:ring-accent"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.vehicle.imageUrl}
                    alt={b.vehicle.name}
                    className="h-12 w-18 shrink-0 rounded-lg object-cover sm:w-20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-cream">
                      {b.vehicle.name}
                      <span className="text-fog"> · {dateRange(b.startDate, b.endDate)}</span>
                    </p>
                    <p className="truncate text-[12px] text-fog">
                      {who ? `${who.name} · ${who.phone}` : "—"} · {b.days}{" "}
                      {b.days === 1 ? "day" : "days"} ·{" "}
                      <span className="text-cream">{formatNpr(b.totalPrice)}</span>
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.1em] ${STATUS_STYLES[b.status]}`}
                  >
                    {b.status}
                  </span>

                  {b.status === "pending" ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolve(b, "confirmed");
                        }}
                        disabled={rowBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolve(b, "declined");
                        }}
                        disabled={rowBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-fog transition-colors hover:text-red-400 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BookingDetailDrawer
        booking={selected}
        busy={busyId === selectedId}
        onClose={() => setSelectedId(null)}
        onResolve={(status) => selected && resolve(selected, status)}
      />
    </div>
  );
}
