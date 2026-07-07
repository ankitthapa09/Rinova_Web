"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  if (!CustomEase.get("premium")) {
    // The page-wide signature easing: cubic-bezier(0.22, 1, 0.36, 1)
    CustomEase.create("premium", "0.22,1,0.36,1");
  }
}

export const EASE = "premium";
export const EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger };
