"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import VehicleModel from "@/components/landing/three/VehicleModel";

const GROUND_Y = -1.35;

interface RigProps {
  url: string;
  length: number;
  animate: boolean;
}

function VehicleRig({ url, length, animate }: RigProps) {
  const rig = useRef<THREE.Group>(null);
  // Canvas is pointer-events-none, so track the cursor on the window instead
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    const group = rig.current;
    if (!group) return;
    if (!animate) {
      group.rotation.y = 0.6;
      return;
    }
    const t = state.clock.elapsedTime;

    // Slow turntable + gentle cursor look-at
    const targetY = t * 0.22 + pointer.current.x * 0.4;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, 3, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, pointer.current.y * -0.05, 3, delta);
  });

  return (
    <group position={[0, GROUND_Y, 0]}>
      <group ref={rig}>
        <VehicleModel url={url} length={length} />
      </group>
      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={12} blur={2.4} far={3} color="#000000" />
    </group>
  );
}

/**
 * Auth-page centerpiece: a single vehicle turntabling on the dark stage,
 * tilting toward the cursor — the hero stage distilled to one panel.
 */
export default function AuthScene({
  url,
  length,
  animate = true,
}: {
  url: string;
  length: number;
  animate?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.8, 8.2], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      className="!pointer-events-none"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.15} />
        <spotLight position={[6, 8, 5]} intensity={90} angle={0.45} penumbra={1} color="#fff6ec" />
        <spotLight position={[-7, 3, -6]} intensity={170} angle={0.5} penumbra={1} color="#FF5C1A" />

        <VehicleRig url={url} length={length} animate={animate} />

        {/* Procedural studio reflections — no external HDR fetch */}
        <Environment resolution={256}>
          <Lightformer intensity={5} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} color="#fff8f0" />
          <Lightformer intensity={3} position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[7, 1.6, 1]} color="#FF5C1A" />
          <Lightformer intensity={1.6} position={[6, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[6, 1.2, 1]} color="#ffffff" />
          <Lightformer intensity={1.2} position={[0, 1, 6]} scale={[8, 1, 1]} color="#ffd9c2" />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
