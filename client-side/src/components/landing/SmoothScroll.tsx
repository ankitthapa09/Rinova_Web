"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, MOTION_OK } from "./gsap";

// the navbar reaches the lenis instance through this global
type LenisWindow = Window & { __lenis?: Lenis };

// lenis smooth scroll synced with ScrollTrigger, plus the accent progress bar up top
export default function SmoothScroll() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) return;

    const lenis = new Lenis({ lerp: 0.08 });
    lenis.on("scroll", ScrollTrigger.update);
    // expose the instance so the navbar can scroll through lenis
    (window as LenisWindow).__lenis = lenis;

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // in-content #hash links scroll through lenis. the navbar's /#section links
    // are handled in the navbar, so they don't match here (avoids a double scroll)
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const target = document.querySelector(anchor.hash || "#");
      if (!target) return;
      e.preventDefault();
      window.history.replaceState(null, "", anchor.hash);
      lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.4 });
    };
    document.addEventListener("click", onClick);

    // arrived with a hash from another page, scroll to it once gsap has laid out
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        window.setTimeout(() => {
          ScrollTrigger.refresh();
          lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.2 });
        }, 500);
      }
    }

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
      delete (window as LenisWindow).__lenis;
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
