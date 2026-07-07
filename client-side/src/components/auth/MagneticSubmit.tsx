"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK } from "@/components/landing/gsap";

export type SubmitStatus = "idle" | "loading" | "success";

interface MagneticSubmitProps {
  children: ReactNode;
  status?: SubmitStatus;
  successLabel?: string;
}

/**
 * The MagneticButton pattern as a real <button type="submit">: follows the
 * cursor, swaps its label upward on hover, and morphs into a spinner then
 * a success check while the form resolves.
 */
export default function MagneticSubmit({
  children,
  status = "idle",
  successLabel = "Done",
}: MagneticSubmitProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || !window.matchMedia(MOTION_OK).matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, {
      x: gsap.utils.clamp(-8, 8, x * 0.2),
      y: gsap.utils.clamp(-8, 8, y * 0.2),
      duration: 0.4,
      ease: "power3.out",
    });
  };

  const onLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" });
  };

  return (
    <button
      ref={ref}
      type="submit"
      disabled={status !== "idle"}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="magnetic inline-flex w-full items-center justify-center gap-3 rounded-full bg-accent px-8 py-4 text-sm font-medium tracking-wide text-night shadow-glow transition-colors duration-300 hover:bg-[#FF7A45] disabled:cursor-default disabled:hover:bg-accent"
    >
      {status === "loading" ? (
        <>
          <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-night/25 border-t-night" />
          <span>One moment…</span>
        </>
      ) : status === "success" ? (
        <>
          <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-night stroke-2">
            <path d="M2.5 8.5l3.5 3.5 7-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{successLabel}</span>
        </>
      ) : (
        <span className="btn-label">
          <span className="btn-label-stack">
            <span>{children}</span>
            <span aria-hidden>{children}</span>
          </span>
        </span>
      )}
    </button>
  );
}
