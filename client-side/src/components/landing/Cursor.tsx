"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_OK } from "./gsap";

/** Small accent dot that trails the cursor and grows over interactive elements. */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const motionOk = window.matchMedia(MOTION_OK).matches;
    const dot = dotRef.current;
    if (!fine || !motionOk || !dot) return;

    const xTo = gsap.quickTo(dot, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.35, ease: "power3.out" });

    const onMove = (e: MouseEvent) => {
      dot.style.opacity = "1";
      xTo(e.clientX);
      yTo(e.clientY);
    };
    const onOver = (e: MouseEvent) => {
      const interactive = (e.target as HTMLElement).closest("a, button, [role='button']");
      gsap.to(dot, { scale: interactive ? 3 : 1, duration: 0.3, ease: "power3.out" });
    };
    const onLeave = () => {
      dot.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[95] -ml-[4px] -mt-[4px] h-2 w-2 rounded-full bg-accent opacity-0 shadow-[0_0_14px_rgba(255,92,26,0.9)]"
    />
  );
}
