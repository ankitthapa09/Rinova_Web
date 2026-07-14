"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { Check } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "./gsap";
import { useReveal } from "./useReveal";



const BEATS = [
  {
    n: "01",
    eyebrow: "The foam bath",
    line: (
      <>
        Foam that lifts dirt — <em className="italic text-[#BFE3FF]">never grinds it.</em>
      </>
    ),
    features: ["pH-neutral snow foam", "Zero swirl marks", "Eco products only"],
    img: { src: "/car_wash_detail.png", alt: "Hands foam-washing a blue car bonnet" },
  },
  {
    n: "02",
    eyebrow: "The power rinse",
    line: (
      <>
        Monsoon mud doesn&apos;t stand <em className="italic text-[#BFE3FF]">a chance.</em>
      </>
    ),
    features: ["Underbody rinse", "Panel-by-panel pressure wash", "20-minute express bay"],
    img: { src: "/carwash3.jpg", alt: "A mud-caked jeep being pressure washed" },
  },
  {
    n: "03",
    eyebrow: "Every vehicle",
    line: (
      <>
        Bikes get the <em className="italic text-[#BFE3FF]">same obsession.</em>
      </>
    ),
    features: ["Bike & scooter bays", "Chain degrease & chrome shine", "Hand-dried tanks"],
    img: { src: "/bikewash.jpg", alt: "A motorbike in the wash bay under a jet of water" },
  },
  {
    n: "04",
    eyebrow: "The detail finish",
    line: (
      <>
        Down to the <em className="italic text-[#BFE3FF]">last spoke.</em>
      </>
    ),
    features: ["Tyre & rim dressing", "Glass & mirror detail", "Leather & dash treatment"],
    img: { src: "/carwash2.jpg", alt: "A foam-covered alloy wheel being brushed" },
  },
];

const SERVICES = [
  "SNOW FOAM", "HAND POLISH", "CERAMIC SEAL", "UNDERBODY RINSE",
  "INTERIOR SHAMPOO", "ENGINE BAY DETAIL", "TYRE & RIM SHINE", "GLASS TREATMENT",
];

// Seamless wave: covers the 1600 viewBox at both extremes of the -1200 drift.
function wavePath(amp: number, lift: number): string {
  let d = `M0 ${40 + lift}`;
  for (let x = 0; x < 3000; x += 300) {
    d += ` q75 ${-amp} 150 0 t150 0`;
  }
  return `${d} L3000 700 L0 700 Z`;
}

// Deterministic droplets (no Math.random → no hydration mismatch).
const DROPS = Array.from({ length: 9 }, (_, i) => ({
  left: 12 + ((i * 173) % 76),
  delay: (i % 5) * 0.7,
  dur: 1.6 + (i % 4) * 0.5,
}));

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  const items = [...SERVICES, ...SERVICES];
  return (
    <div className={`marquee-strip flex w-max items-center gap-10 ${reverse ? "marquee-rev" : ""}`}>
      {items.map((s, i) => (
        <span key={i} className="flex items-center gap-10 whitespace-nowrap">
          <span className="text-[12px] font-medium uppercase tracking-[0.3em] text-night/40">{s}</span>
          <span aria-hidden className="text-night/30">✦</span>
        </span>
      ))}
    </div>
  );
}

