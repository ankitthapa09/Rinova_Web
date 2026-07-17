"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import PreloadAsync from "./PreloadAsync";
import PauseWhenHidden from "./PauseWhenHidden";

function Mist({ animate }: { animate: boolean }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 450;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 9;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!points.current || !animate) return;
    const t = state.clock.elapsedTime;
    points.current.rotation.y = t * 0.03;
    points.current.position.y = Math.sin(t * 0.25) * 0.35;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#FF7A45"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Drifting orange mist — ambient 3D depth behind the final CTA. */
export default function ParticleField({ animate = true }: { animate?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8], fov: 40 }}
      gl={{ antialias: false, alpha: true }}
      className="!pointer-events-none"
    >
      <Mist animate={animate} />
      <PreloadAsync />
      <PauseWhenHidden />
    </Canvas>
  );
}
