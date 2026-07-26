"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK } from "./gsap";

interface MagneticButtonProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "solid-light" | "outline-light";
  className?: string;
}

const styles: Record<NonNullable<MagneticButtonProps["variant"]>, string> = {
  solid: "bg-accent text-night hover:bg-[#FF7A45] shadow-glow",
  outline: "border border-cream/25 text-cream hover:border-accent hover:text-accent",
  "solid-light": "bg-cream text-night hover:bg-white",
  "outline-light": "border border-night/30 text-night hover:border-night",
};

/**
 * Pill button that subtly follows the cursor (max ~8px) and swaps its
 * label upward on hover, the duplicate label slides in from below.
 */
export default function MagneticButton({
  href,
  children,
  variant = "solid",
  className = "",
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);

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
    <Link
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`magnetic inline-flex items-center justify-center rounded-full px-8 py-4 text-sm font-medium tracking-wide transition-colors duration-300 ${styles[variant]} ${className}`}
    >
      <span className="btn-label">
        <span className="btn-label-stack">
          <span>{children}</span>
          <span aria-hidden>{children}</span>
        </span>
      </span>
    </Link>
  );
}
