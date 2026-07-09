"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CarFront,
  CalendarRange,
  Users,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import Cursor from "@/components/landing/Cursor";
import { authApi, type ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { vehicleApi } from "@/lib/vehicleApi";
import { toast } from "@/components/ui/toast";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const NAV = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Fleet", icon: CarFront, active: false },
  { label: "Bookings", icon: CalendarRange, active: false },
  { label: "Customers", icon: Users, active: false },
];

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

function AdminContent({ user }: { user: ApiUser }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [fleetSize, setFleetSize] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ delay: 0.1, defaults: { ease: EASE } });
      tl.fromTo(q("[data-dash-side]"), { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9 }, 0)
        .fromTo(q("[data-dash-head] > *"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 }, 0.15)
        .fromTo(q("[data-dash-item]"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.07 }, 0.4);
    });
    return () => mm.revert();
  }, []);

  // Fleet size comes from the vehicle API — when the mock is swapped for the
  // real backend, this number becomes live automatically.
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

  const onLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authApi.logout();
      toast.success("Signed out. See you on the road.");
      router.push("/");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out. Please try again.");
    }
  };

  return (
    <div ref={rootRef} className="relative flex min-h-[100svh]">
      <Cursor />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        data-dash-side
        className="sticky top-0 hidden h-[100svh] w-[250px] shrink-0 flex-col border-r border-line px-6 py-8 lg:flex"
      >
        <div className="flex items-center gap-2.5">
          <Link href="/" className="font-serif text-xl tracking-[0.08em] text-cream">
            RINOVA
          </Link>
          <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-accent">
            Admin
          </span>
        </div>

        <nav className="mt-12 flex flex-col gap-1">
          {NAV.map((item) => (
            <span
              key={item.label}
              aria-disabled={!item.active}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] ${
                item.active
                  ? "bg-surface text-cream"
                  : "cursor-not-allowed text-fog/70"
              }`}
            >
              {item.active ? (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
              ) : null}
              <item.icon className={`h-4 w-4 ${item.active ? "text-accent" : ""}`} />
              {item.label}
              {!item.active ? (
                <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-fog">
                  Soon
                </span>
              ) : null}
            </span>
          ))}
        </nav>

        <div className="mt-auto border-t border-line pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-medium text-[13px] text-night">
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-cream">{user.name}</span>
              <span className="block truncate text-[11px] text-fog">{user.email}</span>
            </span>
            <button
              onClick={onLogout}
              aria-label="Sign out"
              className="shrink-0 rounded-full p-2 text-fog transition-colors hover:text-accent"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div aria-hidden className="glow-orb absolute -right-[20%] -top-[30%] h-[50vw] w-[50vw]" />

        <div className="relative mx-auto w-full max-w-[1060px] px-6 py-8 lg:px-12 lg:py-12">
          {/* Mobile topbar */}
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="font-serif text-xl tracking-[0.08em] text-cream">
                RINOVA
              </Link>
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-accent">
                Admin
              </span>
            </div>
            <button
              onClick={onLogout}
              aria-label="Sign out"
              className="rounded-full p-2 text-fog transition-colors hover:text-accent"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

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

          {/* Stats */}
          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Fleet Size"
              value={fleetSize ?? "—"}
              hint="Vehicles listed for rent"
            />
            <StatCard label="Active Bookings" value="0" hint="Awaiting the bookings API" />
            <StatCard label="Customers" value="—" hint="Awaiting the customers API" />
          </section>

          {/* Quick actions */}
          <section className="mt-10">
            <h2 data-dash-item className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
              Quick Actions
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ActionCard
                href="/vehicles"
                icon={CarFront}
                title="View the fleet"
                copy="See the public vehicle listing as customers do."
              />
              <ActionCard
                href="#"
                icon={Plus}
                title="Add a vehicle"
                copy="List a new vehicle for rent — coming with fleet tools."
                soon
              />
            </div>
          </section>

          {/* Placeholder for upcoming admin tables */}
          <section className="mt-10">
            <div
              data-dash-item
              className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fog">
                <CalendarRange className="h-5 w-5" />
              </span>
              <p className="mt-4 font-serif text-xl text-cream">No bookings to manage yet</p>
              <p className="mt-2 max-w-[340px] text-sm leading-relaxed text-fog">
                Incoming rentals and wash orders will land here once the bookings
                API is wired up.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminView() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      toast.error("Please sign in to continue.");
      router.replace("/login");
    } else if (user.role !== "admin") {
      toast.error("That area is for staff only.");
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-[100svh] items-center justify-center">
        <p className="animate-pulse font-serif text-xl tracking-[0.08em] text-fog">RINOVA</p>
      </div>
    );
  }

  return <AdminContent user={user} />;
}
