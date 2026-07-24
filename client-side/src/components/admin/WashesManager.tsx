"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Loader2, AlertCircle, Sparkles } from "lucide-react";
import {
  washApi,
  formatSlot,
  type WashOrder,
  type WashOrderStatus,
  type WashOrderUser,
  type WashCatalogue,
} from "@/lib/washApi";
import { CATEGORY_LABELS, formatNpr } from "@/lib/vehicleApi";
import { ApiError } from "@/lib/api";
import { useFocusItem } from "@/lib/useFocusItem";
import { toast } from "@/components/ui/toast";

const STATUS_STYLES: Record<WashOrderStatus, string> = {
  pending: "border border-line text-fog",
  confirmed: "bg-[#4EA8DE]/12 text-[#4EA8DE]",
  completed: "bg-accent/12 text-accent",
  declined: "bg-red-500/10 text-red-400",
  cancelled: "border border-line text-fog/60 line-through",
};

/** Confirmed work and finished work both occupy a bay — the same rule the
 *  server counts by. Pending requests are only queued. */
function holdsABay(order: WashOrder): boolean {
  return order.status === "confirmed" || order.status === "completed";
}

/** The booked day as YYYY-MM-DD in the garage's own timezone. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function todayKey(): string {
  return dayKey(new Date().toISOString());
}

function longDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year as number, (month as number) - 1, day as number).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** The admin list always has the customer joined in. */
function customer(order: WashOrder): WashOrderUser | null {
  return typeof order.user === "object" ? order.user : null;
}

export default function WashesManager() {
  const [orders, setOrders] = useState<WashOrder[] | null>(null);
  useFocusItem(orders);
  const [catalogue, setCatalogue] = useState<WashCatalogue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [day, setDay] = useState(todayKey());

  const reload = useCallback(async () => {
    try {
      setLoadError(null);
      setOrders(await washApi.listAll());
    } catch (e) {
      setOrders([]);
      setLoadError(e instanceof ApiError ? e.message : "Couldn't load wash orders.");
    }
  }, []);

  useEffect(() => {
    reload();
    washApi.catalogue().then(setCatalogue).catch(() => setCatalogue(null));
  }, [reload]);

  const resolve = async (order: WashOrder, status: "confirmed" | "declined" | "completed") => {
    setBusyId(order._id);
    const verb =
      status === "confirmed" ? "confirmed" : status === "declined" ? "declined" : "marked done";
    try {
      await washApi.resolve(order._id, status);
      toast.success(`${order.packageName} for ${order.plateNumber} ${verb}.`);
      await reload();
    } catch (e) {
      // e.g. 409 — every bay in that slot filled up while this sat pending
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the wash order.");
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = (orders ?? []).filter((o) => o.status === "pending").length;

  // The morning view: who's rolling in, and into which bay.
  const dayBoard = useMemo(() => {
    if (!catalogue) return null;
    const booked = (orders ?? []).filter((o) => holdsABay(o) && dayKey(o.scheduledDate) === day);
    return catalogue.slots.map((slot) => ({
      slot,
      orders: booked.filter((o) => o.slot === slot),
    }));
  }, [orders, catalogue, day]);

  return (
    <div>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Manage</p>
        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          Wash Orders
          {orders ? (
            <span className="ml-3 align-middle text-lg text-fog">
              {pendingCount > 0 ? `${pendingCount} pending` : orders.length}
            </span>
          ) : null}
        </h1>
      </header>

      {/* ── The day board ─────────────────────────────────────── */}
      {catalogue && dayBoard ? (
        <section className="mt-10 rounded-2xl border border-line bg-surface/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
                Bays on {longDay(day)}
              </h2>
              <p className="mt-1 text-[12px] text-fog">
                {catalogue.baysPerSlot} bays per slot · confirmed work only
              </p>
            </div>
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value || todayKey())}
              className="rounded-lg border border-line bg-night px-3.5 py-2.5 text-sm text-cream outline-none transition-colors [color-scheme:dark] focus:border-accent"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dayBoard.map(({ slot, orders: inSlot }) => {
              const full = inSlot.length >= catalogue.baysPerSlot;
              return (
                <div
                  key={slot}
                  className={`rounded-xl border p-4 ${
                    full ? "border-[#4EA8DE]/40 bg-[#4EA8DE]/[0.06]" : "border-line bg-night/50"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-[13.5px] text-cream">{formatSlot(slot)}</p>
                    <p className="text-[11px] text-fog">
                      {inSlot.length}/{catalogue.baysPerSlot}
                    </p>
                  </div>
                  {inSlot.length === 0 ? (
                    <p className="mt-2 text-[11.5px] text-fog/60">Empty</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {inSlot.map((o) => (
                        <li key={o._id} className="truncate text-[11.5px] text-fog">
                          <span className="text-cream">{o.plateNumber}</span> · {o.packageName}
                          {o.status === "completed" ? " · done" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── The queue ─────────────────────────────────────────── */}
      <div className="mt-10">
        {orders === null ? (
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
        ) : orders.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="font-serif text-xl text-cream">No wash orders yet</p>
            <p className="mt-2 max-w-[340px] text-sm text-fog">
              Wash requests will land here as customers book from the pricing section.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => {
              const rowBusy = busyId === order._id;
              const who = customer(order);
              return (
                <li
                  key={order._id}
                  id={`item-${order._id}`}
                  className="flex scroll-mt-28 flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface/60 p-4 transition duration-500 data-[focus=true]:ring-2 data-[focus=true]:ring-accent"
                >
                  <div className="min-w-[220px] flex-1">
                    <p className="truncate text-[14px] text-cream">
                      {order.packageName}
                      <span className="text-fog">
                        {" "}
                        · {order.vehicleLabel} ({CATEGORY_LABELS[order.vehicleType]})
                      </span>
                    </p>
                    <p className="truncate text-[12px] text-fog">
                      {longDay(dayKey(order.scheduledDate))} · {formatSlot(order.slot)} ·{" "}
                      <span className="text-cream">{order.plateNumber}</span> ·{" "}
                      <span className="text-cream">{formatNpr(order.price)}</span>
                    </p>
                    <p className="truncate text-[12px] text-fog">
                      {who ? `${who.name} · ${who.phone}` : "—"}
                      {order.notes ? <span className="italic"> · “{order.notes}”</span> : null}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.1em] ${STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </span>

                  {order.status === "pending" ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => resolve(order, "confirmed")}
                        disabled={rowBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {rowBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => resolve(order, "declined")}
                        disabled={rowBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-fog transition-colors hover:text-red-400 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </div>
                  ) : order.status === "confirmed" ? (
                    <button
                      onClick={() => resolve(order, "completed")}
                      disabled={rowBusy}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#4EA8DE]/50 px-3 py-1.5 text-[12px] font-medium text-[#4EA8DE] transition-colors hover:bg-[#4EA8DE]/10 disabled:opacity-50"
                    >
                      {rowBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Mark done
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
