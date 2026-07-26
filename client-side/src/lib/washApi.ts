import { request } from "@/lib/api";
import type { VehicleCategory } from "@/lib/vehicleApi";

export type WashPackageId = "basic" | "deep" | "detail";

export type WashOrderStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "declined"
  | "cancelled";

/** One item on the wash menu, priced per vehicle size. */
export interface WashPackage {
  id: WashPackageId;
  name: string;
  duration: string;
  prices: Record<VehicleCategory, number>;
  features: string[];
  popular?: boolean;
}

export interface WashCatalogue {
  packages: WashPackage[];
  slots: string[];
  baysPerSlot: number;
  maxDaysAhead: number;
}

/** How much room is left in one arrival time on one day. */
export interface SlotAvailability {
  slot: string;
  baysLeft: number;
  /** Free bay left *and* the time hasn't already passed today */
  available: boolean;
}

/** The customer fields the server joins in for the admin view. */
export interface WashOrderUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export interface WashOrder {
  _id: string;
  /** Populated user (admin list) or the raw id (customer's own list). */
  user: WashOrderUser | string;
  packageId: WashPackageId;
  packageName: string;
  vehicleType: VehicleCategory;
  vehicleLabel: string;
  plateNumber: string;
  scheduledDate: string;
  slot: string;
  price: number;
  status: WashOrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWashOrderInput {
  packageId: WashPackageId;
  vehicleType: VehicleCategory;
  vehicleLabel: string;
  plateNumber: string;
  /** YYYY-MM-DD */
  scheduledDate: string;
  slot: string;
  notes?: string;
}

/** Prices are never sent to the server, it looks them up itself. This is only
 * so the form can show the customer what they're about to agree to. */
export function washPriceFor(
  packages: WashPackage[],
  packageId: WashPackageId,
  vehicleType: VehicleCategory,
): number | undefined {
  return packages.find((pkg) => pkg.id === packageId)?.prices[vehicleType];
}

/** '14:00' to '2:00 PM' */
export function formatSlot(slot: string): string {
  const [hours, minutes] = slot.split(":").map(Number);
  const period = (hours as number) >= 12 ? "PM" : "AM";
  const hour12 = (hours as number) % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export const washApi = {
  // Public
  catalogue(): Promise<WashCatalogue> {
    return request<WashCatalogue>("/wash/packages");
  },

  async availability(date: string): Promise<SlotAvailability[]> {
    const { slots } = await request<{ slots: SlotAvailability[] }>(
      `/wash/availability?date=${encodeURIComponent(date)}`,
    );
    return slots;
  },

  // Customer
  async create(input: CreateWashOrderInput): Promise<WashOrder> {
    const { order } = await request<{ order: WashOrder }>("/wash/orders", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return order;
  },

  async listMine(): Promise<WashOrder[]> {
    const { orders } = await request<{ orders: WashOrder[] }>("/wash/orders/mine");
    return orders;
  },

  async cancel(id: string): Promise<WashOrder> {
    const { order } = await request<{ order: WashOrder }>(`/wash/orders/${id}/cancel`, {
      method: "PATCH",
    });
    return order;
  },

  // Admin
  async listAll(): Promise<WashOrder[]> {
    const { orders } = await request<{ orders: WashOrder[] }>("/wash/orders");
    return orders;
  },

  async resolve(
    id: string,
    status: "confirmed" | "declined" | "completed",
  ): Promise<WashOrder> {
    const { order } = await request<{ order: WashOrder }>(`/wash/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return order;
  },
};
