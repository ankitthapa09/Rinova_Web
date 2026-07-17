"use client";

import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import PreloadAsync from "./PreloadAsync";
import PauseWhenHidden from "./PauseWhenHidden";
import VehicleModel from "./VehicleModel";

const CAR_URL = "/models/jeep_rubicon.glb";
// "Convertible" by Poly by Google — CC-BY 3.0 (see public/models/LICENSE.txt)
useGLTF.preload(CAR_URL);

const GROUND_Y = -1.5;

function CarRig({ animate }: { animate: boolean }) {
  const rig = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const group = rig.current;
    if (!group) return;
    if (!animate) {
      group.rotation.y = 0.6;
      return;
    }
    const t = state.clock.elapsedTime;
    const scroll = Math.min(1.2, window.scrollY / window.innerHeight);

    // Turntable + scroll-driven orbit + gentle cursor look-at
    const targetY = t * 0.2 + scroll * Math.PI * 1.1 + state.pointer.x * 0.25;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, 3, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, state.pointer.y * -0.05, 3, delta);
  });

  return (
    <group position={[0, GROUND_Y, 0]}>
      <group ref={rig}>
        <VehicleModel url={CAR_URL} length={4.0} />
      </group>
      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={14} blur={2.4} far={3} color="#000000" />
    </group>
  );
}

/**
 * Hero centerpiece: the convertible on a dark stage, centered low so the
 * headline sits above it. Scroll orbits the car; the cursor tilts it.
 */
export default function HeroScene({ animate = true }: { animate?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.75, 8.6], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      className="!pointer-events-none"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.15} />
        <spotLight position={[6, 8, 5]} intensity={90} angle={0.45} penumbra={1} color="#fff6ec" />
        <spotLight position={[-7, 3, -6]} intensity={170} angle={0.5} penumbra={1} color="#FF5C1A" />

        <CarRig animate={animate} />

        {/* Procedural studio reflections — no external HDR fetch. 128 is plenty
            for soft studio bounce; 256 doubled the load-time hitch for
            reflections nobody can resolve on a car this size. */}
        <Environment resolution={128}>
          <Lightformer intensity={5} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} color="#fff8f0" />
          <Lightformer intensity={3} position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[7, 1.6, 1]} color="#FF5C1A" />
          <Lightformer intensity={1.6} position={[6, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[6, 1.2, 1]} color="#ffffff" />
          <Lightformer intensity={1.2} position={[0, 1, 6]} scale={[8, 1, 1]} color="#ffd9c2" />
        </Environment>

        <PreloadAsync />
        <PauseWhenHidden />
      </Suspense>
    </Canvas>
  );
}
