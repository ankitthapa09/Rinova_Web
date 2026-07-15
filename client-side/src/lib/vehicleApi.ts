import { request, BASE_URL, getAccessToken, ApiError } from "@/lib/api";

export type VehicleCategory = "bike" | "car" | "suv" | "van" | "bus";

export interface VehicleSpecs {
  seats?: number;
  transmission?: "Manual" | "Automatic";
  fuel: string;
  topSpeed?: string;
  /** EV only — driving range on a full charge, in km */
  range?: number;
  /** EV only — battery capacity in kWh */
  batteryCapacity?: number;
}

export interface Vehicle {
  _id: string;
  slug: string;
  name: string;
  category: VehicleCategory;
  tagline: string;
  pricePerDay: number;
  specs: VehicleSpecs;
  imageUrl: string;
  /** Photo gallery, up to 4 — images[0] is the cover and mirrors imageUrl */
  images: string[];
  /** Optional 3D showcase — detail page falls back to the cover photo without it */
  modelUrl?: string;
  /** Normalized world length for the shared 3D loader (only with modelUrl) */
  modelLength?: number;
  featured?: boolean;
  description: string;
  /** false = pulled from the public listing without being deleted */
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Everything an admin supplies when creating/editing a vehicle. The slug is
 * generated server-side from the name and is never sent. */
export interface VehicleInput {
  name: string;
  category: VehicleCategory;
  tagline: string;
  pricePerDay: number;
  specs: VehicleSpecs;
  imageUrl: string;
  /** Optional gallery (max 4) — the first entry becomes the cover */
  images?: string[];
  modelUrl?: string;
  modelLength?: number;
  featured?: boolean;
  description: string;
  isAvailable?: boolean;
}

/** Edit payload. `modelUrl: null` removes the vehicle's 3D model; leaving it
 *  out keeps the existing one. */
export type VehicleUpdate = Partial<Omit<VehicleInput, "modelUrl" | "modelLength">> & {
  modelUrl?: string | null;
  modelLength?: number | null;
};

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  bike: "Bikes",
  car: "Cars",
  suv: "SUVs & Jeeps",
  van: "Vans",
  bus: "Buses",
};

export function formatNpr(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

export type UploadKind = "image" | "model";

export const vehicleApi = {
  // Public
  async list(category?: VehicleCategory): Promise<Vehicle[]> {
    const qs = category ? `?category=${category}` : "";
    const { vehicles } = await request<{ vehicles: Vehicle[] }>(`/vehicles${qs}`);
    return vehicles;
  },

  async get(slug: string): Promise<Vehicle | null> {
    try {
      const { vehicle } = await request<{ vehicle: Vehicle }>(`/vehicles/${slug}`);
      return vehicle;
    } catch (err) {
      // A missing/unlisted vehicle 404s — surface that as null, as callers expect.
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  // ── Admin (all gated by requireRole('admin') on the server) ──
  async listAll(): Promise<Vehicle[]> {
    const { vehicles } = await request<{ vehicles: Vehicle[] }>("/vehicles/all");
    return vehicles;
  },

  async create(input: VehicleInput): Promise<Vehicle> {
    const { vehicle } = await request<{ vehicle: Vehicle }>("/vehicles", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return vehicle;
  },

  async update(id: string, input: VehicleUpdate): Promise<Vehicle> {
    const { vehicle } = await request<{ vehicle: Vehicle }>(`/vehicles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return vehicle;
  },

  async remove(id: string): Promise<void> {
    await request<null>(`/vehicles/${id}`, { method: "DELETE" });
  },


  async uploadFile(kind: UploadKind, file: File): Promise<{ url: string; publicId: string }> {
    const form = new FormData();
    form.append("file", file);
    const token = getAccessToken();

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/uploads/${kind}`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
    } catch {
      throw new ApiError(0, "Can't reach the server. Is it running?");
    }

    const json = (await res.json().catch(() => null)) as
      | { success: boolean; data: { url: string; publicId: string }; message?: string; errors?: { field: string; message: string }[] }
      | null;

    if (!res.ok || !json?.success) {
      const fieldErrors = Object.fromEntries((json?.errors ?? []).map((e) => [e.field, e.message]));
      throw new ApiError(res.status, json?.message ?? "Upload failed", fieldErrors);
    }

    return json.data;
  },
};
