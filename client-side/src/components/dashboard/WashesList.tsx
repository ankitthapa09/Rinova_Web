"use client";

import { useState } from "react";
import { Bike, Bus, Car, Truck, Caravan } from "lucide-react";
import { washApi, formatSlot, type WashOrder, type WashOrderStatus } from "@/lib/washApi";
import { formatNpr, type VehicleCategory } from "@/lib/vehicleApi";
import { ApiError } from "@/lib/api";
import { useFocusItem } from "@/lib/useFocusItem";
import { toast } from "@/components/ui/toast";

export const WASH_STATUS_STYLES: Record<WashOrderStatus, string> = {
  pending: "border border-line text-fog",
  confirmed: "bg-[#4EA8DE]/12 text-[#4EA8DE]",
  completed: "bg-accent/12 text-accent",
  declined: "bg-red-500/10 text-red-400",
  cancelled: "border border-line text-fog/60 line-through",
};

const VEHICLE_ICONS: Record<VehicleCategory, typeof Car> = {
  bike: Bike,
  car: Car,
  suv: Truck,
  van: Caravan,
  bus: Bus,
};

/** 'Sat, Jul 18 · 10:30 AM' — the day and the arrival time together. */
export function washWhen(order: WashOrder): string {
  const day = new Date(order.scheduledDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${day} · ${formatSlot(order.slot)}`;
}

/** The moment the wash begins — the deadline for calling it off. */
function washStart(order: WashOrder): number {
  const [hours, minutes] = order.slot.split(":").map(Number);
  const at = new Date(order.scheduledDate);
  at.setHours(hours as number, minutes as number, 0, 0);
  return at.getTime();
}

export function isWashCancellable(order: WashOrder): boolean {
  return (
    (order.status === "pending" || order.status === "confirmed") && washStart(order) > Date.now()
  );
}

/** Rows of the customer's own wash orders, with cancel. Parent owns the data;
 *  onChanged fires after a successful cancel so it can refetch. */
export default function WashesList({
  orders,
  onChanged,
}: {
  orders: WashOrder[];
  onChanged: () => void;
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  useFocusItem(orders);

  const cancelOrder = async (order: WashOrder) => {
    if (cancellingId) return;
    setCancellingId(order._id);
    try {
      await washApi.cancel(order._id);
      toast.success(`${order.packageName} for ${order.plateNumber} cancelled.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel the wash.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const Icon = VEHICLE_ICONS[order.vehicleType];
        return (
          <li
            key={order._id}
            id={`item-${order._id}`}
            className="flex scroll-mt-28 items-center gap-4 rounded-lg border-b border-line/60 pb-3 transition duration-500 last:border-0 last:pb-0 data-[focus=true]:bg-accent/5 data-[focus=true]:ring-2 data-[focus=true]:ring-accent"
          >
            <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-night text-[#4EA8DE]">
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] text-cream">
                {order.packageName}
                <span className="text-fog"> · {order.vehicleLabel}</span>
              </span>
              <span className="block truncate text-[11.5px] text-fog">
                {washWhen(order)} · {order.plateNumber} · {formatNpr(order.price)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.1em] ${WASH_STATUS_STYLES[order.status]}`}
            >
              {order.status}
            </span>
            {isWashCancellable(order) ? (
              <button
                onClick={() => cancelOrder(order)}
                disabled={cancellingId === order._id}
                className="shrink-0 text-[11.5px] font-medium text-fog transition-colors hover:text-red-400 disabled:opacity-50"
              >
                {cancellingId === order._id ? "…" : "Cancel"}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
