"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";


// Stops a canvas's render loop while it is scrolled out of view.

export default function PauseWhenHidden() {
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);

  useEffect(() => {
    const el = gl.domElement;
    const io = new IntersectionObserver(
      ([entry]) => setFrameloop(entry?.isIntersecting ? "always" : "never"),
      // Wake up half a viewport early so the first visible frame is current.
      { rootMargin: "50% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setFrameloop("always");
    };
  }, [gl, setFrameloop]);

  return null;
}
