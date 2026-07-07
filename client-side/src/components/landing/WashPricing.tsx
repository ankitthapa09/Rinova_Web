"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  name: string;
  duration: string;
  prices: Record<VehicleType, number>;
  features: string[];
  popular?: boolean;
}

const PACKAGES: WashPackage[] = [
  {
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

export default function WashPricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [vehicle, setVehicle] = useState<VehicleType>("car");
  const firstRender = useRef(true);
  useReveal(sectionRef);

  // Morph prices + quick stagger re-reveal when the vehicle type changes
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const cards = cardsRef.current;
    if (!cards || !window.matchMedia(MOTION_OK).matches) return;
    gsap.fromTo(
      cards.querySelectorAll(".price-value"),
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: EASE, stagger: 0.08 },
    );
    gsap.fromTo(
      cards.children,
      { y: 10, opacity: 0.4 },
      { y: 0, opacity: 1, duration: 0.4, ease: EASE, stagger: 0.08, overwrite: "auto" },
    );
  }, [vehicle]);

  return (
    <section ref={sectionRef} id="pricing" className="bg-[#140E09]">
      <div className="mx-auto max-w-wrap px-6 py-32 md:py-44">
        <p
          data-wipe
          aria-hidden
          className="text-outline-accent pointer-events-none select-none font-serif text-[clamp(4rem,8vw,7rem)] leading-none"
        >
          03
        </p>

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

        {/* Segmented vehicle-type control */}
        <div
          data-fade
          role="tablist"
          aria-label="Vehicle type"
          className="mt-12 inline-flex flex-wrap gap-1 rounded-full border border-cream/10 bg-surface p-1.5"
        >
          {VEHICLE_TYPES.map((type) => (
            <button
              key={type.id}
              role="tab"
              aria-selected={vehicle === type.id}
              onClick={() => setVehicle(type.id)}
              className={`rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors duration-300 ${
                vehicle === type.id ? "bg-accent text-night" : "text-fog hover:text-cream"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Package cards */}
        <div ref={cardsRef} data-stagger className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <article
              key={pkg.name}
              className={`card-lift relative flex flex-col rounded-2xl bg-surface p-8 md:p-10 ${
                pkg.popular ? "border border-line border-t-2 border-t-accent shadow-lift" : "border border-line"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3.5 left-8 rounded-full bg-accent px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-night">
                  Most Popular
                </span>
              )}
              <h3 className="font-serif text-2xl text-cream">{pkg.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-fog">{pkg.duration}</p>
              <p className="price-value mt-6 font-serif text-4xl tracking-tight text-cream md:text-5xl">
                NPR {pkg.prices[vehicle].toLocaleString("en-US")}
              </p>
              <ul className="mt-8 flex-1 divide-y divide-line border-y border-line">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 py-3.5 text-sm text-fog">
                    <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="#contact"
                className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-medium transition-colors duration-300 ${
                  pkg.popular
                    ? "bg-accent text-night hover:bg-[#FF7A45]"
                    : "border border-cream/25 text-cream hover:border-accent hover:text-accent"
                }`}
              >
                Book this wash
              </Link>
            </article>
          ))}
        </div>

        <p data-fade className="mt-10 text-center text-xs text-fog">
          Prices include eco-friendly products and hand-dry finish.
        </p>
      </div>
    </section>
  );
}
