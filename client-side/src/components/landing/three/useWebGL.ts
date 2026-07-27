"use client";

import { useEffect, useState } from "react";

/**
 * null while detecting (SSR-safe), then whether WebGL is available and
 * whether motion is allowed, sections use this to mount 3D scenes or
 * fall back to static imagery.
 */
export function useWebGL() {
  const [state, setState] = useState<{ webgl: boolean; animate: boolean } | null>(null);

  useEffect(() => {
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      webgl = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
    const animate = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    setState({ webgl, animate });
  }, []);

  return state;
}
