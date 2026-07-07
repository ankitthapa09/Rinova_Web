"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, EASE, MOTION_OK } from "./gsap";
import { useReveal } from "./useReveal";
import MaskText from "./MaskText";

const STEPS = [
  { number: "01", title: "Choose", text: "vehicle or wash package" },
  { number: "02", title: "Book", text: "pick your date & slot online" },
  { number: "03", title: "Pay", text: "secure checkout, instant confirmation" },
  { number: "04", title: "Go", text: "drive out or drop off. Done." },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  useReveal(sectionRef);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const line = lineRef.current;
    if (!section || !line) return;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.to(line, {
        scaleX: 1,
        duration: 1.8,
        ease: EASE,
        scrollTrigger: { trigger: line, start: "top 80%", once: true },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} id="about" className="mx-auto max-w-wrap px-6 py-32 md:py-44">
      <p
        data-wipe
        aria-hidden
        className="text-outline pointer-events-none select-none font-serif text-[clamp(4rem,8vw,7rem)] leading-none"
      >
        04
      </p>

      <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <MaskText
          className="font-serif text-4xl tracking-[-0.02em] text-cream md:text-6xl"
          lines={[
            "Four steps.",
            <>
              Zero <em className="italic text-accent">friction.</em>
            </>,
          ]}
        />
        <p data-fade className="max-w-sm text-sm leading-relaxed text-fog md:text-base">
          Booking a vehicle or a wash takes minutes — everything happens online, confirmation is
          instant.
        </p>
      </div>

      {/* Connecting line draws itself across the row (desktop) */}
      <div aria-hidden className="mt-20 hidden h-px w-full md:block">
        <div ref={lineRef} className="h-full w-full origin-left scale-x-0 bg-cream/20" />
      </div>

      <div data-stagger className="mt-10 grid grid-cols-1 gap-12 sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.number}>
            <p
              aria-hidden
              className="text-outline pointer-events-none select-none font-serif text-6xl leading-none md:text-7xl"
            >
              {step.number}
            </p>
            <h3 className="mt-5 font-serif text-2xl text-cream">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fog">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
