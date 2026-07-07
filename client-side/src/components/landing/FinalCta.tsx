"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { MapPin } from "lucide-react";
import { useReveal } from "./useReveal";
import { useWebGL } from "./three/useWebGL";
import SplitChars from "./SplitChars";
import MagneticButton from "./MagneticButton";

const ParticleField = dynamic(() => import("./three/ParticleField"), { ssr: false });

export default function FinalCta() {
  const sectionRef = useRef<HTMLElement>(null);
  const gl = useWebGL();
  useReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative overflow-hidden border-t border-line"
    >
      {/* Ambient glow + drifting orange mist (3D) */}
      <div aria-hidden className="glow-orb absolute left-1/2 top-1/2 h-[80vw] w-[80vw] -translate-x-1/2 -translate-y-1/2" />
      {gl?.webgl && (
        <div aria-hidden className="absolute inset-0 opacity-70">
          <ParticleField animate={gl.animate} />
        </div>
      )}

      {/* Enormous drifting watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          data-drift="6"
          className="text-outline select-none whitespace-nowrap font-serif text-[26vw] leading-none opacity-70"
        >
          RINOVA
        </span>
      </div>

      <div className="relative mx-auto flex min-h-[80vh] max-w-wrap flex-col items-center justify-center px-6 py-40 text-center md:py-52">
        <p data-fade className="mb-8 text-[11px] font-medium uppercase tracking-[0.25em] text-fog">
          Ready when you are
        </p>

        <h2
          data-chars-group
          className="font-serif text-[clamp(3rem,7vw,6.5rem)] leading-[1] tracking-[-0.03em] text-cream"
        >
          <span className="split-line" aria-label="Your ride is">
            <SplitChars text="Your ride is" />
          </span>
          <span className="split-line" aria-label="waiting.">
            <SplitChars text="waiting." className="italic text-accent" />
          </span>
        </h2>

        <div data-fade className="mt-12 flex flex-wrap justify-center gap-4">
          <MagneticButton href="/register">Book a Vehicle</MagneticButton>
          <MagneticButton href="/register" variant="outline">
            Schedule a Wash
          </MagneticButton>
        </div>

        <p data-fade className="mt-12 inline-flex items-center gap-2 text-sm text-fog">
          <MapPin className="h-4 w-4" strokeWidth={1.5} />
          Kathmandu Valley · Open daily 6 AM – 9 PM
        </p>
      </div>
    </section>
  );
}
