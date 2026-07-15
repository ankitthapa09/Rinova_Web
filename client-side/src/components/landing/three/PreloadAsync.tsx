"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

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
