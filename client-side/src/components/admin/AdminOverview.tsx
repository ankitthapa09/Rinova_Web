"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CarFront, CalendarRange, ShieldCheck, Plus, ArrowRight } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import { vehicleApi } from "@/lib/vehicleApi";
import { useAdminUser } from "@/components/admin/AdminShell";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <div data-dash-item className="card-lift rounded-2xl border border-line bg-surface/60 p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">{label}</p>
      <p className="mt-3 font-serif text-3xl text-cream md:text-4xl">{value}</p>
      <p className="mt-2 text-xs text-fog">{hint}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  copy,
  soon,
}: {
  href: string;
  icon: typeof CarFront;
  title: string;
  copy: string;
  soon?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block font-serif text-xl text-cream">{title}</span>
        <span className="mt-1 block text-sm text-fog">{copy}</span>
      </span>
      {soon ? (
        <span className="rounded-full border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-fog">
          Soon
        </span>
      ) : (
        <ArrowRight className="card-arrow h-5 w-5 text-fog group-hover:text-accent" />
      )}
    </>
  );

  if (soon) {
    return (
      <div
        data-dash-item
        aria-disabled
        className="flex cursor-not-allowed items-center gap-5 rounded-2xl border border-line bg-surface/40 p-6 opacity-70"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      data-dash-item
      className="card-lift group flex items-center gap-5 rounded-2xl border border-line bg-surface/60 p-6"
    >
      {inner}
    </Link>
  );
}

export default function AdminOverview() {
  const user = useAdminUser();
  const rootRef = useRef<HTMLDivElement>(null);
  const [fleetSize, setFleetSize] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ delay: 0.1, defaults: { ease: EASE } });
      tl.fromTo(q("[data-dash-head] > *"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 }, 0)
        .fromTo(q("[data-dash-item]"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.07 }, 0.25);
    });
    return () => mm.revert();
  }, []);

  // Fleet size is live from the vehicle API — becomes real the moment vehicles exist.
  useEffect(() => {
    let cancelled = false;
    vehicleApi
      .list()
      .then((vehicles) => {
        if (!cancelled) setFleetSize(vehicles.length);
      })
      .catch(() => {
        if (!cancelled) setFleetSize(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div ref={rootRef}>
      <header data-dash-head>
        <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-fog">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Control Room
        </p>
        <h1 className="mt-4 font-serif text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          {greeting()}, <span className="italic text-accent">{user.name.split(" ")[0]}.</span>
        </h1>
        <p className="mt-3 text-[15px] text-fog">
          The whole operation at a glance — fleet, bookings, and customers.
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatCard label="Fleet Size" value={fleetSize ?? "—"} hint="Vehicles listed for rent" />
        <StatCard label="Active Bookings" value="0" hint="Awaiting the bookings API" />
        <StatCard label="Customers" value="—" hint="Awaiting the customers API" />
      </section>

      <section className="mt-10">
        <h2 data-dash-item className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ActionCard
            href="/admin/vehicles"
            icon={CarFront}
            title="Manage the fleet"
            copy="Add, edit, unlist, or remove vehicles."
          />
          <ActionCard
            href="/admin/rentals"
            icon={CalendarRange}
            title="Review bookings"
            copy="Approve rental requests as they come in."
            soon
          />
        </div>
      </section>
    </div>
  );
}
