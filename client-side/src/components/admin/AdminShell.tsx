"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CarFront,
  CalendarRange,
  Droplets,
  Users,
  LogOut,
} from "lucide-react";
import Cursor from "@/components/landing/Cursor";
import { authApi, type ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/components/ui/toast";

// The shell resolves the admin once and shares it, so child pages don't each
// re-run the session restore.
const AdminUserContext = createContext<ApiUser | null>(null);

export function useAdminUser(): ApiUser {
  const user = useContext(AdminUserContext);
  if (!user) throw new Error("useAdminUser must be used inside AdminShell");
  return user;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof CarFront;
  soon?: boolean;
}

// The admin's own navigation — the operator's jobs, not a customer's. Sections
// whose backend isn't built yet are flagged `soon` and light up as we add each.
const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Vehicles", href: "/admin/vehicles", icon: CarFront },
  { label: "Rental Bookings", href: "/admin/rentals", icon: CalendarRange },
  { label: "Wash Orders", href: "/admin/washes", icon: Droplets, soon: true },
  { label: "Customers", href: "/admin/customers", icon: Users },
];

function NavLinks({ pathname }: { pathname: string }) {
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {NAV.map((item) => {
        const active = !item.soon && isActive(item.href);
        const base = "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px]";

        if (item.soon) {
          return (
            <span
              key={item.label}
              aria-disabled
              className={`${base} cursor-not-allowed text-fog/70`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-fog">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`${base} ${active ? "bg-surface text-cream" : "text-fog/80 hover:text-cream"}`}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
            ) : null}
            <item.icon className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

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
    <AdminUserContext.Provider value={user}>
      <div className="relative flex min-h-[100svh]">
        <Cursor />

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-[100svh] w-[250px] shrink-0 flex-col border-r border-line px-6 py-8 lg:flex">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="font-serif text-xl tracking-[0.08em] text-cream">
              RINOVA
            </Link>
            <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-accent">
              Admin
            </span>
          </div>

          <nav className="mt-12 flex flex-col gap-1">
            <NavLinks pathname={pathname} />
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

        {/* ── Main ────────────────────────────────────────── */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div aria-hidden className="glow-orb absolute -right-[20%] -top-[30%] h-[50vw] w-[50vw]" />

          <div className="relative mx-auto w-full max-w-[1100px] px-6 py-8 lg:px-12 lg:py-12">
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

            {/* Mobile nav — horizontal scroll of the same sections */}
            <nav className="mb-8 flex gap-1 overflow-x-auto lg:hidden">
              <NavLinks pathname={pathname} />
            </nav>

            {children}
          </div>
        </div>
      </div>
    </AdminUserContext.Provider>
  );
}
