"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "./gsap";
import { useReveal } from "./useReveal";
import MaskText from "./MaskText";

type VehicleType = "bike" | "car" | "suv" | "van" | "bus";

const VEHICLE_TYPES: { id: VehicleType; label: string }[] = [
  { id: "bike", label: "Bike" },
  { id: "car", label: "Car" },
  { id: "suv", label: "SUV/Jeep" },
  { id: "van", label: "Van" },
  { id: "bus", label: "Bus" },
];

interface WashPackage {
  /** Matches the server's catalogue id — carried into the booking form */
  id: "basic" | "deep" | "detail";
  name: string;
  duration: string;
  prices: Record<VehicleType, number>;
  features: string[];
  popular?: boolean;
}

const PACKAGES: WashPackage[] = [
  {
    id: "basic",
    name: "Basic Wash",
    duration: "20–30 min",
    prices: { bike: 150, car: 300, suv: 400, van: 500, bus: 900 },
    features: [
      "Exterior foam wash",
      "Hand-dry finish",
      "Tyre & rim shine",
      "Quick interior dust-off",
    ],
  },
  {
    id: "deep",
    name: "Deep Clean",
    duration: "60–90 min",
    prices: { bike: 400, car: 800, suv: 1000, van: 1200, bus: 2000 },
    features: [
      "Everything in Basic",
      "Interior vacuum & shampoo",
      "Engine bay rinse",
      "Spray wax protection",
      "Glass & mirror detail",
    ],
    popular: true,
  },
  {
    id: "detail",
    name: "Full Detail",
    duration: "3–4 hrs",
    prices: { bike: 1200, car: 2500, suv: 3000, van: 3500, bus: 6000 },
    features: [
      "Everything in Deep Clean",
      "Clay bar & swirl polish",
      "Leather & dash treatment",
      "Paint sealant shield",
      "Before / after photos",
    ],
  },
];

/** One odometer column: the digits 0–9 stacked; changing the value rolls the
 *  stack to the new digit like a mechanical counter. */
