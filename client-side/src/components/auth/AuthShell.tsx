"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import { useWebGL } from "@/components/landing/three/useWebGL";
import SplitChars from "@/components/landing/SplitChars";
import Cursor from "@/components/landing/Cursor";

const AuthScene = dynamic(() => import("./AuthScene"), { ssr: false });

export interface AuthTitleLine {
  text: string;
  accent?: boolean;
}

interface AuthShellProps {
  eyebrow: string;
  title: AuthTitleLine[];
  subtitle: string;
  /** Giant outlined word behind the vehicle on the stage panel */
  watermark: string;
  vehicleUrl: string;
  vehicleLength: number;
  /** "New here?" / "Create one" — prompt under the form to swap pages */
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
  children: ReactNode;
}

/**
 * Split-screen auth chrome: form column on the left, 3D vehicle stage with
 * an outlined watermark on the right. Owns the entrance choreography —
 * char-cascade headline, staggered form rows, stage fade, divider draw.
 */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  watermark,
  vehicleUrl,
  vehicleLength,
  switchPrompt,
  switchLabel,
  switchHref,
  children,
}: AuthShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLSpanElement>(null);
  const gl = useWebGL();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);

      const tl = gsap.timeline({ delay: 0.1, defaults: { ease: EASE } });
      tl.fromTo(q("[data-auth-top]"), { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0)
        .fromTo(q("[data-auth-eyebrow]"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.15)
        .to(q(".split-char"), { y: 0, rotate: 0, duration: 1.1, stagger: 0.03 }, 0.1)
        .fromTo(q("[data-auth-sub]"), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.55)
        .fromTo(
          q("[data-auth-item]"),
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.08 },
          0.65,
        )
        .fromTo(q("[data-auth-divider]"), { scaleY: 0 }, { scaleY: 1, duration: 1.4 }, 0.3)
        .fromTo(stageRef.current, { opacity: 0 }, { opacity: 1, duration: 1.8 }, 0.5)
        .fromTo(
          watermarkRef.current,
          { yPercent: 30, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.5 },
          0.55,
        )
        .fromTo(q("[data-auth-tagline]"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 1.0);

      // Watermark drifts gently toward the cursor (parallax plane behind the car)
      if (window.matchMedia("(pointer: fine)").matches && watermarkRef.current) {
        const xTo = gsap.quickTo(watermarkRef.current, "x", { duration: 0.8, ease: "power3.out" });
        const yTo = gsap.quickTo(watermarkRef.current, "y", { duration: 0.8, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          xTo(((e.clientX / window.innerWidth) * 2 - 1) * -18);
          yTo(((e.clientY / window.innerHeight) * 2 - 1) * -10);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
      }
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative min-h-[100svh] lg:grid lg:grid-cols-[minmax(0,46%)_1fr]">
      <Cursor />

      {/* ── Form column ─────────────────────────────────────── */}
      <div className="relative flex min-h-[100svh] flex-col px-6 py-8 sm:px-12 lg:px-14 xl:px-20">
        {/* Ambient pool behind the form on small screens */}
        <div aria-hidden className="glow-orb absolute -left-[30%] top-[55%] h-[80vw] w-[80vw] opacity-50 lg:opacity-30" />

        <div data-auth-top className="relative z-10 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl tracking-[0.08em] text-cream">
            RINOVA
          </Link>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-fog transition-colors hover:text-cream"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-500 ease-expo group-hover:-translate-x-1" />
            Back
          </Link>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-14">
          <p data-auth-eyebrow className="mb-6 text-[11px] font-medium uppercase tracking-[0.25em] text-fog">
            {eyebrow}
          </p>

          <h1 className="mb-5 font-serif text-[clamp(2.9rem,5.5vw,4.4rem)] leading-[1.02] tracking-[-0.02em] text-cream">
            {title.map((line, i) => (
              <span key={i} className="split-line" aria-label={line.text}>
                <SplitChars text={line.text} className={line.accent ? "italic text-accent" : ""} />
              </span>
            ))}
          </h1>

          <p data-auth-sub className="mb-10 text-[15px] leading-relaxed text-fog">
            {subtitle}
          </p>

          {children}

          <p data-auth-item className="mt-9 text-sm text-fog">
            {switchPrompt}{" "}
            <Link href={switchHref} className="nav-link font-medium text-cream hover:text-accent">
              {switchLabel}
            </Link>
          </p>
        </div>
      </div>

      {/* ── 3D stage panel ──────────────────────────────────── */}
      <div className="relative hidden overflow-hidden lg:block">
        <div
          data-auth-divider
          aria-hidden
          className="absolute inset-y-0 left-0 z-20 w-px origin-top bg-line"
        />
        <div aria-hidden className="glow-orb absolute -right-[20%] -top-[30%] h-[55vw] w-[55vw]" />
        <div aria-hidden className="glow-orb absolute -bottom-[35%] -left-[15%] h-[45vw] w-[45vw] opacity-60" />

        {/* Outlined watermark behind the vehicle */}
        <span
          ref={watermarkRef}
          aria-hidden
          className="text-outline absolute inset-x-0 top-[16%] z-0 select-none text-center font-serif text-[clamp(7rem,13vw,12rem)] leading-none tracking-[0.02em]"
        >
          {watermark}
        </span>

        <div ref={stageRef} className="absolute inset-0 z-10">
          {gl?.webgl ? (
            <AuthScene url={vehicleUrl} length={vehicleLength} animate={gl.animate} />
          ) : gl ? (
            <>
              <Image
                src="/hero_sports_car.png"
                alt=""
                fill
                sizes="60vw"
                className="object-cover opacity-40 [filter:saturate(0.7)]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/10" />
            </>
          ) : null}
        </div>

        <div data-auth-tagline className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-12 pb-10">
          <p className="font-serif text-lg italic text-cream/70">
            Rent it. <span className="text-accent">Wash it.</span> Drive on.
          </p>
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-fog">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(255,92,26,0.9)]" />
            Members Garage
          </span>
        </div>
      </div>
    </div>
  );
}
