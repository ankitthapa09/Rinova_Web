"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { gsap, EASE, ScrollTrigger } from "./gsap";
import { useReveal } from "./useReveal";
import { useWebGL } from "./three/useWebGL";
import { VEHICLES } from "./three/vehicles";
import MaskText from "./MaskText";

const FleetScene = dynamic(() => import("./three/FleetScene"), { ssr: false });

/**
 * The fleet showcase, one vehicle category on stage at a time.
 * Desktop, the section pins and vertical scroll slides the 3D vehicles
 * horizontally through the stage, one category per viewport of scroll.
 * Mobile, arrows drive the same scene.
 */
export default function Fleet() {
  const sectionRef = useRef<HTMLElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [active, setActive] = useState(0);
  const firstRender = useRef(true);
  const gl = useWebGL();
  useReveal(sectionRef);

  // The stage holds five vehicles, parsing and uploading them costs a few
  // hundred ms. Mounting it with the page makes the hero pay that bill while
  // the visitor is still looking at the hero. Mount a screen early instead  // far enough ahead that it's warm on arrival, late enough to leave the hero alone.
  const [stageReady, setStageReady] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || stageReady) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStageReady(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [stageReady]);

  // Desktop, pin + scrub category progress
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      let last = 0;
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${(VEHICLES.length - 1) * window.innerHeight}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress * (VEHICLES.length - 1);
          progressRef.current = p;
          const rounded = Math.round(p);
          if (rounded !== last) {
            last = rounded;
            setActive(rounded);
          }
        },
      });
      return () => st.kill();
    });
    return () => mm.revert();
  }, []);

  // Animate the info block every time the category changes
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const info = infoRef.current;
    if (!info || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    gsap.fromTo(
      info.children,
      { y: 26, opacity: 0, filter: "blur(6px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: EASE, stagger: 0.06 },
    );
  }, [active]);

  // Mobile arrows drive the same progress value
  const go = (dir: number) => {
    const next = Math.min(VEHICLES.length - 1, Math.max(0, active + dir));
    progressRef.current = next;
    setActive(next);
  };

  const vehicle = VEHICLES[active];

  return (
    <section ref={sectionRef} id="fleet" className="relative overflow-hidden">
      <div className="relative flex h-[100svh] min-h-[680px] flex-col overflow-hidden">
        {/* Swapping outlined watermark */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            key={vehicle.id}
            className="fleet-word text-outline select-none font-serif text-[30vw] leading-none opacity-70"
          >
            {vehicle.watermark}
          </span>
        </div>

        {/* 3D stage */}
        {gl?.webgl && stageReady && (
          <div className="absolute inset-0">
            <FleetScene progressRef={progressRef} animate={gl.animate} />
          </div>
        )}

        {/* Header */}
        <div className="relative mx-auto w-full max-w-wrap px-6 pt-28">
          <div className="flex items-end justify-between">
            <div>
              <p
                data-wipe
                aria-hidden
                className="text-outline pointer-events-none select-none font-serif text-[clamp(3rem,6vw,5rem)] leading-none"
              >
                02
              </p>
              <MaskText
                className="mt-2 font-serif text-4xl tracking-[-0.02em] text-cream md:text-5xl"
                lines={[
                  <>
                    Pick your <em className="italic text-accent">ride.</em>
                  </>,
                ]}
              />
            </div>
            <p data-fade className="hidden text-[11px] uppercase tracking-[0.2em] text-fog md:block">
              Keep scrolling
            </p>
          </div>
        </div>

        {/* Bottom overlay: category info + rail */}
        <div className="relative mx-auto mt-auto w-full max-w-wrap px-6 pb-12 md:pb-16">
          <div className="flex items-end justify-between gap-6">
            <div ref={infoRef} className="max-w-md">
              <p className="text-[11px] uppercase tracking-[0.25em] text-fog">
                {String(active + 1).padStart(2, "0")} / {String(VEHICLES.length).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-serif text-4xl text-cream md:text-6xl">{vehicle.name}</h3>
              <p className="mt-2 text-sm text-fog md:text-base">{vehicle.tagline}</p>
              <div className="mt-5 flex flex-wrap items-center gap-6">
                <p className="text-sm text-fog">
                  from <span className="font-serif text-2xl text-cream">NPR {vehicle.price}</span>
                  /day
                </p>
                <Link
                  href={`/vehicles?category=${vehicle.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-transform duration-300 hover:translate-x-1"
                >
                  View vehicles <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Category rail (desktop) */}
            <div className="hidden flex-col items-end gap-3 md:flex">
              {VEHICLES.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3">
                  <span
                    className={`text-[11px] uppercase tracking-[0.18em] transition-colors duration-500 ${
                      i === active ? "text-cream" : "text-fog/50"
                    }`}
                  >
                    {v.name}
                  </span>
                  <span
                    className={`h-px transition-all duration-500 ease-expo ${
                      i === active ? "w-10 bg-accent" : "w-4 bg-line"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Arrows (mobile) */}
            <div className="flex gap-3 md:hidden">
              <button
                aria-label="Previous vehicle type"
                onClick={() => go(-1)}
                disabled={active === 0}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-cream transition-colors duration-300 hover:border-accent disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                aria-label="Next vehicle type"
                onClick={() => go(1)}
                disabled={active === VEHICLES.length - 1}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-cream transition-colors duration-300 hover:border-accent disabled:opacity-30"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Progress line */}
          <div className="mt-8 h-px w-full bg-line">
            <div
              className="h-full origin-left bg-accent transition-transform duration-700 ease-expo"
              style={{ transform: `scaleX(${(active + 1) / VEHICLES.length})` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
