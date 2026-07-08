"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Cursor from "@/components/landing/Cursor";
import SplitChars from "@/components/landing/SplitChars";
import VehicleCard from "./VehicleCard";
import {
  vehicleApi,
  CATEGORY_LABELS,
  type Vehicle,
  type VehicleCategory,
} from "@/lib/vehicleApi";

type Filter = "all" | VehicleCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  ...(Object.entries(CATEGORY_LABELS) as [VehicleCategory, string][]).map(([id, label]) => ({
    id,
    label,
  })),
];

/** Placeholder card while the catalog loads — same silhouette as the real one. */
function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface/40">
      <div className="aspect-[3/2] bg-surface/70" />
      <div className="space-y-3 border-t border-line p-5">
        <div className="h-5 w-2/3 rounded bg-surface/80" />
        <div className="h-3 w-1/2 rounded bg-surface/70" />
        <div className="h-3 w-full rounded bg-surface/60" />
      </div>
    </div>
  );
}

export default function VehiclesView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Landing showcase links here as /vehicles?category=suv — preset the filter
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("category");
    if (c && c in CATEGORY_LABELS) setFilter(c as VehicleCategory);
  }, []);

  // Load the catalog once; filtering happens client-side on the loaded list
  useEffect(() => {
    let cancelled = false;
    vehicleApi.list().then((list) => {
      if (!cancelled) setVehicles(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = vehicles === null;
  const visible = loading
    ? []
    : filter === "all"
      ? vehicles
      : vehicles.filter((v) => v.category === filter);

  // Page entrance: headline cascade, then rail rises in
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ delay: 0.1, defaults: { ease: EASE } });
      tl.fromTo(q("[data-vehicles-eyebrow]"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.1)
        .to(q(".split-char"), { y: 0, rotate: 0, duration: 1.1, stagger: 0.03 }, 0)
        .fromTo(q("[data-vehicles-sub]"), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.5)
        .fromTo(
          q("[data-vehicles-rail] > *"),
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.05 },
          0.6,
        );
    });
    return () => mm.revert();
  }, []);

  // Cards stagger in when data arrives and on every filter change
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || loading || !window.matchMedia(MOTION_OK).matches) return;
    gsap.fromTo(
      grid.querySelectorAll("[data-vehicle-card]"),
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, stagger: 0.07, ease: EASE, delay: 0.05 },
    );
  }, [filter, loading]);

  return (
    <div ref={rootRef} className="relative min-h-[100svh] overflow-hidden">
      <SmoothScroll />
      <Cursor />
      <div aria-hidden className="glow-orb absolute -right-[20%] -top-[10%] h-[55vw] w-[55vw]" />
      <div aria-hidden className="glow-orb absolute -left-[25%] top-[55%] h-[50vw] w-[50vw] opacity-60" />

      <div className="relative mx-auto w-full max-w-wrap px-6 pb-24 pt-32 md:pt-36">
        <p data-vehicles-eyebrow className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">
          The Garage{loading ? "" : ` · ${vehicles.length} vehicles`}
        </p>

        <h1 className="mt-5 font-serif text-[clamp(2.8rem,6.5vw,5.5rem)] leading-[1.02] tracking-[-0.02em] text-cream">
          <span className="split-line" aria-label="Pick your ride.">
            <SplitChars text="Pick your" /> <SplitChars text="ride." className="italic text-accent" />
          </span>
        </h1>

        <p data-vehicles-sub className="mt-5 max-w-xl text-[15px] leading-relaxed text-fog">
          Every vehicle is washed, serviced, and ready before you arrive. Choose a category or
          browse the whole garage.
        </p>

        {/* Category rail */}
        <div data-vehicles-rail className="mt-10 flex flex-wrap gap-2.5">
          {FILTERS.map((f) => {
            const count = loading
              ? null
              : f.id === "all"
                ? vehicles.length
                : vehicles.filter((v) => v.category === f.id).length;
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors duration-300 ${
                  active
                    ? "bg-accent text-night shadow-glow"
                    : "border border-line text-fog hover:border-accent/50 hover:text-cream"
                }`}
              >
                {f.label}
                {count !== null ? (
                  <span className={active ? "ml-1.5 text-night/60" : "ml-1.5 text-fog/60"}>{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div ref={gridRef} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
            : visible.map((v) => <VehicleCard key={v.slug} vehicle={v} />)}
        </div>

        {!loading && visible.length === 0 ? (
          <p className="mt-16 text-center text-fog">Nothing in this category yet — check back soon.</p>
        ) : null}
      </div>
    </div>
  );
}
