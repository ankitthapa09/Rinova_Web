"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CarFront,
  Droplets,
  UserRound,
  LogOut,
  ArrowRight,
  BadgeCheck,
  CircleDashed,
} from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import Cursor from "@/components/landing/Cursor";
import { authApi, type ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
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
  { label: "My Rentals", icon: CarFront, active: false },
  { label: "Wash Orders", icon: Droplets, active: false },
  { label: "Profile", icon: UserRound, active: false },
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

function DashboardContent({ user }: { user: ApiUser }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);

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

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div ref={rootRef} className="relative flex min-h-[100svh]">
      <Cursor />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        data-dash-side
        className="sticky top-0 hidden h-[100svh] w-[250px] shrink-0 flex-col border-r border-line px-6 py-8 lg:flex"
      >
        <Link href="/" className="font-serif text-xl tracking-[0.08em] text-cream">
          RINOVA
        </Link>

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
            <Link href="/" className="font-serif text-xl tracking-[0.08em] text-cream">
              RINOVA
            </Link>
            <button
              onClick={onLogout}
              aria-label="Sign out"
              className="rounded-full p-2 text-fog transition-colors hover:text-accent"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

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
            <StatCard label="Active Rentals" value="0" hint="Nothing on the road yet" />
            <StatCard label="Wash Orders" value="0" hint="No washes scheduled" />
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
                href="/#washing"
                icon={Droplets}
                title="Schedule a wash"
                copy="Professional detailing, inside and out."
              />
            </div>
          </section>

          {/* Profile + activity */}
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

            <div
              data-dash-item
              className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fog">
                <CarFront className="h-5 w-5" />
              </span>
              <p className="mt-4 font-serif text-xl text-cream">No activity yet</p>
              <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-fog">
                Your rentals and wash orders will appear here once you hit the road.
              </p>
              <Link
                href="/#fleet"
                className="nav-link mt-5 text-[13px] font-medium text-accent"
              >
                Browse the fleet
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      toast.error("Please sign in to view your dashboard.");
      router.replace("/login");
    } else if (user.role === "admin") {
      // Admins have their own home — keep the two dashboards from mixing.
      router.replace("/admin");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role === "admin") {
    return (
      <div className="flex min-h-[100svh] items-center justify-center">
        <p className="animate-pulse font-serif text-xl tracking-[0.08em] text-fog">RINOVA</p>
      </div>
    );
  }

  return <DashboardContent user={user} />;
}
