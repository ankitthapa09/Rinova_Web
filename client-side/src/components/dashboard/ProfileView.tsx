"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import AccountCard from "@/components/dashboard/AccountCard";
import ChangePasswordCard from "@/components/dashboard/ChangePasswordCard";
import TwoFactorCard from "@/components/dashboard/TwoFactorCard";

export default function ProfileView() {
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

      {/* Account details — editable; email stays locked. */}
      <section className="mt-10">
        <AccountCard />
      </section>

      {/* Two-factor authentication */}
      <section className="mt-4">
        <TwoFactorCard />
      </section>

      {/* Signed-in password change */}
      <section className="mt-4">
        <ChangePasswordCard />
      </section>
    </div>
  );
}
