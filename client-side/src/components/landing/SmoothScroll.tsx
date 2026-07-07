"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, MOTION_OK } from "./gsap";

/**
 * Lenis smooth scrolling synced with ScrollTrigger, plus the 2px
 * accent scroll-progress line fixed to the top of the viewport.
 */
export default function SmoothScroll() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) return;

    const lenis = new Lenis({ lerp: 0.08 });
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Route same-page anchor clicks through Lenis
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const target = document.querySelector(anchor.hash || "#");
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72, duration: 1.4 });
    };
    document.addEventListener("click", onClick);

    // Scroll progress bar
    let progressTween: gsap.core.Tween | undefined;
    if (barRef.current) {
      progressTween = gsap.to(barRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      });
    }

    return () => {
      document.removeEventListener("click", onClick);
      progressTween?.scrollTrigger?.kill();
      progressTween?.kill();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="fixed left-0 top-0 z-[90] h-[2px] w-full origin-left scale-x-0 bg-accent"
    />
  );
}