export default function DarkInterlude() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  useReveal(sectionRef);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const mm = gsap.matchMedia();
    mm.add(`(min-width: 768px) and ${MOTION_OK}`, () => {
      const q = gsap.utils.selector(stage);
      const tweens: gsap.core.Tween[] = [];
      const acts = BEATS.length;

      // ── Ambient loops ──
      q<SVGGElement>(".xp-wave").forEach((el, i) => {
        tweens.push(gsap.to(el, { x: -1200, duration: i === 0 ? 8 : 12, ease: "none", repeat: -1 }));
      });
      q<HTMLElement>(".xp-drop").forEach((el, i) => {
        const d = DROPS[i % DROPS.length];
        tweens.push(
          gsap.fromTo(
            el,
            { y: -30, opacity: 0 },
            { y: 260, opacity: 0.8, duration: d.dur, delay: d.delay, ease: "power1.in", repeat: -1, repeatDelay: 0.6 },
          ),
        );
      });

      const strips = q<HTMLElement>(".marquee-strip");
      const loops = strips.map((el) =>
        gsap.to(el, {
          xPercent: el.classList.contains("marquee-rev") ? 0 : -50,
          duration: 28,
          ease: "none",
          repeat: -1,
          ...(el.classList.contains("marquee-rev") ? { startAt: { xPercent: -50 } } : {}),
        }),
      );
      tweens.push(...loops);
      const skews = strips.map((el) => gsap.quickTo(el, "skewX", { duration: 0.4, ease: "power2.out" }));

      // ── Master scrub ──
      const beats = q<HTMLElement>(".exp-beat");
      const bgShots = q<HTMLElement>(".bg-shot");

      // Opening state: beat 1 live, its backdrop open.
      gsap.set(beats[0], { opacity: 1, y: 0, filter: "blur(0px)" });
      bgShots.forEach((el, i) => gsap.set(el, { clipPath: i === 0 ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }));

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${acts * 90}%`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const v = gsap.utils.clamp(-9, 9, self.getVelocity() / 220);
            skews.forEach((to, i) => to(i === 0 ? v : -v));
            loops.forEach((l) => l.timeScale(gsap.utils.clamp(0.6, 3.5, 1 + Math.abs(v) / 3)));
          },
        },
      });

      // The tide rises across the whole ride.
      tl.to(q(".xp-level"), { attr: { transform: "translate(0 -20)" }, duration: acts }, 0);

      // Feature items of beat 1 tick in right away.
      tl.fromTo(
        beats[0].querySelectorAll(".feat-item"),
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.22, stagger: 0.12, ease: EASE },
        0.1,
      );

      // Slow drift inside each faded backdrop while it's on stage.
      bgShots.forEach((shot, i) => {
        tl.fromTo(
          shot.querySelector("img"),
          { scale: 1.12 },
          { scale: 1.02, duration: 1.3 },
          Math.max(0, i - 0.3),
        );
      });

      // The dock breathes while it waits (not scrubbed — an ambient float).
      tweens.push(
        gsap.to(q(".beat-dock"), { y: -7, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 }),
      );

      for (let i = 1; i < acts; i++) {
        const at = i - 0.25;
        // glass card swap: lift out, settle in with a slight scale
        tl.to(beats[i - 1], { opacity: 0, y: -30, scale: 0.96, filter: "blur(6px)", duration: 0.35, ease: EASE }, at)
          .fromTo(
            beats[i],
            { opacity: 0, y: 34, scale: 0.94, filter: "blur(6px)" },
            { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.38, ease: EASE },
            at + 0.1,
          )
          // features tick in one by one
          .fromTo(
            beats[i].querySelectorAll(".feat-item"),
            { y: 14, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.22, stagger: 0.12, ease: EASE },
            at + 0.3,
          )
          // the next faded backdrop wipes up — hard edge, no overlap
          .to(bgShots[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "power1.inOut" }, at);
      }

      // Full tide: the letters gleam.
      tl.to(q(".xp-bloom"), { opacity: 0.55, duration: 0.4 }, acts - 0.5);

      return () => {
        tweens.forEach((t) => t.kill());
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="washing"
      className="relative overflow-hidden bg-gradient-to-br from-[#FF5C1A] via-[#F04E0A] to-[#D63A00] text-night"
    >
      {/* ═══════════ Desktop: faded backdrop + tide + lower-third ═══════════ */}
      <div ref={stageRef} className="relative hidden h-[100svh] min-h-[700px] flex-col justify-between md:flex">
        {/* Faded photo backdrops (wipe between beats) */}
        <div aria-hidden className="absolute inset-0 z-0">
          {BEATS.map((b, i) => (
            <div key={i} className="bg-shot absolute inset-0 will-change-[clip-path]">
              {/* eager: a fully-clipped element never intersects, so lazy
                  loading would leave the later backdrops unloaded forever */}
              {/* opaque shots: the hard wipe fully replaces the previous one -
                  fading happens in the single scrim above, so layers never
                  compound into ghosts */}
              <Image
                src={b.img.src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                loading="eager"
              />
            </div>
          ))}
          {/* one molten scrim over the whole stack keeps every shot equally faded */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,92,26,0.72) 0%, rgba(240,78,10,0.70) 50%, rgba(214,58,0,0.75) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(214,58,0,0.32) 100%)" }}
          />
        </div>

        {/* Top marquee */}
        <div className="relative z-10 overflow-hidden border-b border-night/15 py-4">
          <MarqueeRow />
        </div>

        {/* Center: WASH filling with blue water */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center pb-[20vh]">
          <div
            className="xp-bloom absolute left-1/2 top-[42%] h-[60%] w-[70%] -translate-x-1/2 -translate-y-1/2 opacity-0"
            style={{ background: "radial-gradient(ellipse, rgba(191,227,255,0.4) 0%, transparent 65%)", filter: "blur(40px)" }}
          />
          <svg viewBox="0 0 1600 460" className="w-[82vw] max-w-none" role="presentation">
            <defs>
              <clipPath id="wash-xp-clip">
                <text x="800" y="386" textAnchor="middle" className="font-serif" fontSize="430" letterSpacing="6">
                  WASH
                </text>
              </clipPath>
              <linearGradient id="wash-xp-water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BFE3FF" />
                <stop offset="22%" stopColor="#5FA8F0" />
                <stop offset="100%" stopColor="#1B5FBF" />
              </linearGradient>
            </defs>
            <text x="800" y="386" textAnchor="middle" className="font-serif" fontSize="430" letterSpacing="6" fill="rgba(11,11,13,0.14)">
              WASH
            </text>
            <g clipPath="url(#wash-xp-clip)">
              <g className="xp-level" transform="translate(0 470)">
                <g className="xp-wave">
                  <path d={wavePath(36, -10)} fill="#2E6FD0" opacity="0.5" />
                </g>
                <g className="xp-wave">
                  <path d={wavePath(26, 0)} fill="url(#wash-xp-water)" />
                </g>
              </g>
            </g>
            <text
              x="800"
              y="386"
              textAnchor="middle"
              className="font-serif"
              fontSize="430"
              letterSpacing="6"
              fill="none"
              stroke="rgba(11,11,13,0.4)"
              strokeWidth="1.5"
            >
              WASH
            </text>
          </svg>

          {/* droplets falling into the tide */}
          <div className="absolute inset-x-0 top-[8%] h-[36%]">
            {DROPS.map((d, i) => (
              <span
                key={i}
                className="xp-drop absolute top-0 h-3 w-[3px] rounded-full bg-gradient-to-b from-transparent to-[#BFE3FF] opacity-0"
                style={{ left: `${d.left}%` }}
              />
            ))}
          </div>
        </div>

        {/* Lower-third: the beat info in a floating glass card */}
        <div className="beat-dock relative z-10 mx-auto mb-6 mt-auto w-full max-w-wrap px-6 lg:px-12">
          <div className="relative flex h-52 items-end justify-center">
            {BEATS.map((b, i) => (
              <div key={i} className="exp-beat absolute bottom-0 opacity-0">
                <div className="rounded-2xl border border-cream/15 bg-night/45 px-8 py-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md md:px-12">
                  <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#BFE3FF]/100">
                    {b.eyebrow}
                  </p>
                  <h2
                    className="mx-auto mt-3 max-w-3xl font-serif text-[clamp(1.9rem,3.2vw,3rem)] leading-[1.08] tracking-[-0.02em] text-cream"
                    style={{ textShadow: "0 2px 20px rgba(0,0,0,0.45)" }}
                  >
                    {b.line}
                  </h2>
                  <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                    {b.features.map((f) => (
                      <li key={f} className="feat-item flex items-center gap-2.5 text-[14.5px] text-cream/85">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#BFE3FF]/25">
                          <Check className="h-3 w-3 text-[#da8618]" strokeWidth={3} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom marquee */}
        <div className="relative z-10 overflow-hidden border-t border-night/15 py-4">
          <MarqueeRow reverse />
        </div>
      </div>

      {/* ═══════════ Mobile / reduced-motion fallback ═══════════ */}
      <div className="relative overflow-hidden md:hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
          <svg viewBox="0 0 1600 460" className="w-[170vw] max-w-none opacity-60" role="presentation">
            <defs>
              <clipPath id="wash-xp-clip-m">
                <text x="800" y="386" textAnchor="middle" className="font-serif" fontSize="430" letterSpacing="6">
                  WASH
                </text>
              </clipPath>
              <linearGradient id="wash-xp-water-m" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BFE3FF" />
                <stop offset="100%" stopColor="#1B5FBF" />
              </linearGradient>
            </defs>
            <g clipPath="url(#wash-xp-clip-m)">
              <rect x="0" y="230" width="1600" height="230" fill="url(#wash-xp-water-m)" />
            </g>
            <text x="800" y="386" textAnchor="middle" className="font-serif" fontSize="430" letterSpacing="6" fill="none" stroke="rgba(11,11,13,0.35)" strokeWidth="1.5">
              WASH
            </text>
          </svg>
        </div>

        <div className="relative mx-auto w-full max-w-wrap px-6 pb-20 pt-40">
          <p data-fade className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.25em] text-night/60">
            The wash experience
          </p>
          <h2 data-fade className="mx-auto max-w-4xl text-center font-serif text-[clamp(2.2rem,8vw,3.2rem)] leading-[1.08] tracking-[-0.02em]">
            Every vehicle treated like <em className="italic text-[#EAF6FF]">it&apos;s ours.</em>
          </h2>

          <div data-stagger className="mt-12 flex flex-col gap-4">
            {BEATS.map((b) => (
              <article key={b.n} className="relative overflow-hidden rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.3)]">
                <div className="relative aspect-[16/10]">
                  <Image src={b.img.src} alt={b.img.alt} fill sizes="92vw" className="object-cover" />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(11,11,13,0.88) 0%, rgba(11,11,13,0.2) 60%)" }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#BFE3FF]/85">
                      {b.eyebrow}
                    </p>
                    <h3 className="mt-1.5 font-serif text-xl leading-snug text-cream">{b.line}</h3>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                      {b.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[12px] text-cream/80">
                          <Check className="h-3 w-3 text-[#BFE3FF]" strokeWidth={3} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
