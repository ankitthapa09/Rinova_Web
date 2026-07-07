"use client";

import { useLayoutEffect, useRef } from "react";
import { Leaf, Timer, Camera } from "lucide-react";
import { gsap, MOTION_OK } from "./gsap";
import { useReveal } from "./useReveal";

const LINE = "We treat every vehicle like it's ours.";

const CHIPS = [
  { icon: Leaf, label: "Eco products" },
  { icon: Timer, label: "20-min express" },
  { icon: Camera, label: "Before/after photos" },
];

/**
 * The molten interlude — the one full-orange beat in the midnight page.
 * The line sits ghosted on the orange and each word inks itself in as you
 * scroll through the section (scrubbed text fill).
 */
export default function DarkInterlude() {
  const sectionRef = useRef<HTMLElement>(null);
  useReveal(sectionRef);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const trigger = {
        trigger: section,
        start: "top 65%",
        end: "center 35%",
        scrub: 0.5,
      };
      gsap.to(section.querySelectorAll(".fill-word"), {
        color: "#0B0B0D",
        stagger: 0.35,
        ease: "none",
        scrollTrigger: trigger,
      });
      gsap.to(section.querySelectorAll(".fill-word-em"), {
        color: "#F4F1EA",
        stagger: 0.35,
        ease: "none",
        scrollTrigger: trigger,
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="washing"
      className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-[#FF5C1A] via-[#F04E0A] to-[#D63A00] text-night"
    >
      {/* Drifting outlined watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          data-drift="8"
          className="text-outline-night select-none whitespace-nowrap font-serif text-[34vw] leading-none opacity-60"
        >
          WASH
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-wrap px-6 py-36 text-center">
        <p data-fade className="mb-10 text-[11px] font-medium uppercase tracking-[0.25em] text-night/60">
          The wash experience
        </p>

        <h2 className="mx-auto max-w-5xl font-serif text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.08] tracking-[-0.02em]">
          {LINE.split(" ").map((word, i) => (
            <span key={i}>
              {word === "ours." ? (
                <em className="fill-word-em italic text-night/25">{word}</em>
              ) : (
                <span className="fill-word inline-block text-night/25">{word}</span>
              )}
              {i < LINE.split(" ").length - 1 && " "}
            </span>
          ))}
        </h2>

        <div data-stagger className="mt-16 flex flex-wrap items-center justify-center gap-4">
          {CHIPS.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-2.5 rounded-full border border-night/30 px-6 py-3 text-sm text-night/80"
            >
              <chip.icon className="h-4 w-4 text-night/50" strokeWidth={1.5} />
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
