"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CarFront, Droplets, ArrowRight, BadgeCheck, CircleDashed } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import { bookingApi, type Booking } from "@/lib/bookingApi";
import { washApi, type WashOrder } from "@/lib/washApi";
import { useDashboardUser } from "@/components/dashboard/DashboardShell";
import RentalsList from "@/components/dashboard/RentalsList";
import WashesList from "@/components/dashboard/WashesList";

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
}: {
  href: string;
  icon: typeof CarFront;
  title: string;
  copy: string;
}) {
  return (
    <Link
      href={href}
      data-dash-item
      className="card-lift group flex items-center gap-5 rounded-2xl border border-line bg-surface/60 p-6"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block font-serif text-xl text-cream">{title}</span>
        <span className="mt-1 block text-sm text-fog">{copy}</span>
      </span>
      <ArrowRight className="card-arrow h-5 w-5 text-fog group-hover:text-accent" />
    </Link>
  );
}

export default function DashboardOverview() {
  const user = useDashboardUser();
  const rootRef = useRef<HTMLDivElement>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [washes, setWashes] = useState<WashOrder[] | null>(null);

  const reload = useCallback(async () => {
    // Two independent lists — one failing shouldn't blank the other.
    const [rentals, washOrders] = await Promise.allSettled([
      bookingApi.listMine(),
      washApi.listMine(),
    ]);
    setBookings(rentals.status === "fulfilled" ? rentals.value : []);
    setWashes(washOrders.status === "fulfilled" ? washOrders.value : []);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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

  const activeRentals = (bookings ?? []).filter(
    (b) => b.status === "pending" || b.status === "confirmed",
  ).length;

  const activeWashes = (washes ?? []).filter(
    (w) => w.status === "pending" || w.status === "confirmed",
  ).length;

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div ref={rootRef}>
      <header data-dash-head>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Overview</p>
        <h1 className="mt-4 font-serif text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          {greeting()}, <span className="italic text-accent">{user.name.split(" ")[0]}.</span>
        </h1>
        <p className="mt-3 text-[15px] text-fog">
          Your garage at a glance — rentals, washes, and account details.
        </p>
      </header>

      {/* Stats */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Rentals"
          value={bookings === null ? "—" : activeRentals}
          hint={activeRentals > 0 ? "Pending & confirmed bookings" : "Nothing on the road yet"}
        />
        <StatCard
          label="Wash Orders"
          value={washes === null ? "—" : activeWashes}
          hint={activeWashes > 0 ? "Pending & confirmed washes" : "No washes scheduled"}
        />
        <StatCard label="Member Since" value={memberSince} hint="Welcome to the club" />
      </section>

      {/* Quick actions */}
      <section className="mt-10">
        <h2 data-dash-item className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ActionCard
            href="/#fleet"
            icon={CarFront}
            title="Book a vehicle"
            copy="Bikes to buses — pick your ride from the fleet."
          />
          <ActionCard
            href="/wash/book"
            icon={Droplets}
            title="Schedule a wash"
            copy="Professional detailing, inside and out."
          />
        </div>
      </section>

      {/* Profile + recent rentals */}
      <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div data-dash-item className="rounded-2xl border border-line bg-surface/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
              Account Details
            </h2>
            {user.isEmailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-accent">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-fog">
                <CircleDashed className="h-3.5 w-3.5" /> Unverified
              </span>
            )}
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            {[
              ["Name", user.name],
              ["Email", user.email],
              ["Phone", user.phone],
              ["Address", user.address],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-6 border-b border-line/60 pb-3 last:border-0 last:pb-0">
                <dt className="shrink-0 text-fog">{label}</dt>
                <dd className="truncate text-right text-cream">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {bookings && bookings.length > 0 ? (
          <div data-dash-item className="rounded-2xl border border-line bg-surface/60 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
                Recent Rentals
              </h2>
              <Link href="/dashboard/rentals" className="text-[12px] font-medium text-accent">
                View all
              </Link>
            </div>
            <div className="mt-5">
              <RentalsList bookings={bookings.slice(0, 3)} onChanged={reload} />
            </div>
          </div>
        ) : (
          <div
            data-dash-item
            className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fog">
              <CarFront className="h-5 w-5" />
            </span>
            <p className="mt-4 font-serif text-xl text-cream">No rentals yet</p>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-fog">
              Vehicles you book will appear here once you hit the road. Washes get their own
              panel below.
            </p>
            <Link href="/#fleet" className="nav-link mt-5 text-[13px] font-medium text-accent">
              Browse the fleet
            </Link>
          </div>
        )}
      </section>

      {/* Recent washes — only once there's something to show; the empty case is
          already covered by the panel above. */}
      {washes && washes.length > 0 ? (
        <section data-dash-item className="mt-4 rounded-2xl border border-line bg-surface/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
              Recent Washes
            </h2>
            <Link href="/dashboard/washes" className="text-[12px] font-medium text-accent">
              View all
            </Link>
          </div>
          <div className="mt-5">
            <WashesList orders={washes.slice(0, 3)} onChanged={reload} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
