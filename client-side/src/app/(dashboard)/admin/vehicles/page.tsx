import type { Metadata } from "next";
import { CarFront } from "lucide-react";

export const metadata: Metadata = {
  title: "Vehicles — Rinova Admin",
  description: "Manage the Rinova fleet.",
};

// Placeholder — the full fleet manager (table + add/edit form with uploads)
// replaces this in the next step. Kept so the Vehicles nav link resolves.
export default function AdminVehiclesPage() {
  return (
    <div>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Manage</p>
        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          Vehicles
        </h1>
      </header>

      <div className="mt-10 flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fog">
          <CarFront className="h-5 w-5" />
        </span>
        <p className="mt-4 font-serif text-xl text-cream">Fleet manager coming next</p>
        <p className="mt-2 max-w-[340px] text-sm leading-relaxed text-fog">
          Add, edit, unlist, and remove vehicles — with photo and 3D model uploads.
        </p>
      </div>
    </div>
  );
}
