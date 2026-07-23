"use client";

import { useLayoutEffect, useRef } from "react";
import { BadgeCheck, CircleDashed } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import { useDashboardUser } from "@/components/dashboard/DashboardShell";
import TwoFactorCard from "@/components/dashboard/TwoFactorCard";

export default function ProfileView() {
  const user = useDashboardUser();
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ delay: 0.1, defaults: { ease: EASE } });
      tl.fromTo(q("[data-dash-head] > *"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 }, 0)
        .fromTo(q("[data-dash-item]"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, 0.25);
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef}>
      <header data-dash-head>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Profile</p>
        <h1 className="mt-4 font-serif text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          Your account & <span className="italic text-accent">security.</span>
        </h1>
        <p className="mt-3 text-[15px] text-fog">
          Your details and the locks that keep the account yours.
        </p>
      </header>

      {/* Account details — read-only mirror of the overview card. */}
      <section
        data-dash-item
        className="mt-10 rounded-2xl border border-line bg-surface/60 p-6"
      >
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
        <dl className="mt-5 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
          {[
            ["Name", user.name],
            ["Email", user.email],
            ["Phone", user.phone],
            ["Address", user.address],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-6 border-b border-line/60 pb-3"
            >
              <dt className="shrink-0 text-fog">{label}</dt>
              <dd className="truncate text-right text-cream">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Two-factor authentication */}
      <section className="mt-4">
        <TwoFactorCard />
      </section>
    </div>
  );
}
