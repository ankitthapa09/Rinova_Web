"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Users, Fuel, Gauge, Cog, Zap, Route } from "lucide-react";
import { CATEGORY_LABELS, formatNpr, type Vehicle } from "@/lib/vehicleApi";

/** A bare number like "180" reads as a raw value — give it a unit. */
function speedLabel(topSpeed?: string): string | null {
  if (!topSpeed) return null;
  const t = topSpeed.trim();
  return /^\d+$/.test(t) ? `${t} km/h` : t;
}

/** One vehicle in the grid — image stage on top, facts below. */
export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const { specs } = vehicle;
  const isEV = /electric|hybrid/i.test(specs.fuel);
  const speed = speedLabel(specs.topSpeed);
  return (
    <Link
      data-vehicle-card
      href={`/vehicles/${vehicle.slug}`}
      className="card-lift group block overflow-hidden rounded-2xl border border-line bg-surface/60"
    >
      {/* Image stage: soft orange pool behind the vehicle */}
      <div className="relative aspect-[3/2] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-[10%] bottom-[-30%] top-[30%] rounded-full bg-[radial-gradient(closest-side,rgba(255,92,26,0.14),transparent)]"
        />
        <Image
          src={vehicle.imageUrl}
          alt={vehicle.name}
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
          className="card-img object-contain p-5 drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]"
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full border border-line bg-night/70 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-fog backdrop-blur-sm">
            {CATEGORY_LABELS[vehicle.category]}
          </span>
          {isEV ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#4EA8DE]/40 bg-[#4EA8DE]/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-[#4EA8DE] backdrop-blur-sm">
              <Zap className="h-3 w-3" /> EV
            </span>
          ) : null}
        </div>
        {vehicle.featured ? (
          <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-night">
            Featured
          </span>
        ) : null}
      </div>

      <div className="border-t border-line p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-xl text-cream">{vehicle.name}</h3>
            <p className="mt-1 truncate text-[13px] text-fog">{vehicle.tagline}</p>
          </div>
          <ArrowRight className="card-arrow mt-1.5 h-4 w-4 shrink-0 text-fog group-hover:text-accent" />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-fog">
          {specs.seats ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {specs.seats} seats
            </span>
          ) : null}
          {specs.transmission ? (
            <span className="inline-flex items-center gap-1.5">
              <Cog className="h-3.5 w-3.5" /> {specs.transmission}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5" /> {specs.fuel}
          </span>
          {isEV && specs.range ? (
            <span className="inline-flex items-center gap-1.5">
              <Route className="h-3.5 w-3.5" /> {specs.range} km
            </span>
          ) : null}
          {speed ? (
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> {speed}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-line/60 pt-4">
          <p>
            <span className="font-serif text-xl text-cream">{formatNpr(vehicle.pricePerDay)}</span>
            <span className="text-[12px] text-fog"> / day</span>
          </p>
          <span className="text-[12px] font-medium text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            View details
          </span>
        </div>
      </div>
    </Link>
  );
}
