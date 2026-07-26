"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { gsap, MOTION_OK } from "./gsap";
import { useReveal } from "./useReveal";
import MaskText from "./MaskText";

interface ServiceCard {
  href: string;
  chip: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  span: string;
}

const CARDS: ServiceCard[] = [
  {
    href: "#fleet",
    chip: "RENTALS",
    title: "Vehicle Rentals",
    description:
      "From city scooters to 30-seat buses. Every vehicle inspected, insured, and ready.",
    image: "/byd_atto_3.png",
    alt: "Rental SUV parked in soft studio light",
    span: "md:col-span-7",
  },
  {
    href: "#pricing",
    chip: "WASHING",
    title: "Professional Washing",
    description: "Hand wash to full detail. Priced fairly for every vehicle size.",
    image: "/car_wash_detail.png",
    alt: "Foam wash detail on a car body panel",
    span: "md:col-span-5",
  },
];

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  useReveal(sectionRef);

  // Subtle 3D tilt toward the cursor (±4°)
  const onTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!window.matchMedia(MOTION_OK).matches) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, {
      rotateY: px * 4,
      rotateX: -py * 4,
      duration: 0.5,
      ease: "power3.out",
      transformPerspective: 1000,
    });
  };
  const onTiltReset = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "power3.out" });
  };

  return (
    <section ref={sectionRef} id="services" className="mx-auto max-w-wrap px-6 py-32 md:py-44">
      {/* Section marker */}
      <p
        data-wipe
        aria-hidden
        className="text-outline pointer-events-none select-none font-serif text-[clamp(5rem,10vw,9rem)] leading-none"
      >
        01
      </p>

      <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <MaskText
          className="font-serif text-4xl tracking-[-0.02em] text-cream md:text-6xl"
          lines={[
            "Two crafts.",
            <>
              One <em className="italic text-accent">roof.</em>
            </>,
          ]}
        />
        <p data-fade className="max-w-sm text-sm leading-relaxed text-fog md:text-base">
          Rinova brings Kathmandu&rsquo;s vehicle rentals and professional washing together, booked
          online, handled by people who care.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 items-start gap-6 md:mt-20 md:grid-cols-12">
        {CARDS.map((card, i) => (
          <div
            key={card.title}
            className={`${card.span} ${i === 1 ? "md:mt-24" : ""} [perspective:1200px]`}
          >
            <div onMouseMove={onTilt} onMouseLeave={onTiltReset} className="h-full">
              <Link
                href={card.href}
                className="card-lift group block h-full rounded-2xl border border-line bg-surface"
              >
                <div data-curtain className="relative overflow-hidden rounded-t-2xl">
                  <div className="card-img relative aspect-[4/3]">
                    <Image
                      data-curtain-img
                      data-parallax="6"
                      src={card.image}
                      alt={card.alt}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 55vw"
                      className="object-cover"
                    />
                  </div>
                  <span className="absolute left-5 top-5 rounded-full bg-night/70 px-4 py-1.5 text-[11px] font-medium tracking-[0.18em] text-cream backdrop-blur-sm border border-cream/10">
                    {card.chip}
                  </span>
                </div>
                <div className="p-7 md:p-9">
                  <h3 className="font-serif text-2xl text-cream md:text-3xl">{card.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-fog md:text-base">
                    {card.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
                    Explore
                    <ArrowRight className="card-arrow h-4 w-4" />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
