"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Warms the GPU without freezing the page.
 *
 * three.js links a material's shader the first time the object is drawn — so
 * vehicles that slide in mid-scroll each stall the main thread for 100–400ms.
 * drei's <Preload all /> fixes that by compiling everything at mount, but it
 * calls the *synchronous* gl.compile(), which just moves the freeze onto the
 * hero while the page is loading.
 *
 * compileAsync() does the same work off the critical path (via
 * KHR_parallel_shader_compile where the GPU supports it), so nothing blocks.
 */
export default function PreloadAsync() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let cancelled = false;
    // Wait for the scene graph to be populated (models resolve via Suspense),
    // then compile in the background.
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      const renderer = gl as typeof gl & {
        compileAsync?: (scene: object, camera: object) => Promise<unknown>;
      };
      if (renderer.compileAsync) {
        renderer.compileAsync(scene, camera).catch(() => {});
      } else {
        gl.compile(scene, camera);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [gl, scene, camera]);

  return null;
}
