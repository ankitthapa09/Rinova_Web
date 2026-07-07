"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useLayoutEffect, useRef } from "react";
import { gsap, EASE, MOTION_OK } from "./gsap";
import { useWebGL } from "./three/useWebGL";
import SplitChars from "./SplitChars";
import MagneticButton from "./MagneticButton";
import CountUp from "./CountUp";

const HeroScene = dynamic(() => import("./three/HeroScene"), { ssr: false });

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gl = useWebGL();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(section);

      // Entrance: characters cascade in, then the stage and supporting copy
      const tl = gsap.timeline({ delay: 0.15, defaults: { ease: EASE } });
      tl.to(q(".split-char"), { y: 0, rotate: 0, duration: 1.15, stagger: 0.022 }, 0)
        .fromTo(stageRef.current, { opacity: 0 }, { opacity: 1, duration: 1.8 }, 0.5)
        .fromTo(q("[data-hero-sub]"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.7)
        .fromTo(
          q("[data-hero-ctas] > *"),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 },
          0.85,
        )
        .fromTo(q("[data-hero-bottom]"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 1.05);

      // Glow orbs drift slower on scroll (parallax planes)
      gsap.to(q("[data-hero-glow]"), {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative flex h-[100svh] min-h-[760px] flex-col overflow-hidden"
    >
      {/* Ambient light pools */}
      <div data-hero-glow aria-hidden className="glow-orb absolute -right-[15%] -top-[25%] h-[75vw] w-[75vw]" />
      <div data-hero-glow aria-hidden className="glow-orb absolute -bottom-[35%] -left-[20%] h-[65vw] w-[65vw] opacity-60" />

      {/* 3D stage — convertible center-low, orbits on scroll, tilts with cursor */}
      <div ref={stageRef} className="absolute inset-0 opacity-0">
        {gl?.webgl ? (
          <HeroScene animate={gl.animate} />
        ) : gl ? (
          <>
            <Image
              src="/hero_sports_car.png"
              alt="Gleaming sports car in a dark showroom"
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-50 [filter:saturate(0.7)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night via-night/50 to-night/20" />
          </>
        ) : null}
        {/* Legibility falloff where the copy sits over the car */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-[42%] h-[30%] bg-gradient-to-b from-transparent via-night/45 to-transparent"
        />
      </div>

      {/* Centered content over the stage */}
      <div className="relative z-10 mx-auto flex w-full max-w-wrap flex-1 flex-col items-center px-6 pt-[18vh] text-center">
        <h1 className="font-serif text-[clamp(3.2rem,9vw,8.5rem)] leading-[0.98] tracking-[-0.03em] text-cream">
          <span className="split-line" aria-label="Rent it. Wash it.">
            <SplitChars text="Rent it." />{" "}
            <SplitChars text="Wash" className="italic text-accent" />{" "}
            <SplitChars text="it." />
          </span>
          <span className="split-line" aria-label="Drive on.">
            <SplitChars text="Drive on." />
          </span>
        </h1>

        <p data-hero-sub className="mt-7 max-w-xl text-base leading-relaxed text-fog md:text-lg">
          Premium vehicle rentals and professional washing — cars, bikes, vans, and more. One
          destination.
        </p>

        <div data-hero-ctas className="mt-9 flex flex-wrap justify-center gap-4">
          <MagneticButton href="#fleet">Browse the Fleet</MagneticButton>
          <MagneticButton href="#pricing" variant="outline">
            Wash Packages
          </MagneticButton>
        </div>
      </div>

      {/* Bottom bar: stats spread wide, scroll cue right */}
      <div data-hero-bottom className="relative z-10 mx-auto w-full max-w-wrap px-6 pb-10">
        <div className="flex items-end justify-between gap-6 border-t border-cream/10 pt-7">
          <dl className="flex gap-8 md:gap-14">
            <div>
              <dt className="sr-only">Vehicles</dt>
              <dd className="font-serif text-2xl text-cream md:text-3xl">
                <CountUp end={50} suffix="+" />
              </dd>
              <dd className="mt-1 text-[11px] uppercase tracking-[0.15em] text-fog">Vehicles</dd>
            </div>
            <div>
              <dt className="sr-only">Customers</dt>
              <dd className="font-serif text-2xl text-cream md:text-3xl">
                <CountUp end={5000} suffix="+" />
              </dd>
              <dd className="mt-1 text-[11px] uppercase tracking-[0.15em] text-fog">Customers</dd>
            </div>
            <div>
              <dt className="sr-only">Rating</dt>
              <dd className="font-serif text-2xl text-cream md:text-3xl">
                <CountUp end={4.9} decimals={1} suffix="★" />
              </dd>
              <dd className="mt-1 text-[11px] uppercase tracking-[0.15em] text-fog">Rated</dd>
            </div>
          </dl>

          <div aria-hidden className="hidden flex-col items-center gap-3 sm:flex">
            <span className="text-[10px] uppercase tracking-[0.2em] text-fog">Scroll</span>
            <div className="relative h-14 w-px bg-cream/15">
              <span className="scroll-cue-dot absolute left-[calc(50%-3px)] top-0 h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
