import { request } from "@/lib/api";
import type { VehicleCategory, VehicleSpecs } from "@/lib/vehicleApi";

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

/** The vehicle fields the server joins into a booking for display. */
export interface BookingVehicle {
  _id: string;
  name: string;
  slug: string;
  imageUrl: string;
  pricePerDay: number;
  category: VehicleCategory;
  // Included in the admin join for the detail drawer.
  tagline?: string;
  specs?: VehicleSpecs;
}

/** The customer fields joined in for the admin view. */
export interface BookingUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  // Included in the admin join for the detail drawer.
  address?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
}

export interface Booking {
  _id: string;
  /** Populated user (admin list) or the raw id (customer's own list). */
  user: BookingUser | string;
  vehicle: BookingVehicle;
  startDate: string;
  endDate: string;
  days: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export const bookingApi = {
  // ── Customer ─────────────────────────────────────────────
  async create(input: { vehicleSlug: string; startDate: string; endDate: string }): Promise<Booking> {
    const { booking } = await request<{ booking: Booking }>("/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return booking;
  },

  async listMine(): Promise<Booking[]> {
    const { bookings } = await request<{ bookings: Booking[] }>("/bookings/mine");
    return bookings;
  },

  async cancel(id: string): Promise<Booking> {
    const { booking } = await request<{ booking: Booking }>(`/bookings/${id}/cancel`, {
      method: "PATCH",
    });
    return booking;
  },

  // ── Admin ────────────────────────────────────────────────
  async listAll(): Promise<Booking[]> {
    const { bookings } = await request<{ bookings: Booking[] }>("/bookings");
    return bookings;
  },

  async resolve(id: string, status: "confirmed" | "declined"): Promise<Booking> {
    const { booking } = await request<{ booking: Booking }>(`/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return booking;
  },
};
