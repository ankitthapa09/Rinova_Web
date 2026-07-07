"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "./gsap";
import { useReveal } from "./useReveal";

const QUOTES = [
  {
    quote:
      "Rented a jeep for a week in the hills — spotless, serviced, and the handover took ten minutes. This is how it should work everywhere.",
    name: "Ramesh Shrestha",
    role: "Frequent renter",
  },
  {
    quote:
      "My scooter gets the Deep Clean every month. Fair price for a bike, and they treat it with the same care as the big SUVs.",
    name: "Sunita Karki",
    role: "Wash member",
  },
  {
    quote:
      "We keep our delivery vans on Rinova's wash schedule. Reliable slots, clean invoices, zero excuses. A proper professional outfit.",
    name: "Bikash Tamang",
    role: "Business client",
  },
];

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const firstRender = useRef(true);
  useReveal(sectionRef);

  // Word-cascade crossfade on index change
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = quoteRef.current;
    if (!el || !window.matchMedia(MOTION_OK).matches) return;
    gsap.fromTo(
      el.querySelectorAll(".t-word"),
      { y: 16, opacity: 0, filter: "blur(4px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: EASE, stagger: 0.016 },
    );
    gsap.fromTo(
      el.querySelectorAll(".t-meta"),
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: EASE, delay: 0.25 },
    );
  }, [index]);

  // Auto-rotate every 6s (restarts after manual navigation)
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(id);
  }, [index]);

  const current = QUOTES[index];
  const initials = current.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-t border-line">
      {/* Oversized quotation mark watermark, 0.3× parallax */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 flex justify-center"
      >
        <span
          data-parallax="12"
          className="text-outline select-none font-serif text-[24rem] leading-none opacity-60"
        >
          &ldquo;
        </span>
      </div>

      <div className="relative mx-auto max-w-wrap px-6 py-32 text-center md:py-44">
        <p data-fade className="mb-14 text-[11px] font-medium uppercase tracking-[0.25em] text-fog">
          What customers say
        </p>

        <div data-fade ref={quoteRef} aria-live="polite" className="mx-auto max-w-3xl">
          <blockquote className="font-serif text-2xl leading-snug tracking-[-0.01em] text-cream md:text-4xl">
            {`“${current.quote}”`.split(" ").map((word, i) => (
              <span key={`${index}-${i}`} className="t-word inline-block">
                {word}&nbsp;
              </span>
            ))}
          </blockquote>
          <div className="t-meta mt-10 flex items-center justify-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 font-serif text-sm text-ember">
              {initials}
            </span>
            <span className="text-left">
              <span className="block text-sm font-medium text-cream">{current.name}</span>
              <span className="block text-xs text-fog">{current.role}</span>
            </span>
          </div>
        </div>

        <div data-fade className="mt-14 flex items-center justify-center gap-4">
          <button
            aria-label="Previous testimonial"
            onClick={() => setIndex((index - 1 + QUOTES.length) % QUOTES.length)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-cream transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="flex gap-2">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                aria-label={`Show testimonial ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ease-expo ${
                  i === index ? "w-8 bg-accent" : "w-1.5 bg-line hover:bg-fog"
                }`}
              />
            ))}
          </div>
          <button
            aria-label="Next testimonial"
            onClick={() => setIndex((index + 1) % QUOTES.length)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-cream transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
