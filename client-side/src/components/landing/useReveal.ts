"use client";

import { useLayoutEffect, type RefObject } from "react";
import { gsap, EASE, MOTION_OK } from "./gsap";

/**
 * Wires every declarative animation attribute inside a section:
 *
 * - [data-mask-group]  → child .mask-line-inner spans slide up line by line
 * - [data-curtain]     → clip-path curtain reveal; [data-curtain-img] inside
 *                        also zooms out from 1.15 → 1
 * - [data-wipe]        → left-to-right mask wipe (section numbers)
 * - [data-fade]        → fade + rise once in view (data-delay="0.2" optional)
 * - [data-stagger]     → children fade + rise with an 0.1s stagger
 * - [data-parallax]    → vertical drift, value = yPercent amplitude
 * - [data-drift]       → horizontal drift, value = xPercent amplitude
 *
 * Everything runs once (except parallax/drift, which scrub) and only when
 * prefers-reduced-motion allows it — the CSS initial states are gated behind
 * the same media query, so reduced-motion users see static content.
 */
export function useReveal(ref: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      // Line-by-line headline reveals (slide up out of the mask, unblur)
      root.querySelectorAll<HTMLElement>("[data-mask-group]").forEach((group) => {
        if (group.dataset.maskLoad !== undefined) return; // load-triggered elsewhere
        gsap.to(group.querySelectorAll(".mask-line-inner"), {
          y: 0,
          filter: "blur(0px)",
          duration: 1.2,
          ease: EASE,
          stagger: 0.12,
          scrollTrigger: { trigger: group, start: "top 82%", once: true },
        });
      });

      // Character cascades (scroll-triggered; the hero runs its own on load)
      root.querySelectorAll<HTMLElement>("[data-chars-group]").forEach((group) => {
        gsap.to(group.querySelectorAll(".split-char"), {
          y: 0,
          rotate: 0,
          duration: 1.1,
          ease: EASE,
          stagger: 0.02,
          scrollTrigger: { trigger: group, start: "top 82%", once: true },
        });
      });

      // Curtain + zoom-out image reveals
      root.querySelectorAll<HTMLElement>("[data-curtain]").forEach((el) => {
        const img = el.querySelector<HTMLElement>("[data-curtain-img]");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        });
        tl.to(el, { clipPath: "inset(0% 0 0 0)", duration: 1.2, ease: EASE }, 0);
        if (img) tl.fromTo(img, { scale: 1.15 }, { scale: 1, duration: 1.4, ease: EASE }, 0);
      });

      // Left → right wipes (oversized section numbers)
      root.querySelectorAll<HTMLElement>("[data-wipe]").forEach((el) => {
        gsap.to(el, {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.1,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // Single fades
      root.querySelectorAll<HTMLElement>("[data-fade]").forEach((el) => {
        gsap.to(el, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: EASE,
          delay: parseFloat(el.dataset.delay ?? "0"),
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // Staggered groups
      root.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
        gsap.to(group.children, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: EASE,
          stagger: 0.1,
          scrollTrigger: { trigger: group, start: "top 85%", once: true },
        });
      });

      // Vertical parallax (scrubbed)
      root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        const amp = parseFloat(el.dataset.parallax ?? "10");
        gsap.fromTo(
          el,
          { yPercent: amp },
          {
            yPercent: -amp,
            ease: "none",
            scrollTrigger: {
              trigger: el.parentElement ?? el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });

      // Horizontal watermark drift (scrubbed)
      root.querySelectorAll<HTMLElement>("[data-drift]").forEach((el) => {
        const amp = parseFloat(el.dataset.drift ?? "8");
        gsap.fromTo(
          el,
          { xPercent: -amp },
          {
            xPercent: amp,
            ease: "none",
            scrollTrigger: {
              trigger: el.parentElement ?? el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    });

    return () => mm.revert();
  }, [ref]);
}