function Digit({ digit, order }: { digit: number; order: number }) {
  const colRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const col = colRef.current;
    if (!col) return;
    if (first.current) {
      first.current = false;
      gsap.set(col, { yPercent: -digit * 10 });
      return;
    }
    if (!window.matchMedia(MOTION_OK).matches) {
      gsap.set(col, { yPercent: -digit * 10 });
      return;
    }
    gsap.to(col, {
      yPercent: -digit * 10,
      duration: 0.85,
      delay: order * 0.06, // columns settle left → right
      ease: EASE,
      overwrite: "auto",
    });
  }, [digit, order]);

  return (
    <span className="inline-block h-[1em] overflow-hidden">
      <span ref={colRef} className="flex flex-col leading-none">
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="block h-[1em]">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

/** NPR price with rolling digits; separators stay put. */
function RollingPrice({ value }: { value: number }) {
  const chars = value.toLocaleString("en-US").split("");
  let digitOrder = 0;
  return (
    <span className="inline-flex tabular-nums leading-none" aria-label={`NPR ${value.toLocaleString("en-US")}`}>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={`d-${chars.length}-${i}`} digit={Number(ch)} order={digitOrder++} />
        ) : (
          <span key={`s-${chars.length}-${i}`} className="inline-block h-[1em]">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

export default function WashPricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [vehicle, setVehicle] = useState<VehicleType>("car");
  useReveal(sectionRef);

  // Sliding pill under the active vehicle tab.
  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    const pill = pillRef.current;
    if (!tabs || !pill) return;
    const active = tabs.querySelector<HTMLButtonElement>(`[data-tab="${vehicle}"]`);
    if (!active) return;
    const target = { x: active.offsetLeft, width: active.offsetWidth };
    if (window.matchMedia(MOTION_OK).matches) {
      gsap.to(pill, { ...target, duration: 0.55, ease: EASE, overwrite: "auto" });
    } else {
      gsap.set(pill, target);
    }
  }, [vehicle]);

  // Entrance: cards rise out of the floor with perspective, once.
  useLayoutEffect(() => {
    const cards = cardsRef.current;
    if (!cards) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const tween = gsap.from(cards.children, {
        y: 72,
        opacity: 0,
        rotationX: 9,
        transformOrigin: "center top",
        duration: 1.15,
        ease: EASE,
        stagger: 0.12,
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: cards, start: "top 78%", once: true },
      });
      return () => tween.kill();
    });
    return () => mm.revert();
  }, []);

  // Pointer tilt + glare that tracks the cursor (fine pointers only).
  const onCardMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!window.matchMedia("(pointer: fine)").matches || !window.matchMedia(MOTION_OK).matches) return;
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty("--gx", `${px * 100}%`);
    card.style.setProperty("--gy", `${py * 100}%`);
    gsap.to(card, {
      rotationY: (px - 0.5) * 6,
      rotationX: (0.5 - py) * 6,
      transformPerspective: 900,
      duration: 0.5,
      ease: "power2.out",
    });
  };
  const onCardLeave = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, { rotationX: 0, rotationY: 0, duration: 0.7, ease: EASE });
  };

  return (
    <section ref={sectionRef} id="pricing" className="bg-[#140E09]">
      <div className="mx-auto max-w-wrap px-6 py-32 md:py-44">
        <p
          data-wipe
          aria-hidden
          className="text-outline-accent pointer-events-none select-none font-serif text-[clamp(4rem,8vw,7rem)] leading-none"
        >
          04
        </p>

        {/* Heading row: title left, vehicle switcher right */}
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
          <div>
            <MaskText
              className="mt-4 font-serif text-4xl tracking-[-0.02em] text-cream md:text-6xl"
              lines={[
                "Every vehicle.",
                <>
                  Fairly <em className="italic text-accent">priced.</em>
                </>,
              ]}
            />
            <p data-fade className="mt-6 max-w-md text-sm leading-relaxed text-fog md:text-base">
              Wash pricing scales with vehicle size — you never overpay.
            </p>
          </div>

          {/* Segmented vehicle-type control with a sliding pill */}
          <div
            ref={tabsRef}
            data-fade
            role="tablist"
            aria-label="Vehicle type"
            className="relative inline-flex flex-wrap gap-1 rounded-full border border-cream/10 bg-surface p-1.5"
          >
            <span
              ref={pillRef}
              aria-hidden
              className="absolute left-0 top-1.5 bottom-1.5 rounded-full bg-accent"
              style={{ width: 0 }}
            />
            {VEHICLE_TYPES.map((type) => (
              <button
                key={type.id}
                data-tab={type.id}
                role="tab"
                aria-selected={vehicle === type.id}
                onClick={() => setVehicle(type.id)}
                className={`relative z-10 rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors duration-300 ${
                  vehicle === type.id ? "text-night delay-200" : "text-fog hover:text-cream"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Package cards — the popular one is the molten centerpiece */}
        <div
          ref={cardsRef}
          className="mt-14 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3"
          style={{ perspective: "1400px" }}
        >
          {PACKAGES.map((pkg, idx) => {
            const hot = Boolean(pkg.popular);
            return (
              <article
                key={pkg.name}
                onMouseMove={onCardMove}
                onMouseLeave={onCardLeave}
                className={`group relative flex flex-col overflow-hidden rounded-3xl p-8 will-change-transform md:p-10 ${
                  hot
                    ? "bg-gradient-to-b from-[#FF5C1A] to-[#E24A0A] text-night shadow-lift md:-my-4 md:py-14"
                    : "border border-line bg-surface"
                }`}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* cursor-tracking glare */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), ${
                      hot ? "rgba(255,255,255,0.14)" : "rgba(244,241,234,0.07)"
                    } 0%, transparent 55%)`,
                  }}
                />
                {/* giant ghost number */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -right-3 -top-6 select-none font-serif text-[7rem] leading-none ${
                    hot ? "text-night/10" : "text-cream/[0.04]"
                  }`}
                >
                  0{idx + 1}
                </span>

                <div className="flex items-center justify-between">
                  <h3 className={`font-serif text-2xl ${hot ? "text-night" : "text-cream"}`}>{pkg.name}</h3>
                  {hot && (
                    <span className="rounded-full bg-night px-3.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-cream">
                      Most popular
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-xs uppercase tracking-[0.15em] ${hot ? "text-night/60" : "text-fog"}`}>
                  {pkg.duration}
                </p>

                <p className={`mt-7 font-serif text-4xl tracking-tight md:text-5xl ${hot ? "text-night" : "text-cream"}`}>
                  <span className={`mr-2 text-[0.45em] uppercase tracking-[0.08em] ${hot ? "text-night/60" : "text-fog"}`}>
                    NPR
                  </span>
                  <RollingPrice value={pkg.prices[vehicle]} />
                  <span className={`ml-2 text-[0.32em] ${hot ? "text-night/60" : "text-fog"}`}>/ wash</span>
                </p>

                <ul className={`mt-8 flex-1 border-y ${hot ? "divide-y divide-night/15 border-night/15" : "divide-y divide-line border-line"}`}>
                  {pkg.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-center gap-3 py-3.5 text-sm ${hot ? "text-night/80" : "text-fog"}`}
                    >
                      <Check className={`h-4 w-4 shrink-0 ${hot ? "text-night" : "text-accent"}`} strokeWidth={1.5} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/wash/book?package=${pkg.id}&type=${vehicle}`}
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-medium transition-colors duration-300 ${
                    hot
                      ? "bg-night text-cream hover:bg-[#26242B]"
                      : "border border-cream/25 text-cream hover:border-accent hover:text-accent"
                  }`}
                >
                  Book this wash
                </Link>
              </article>
            );
          })}
        </div>

        <p data-fade className="mt-10 text-center text-xs text-fog">
          Prices include eco-friendly products and hand-dry finish.
        </p>
      </div>
    </section>
  );
}
