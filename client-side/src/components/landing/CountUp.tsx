"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, EASE, MOTION_OK } from "./gsap";

interface CountUpProps {
  end: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

/** Number that counts up from 0 the first time it scrolls into view. */
export default function CountUp({ end, decimals = 0, suffix = "", className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const format = (v: number) =>
      v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + suffix;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const counter = { value: 0 };
      gsap.to(counter, {
        value: end,
        duration: 1.8,
        ease: EASE,
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = format(counter.value);
        },
      });
    });
    return () => mm.revert();
  }, [end, decimals, suffix]);

  return (
    <span ref={ref} className={className}>
      {`0${suffix}`}
    </span>
  );
}
