"use client";

import { Suspense, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import VehicleModel from "./VehicleModel";
import { VEHICLES } from "./vehicles";

VEHICLES.forEach((v) => useGLTF.preload(v.file));

const SPACING = 8; // world units between neighbouring vehicles

interface RigProps {
  progressRef: MutableRefObject<number>;
  animate: boolean;
}

/**
 * All five vehicles live in one scene, spread along X. A damped progress
 * value slides them through the stage: the active vehicle sits centered
 * at full size while neighbours wait in the wings, smaller and turned away.
 */
function CarouselRig({ progressRef, animate }: RigProps) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const smooth = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    smooth.current = animate
      ? THREE.MathUtils.damp(smooth.current, progressRef.current, 4.5, delta)
      : progressRef.current;

    VEHICLES.forEach((_, i) => {
      const group = groups.current[i];
      if (!group) return;
      const dx = i - smooth.current;
      const abs = Math.abs(dx);

      group.visible = abs < 1.8;
      if (!group.visible) return;

      group.position.x = dx * SPACING;
      const scale = Math.max(0.001, 1 - abs * 0.45);
      group.scale.setScalar(scale);
      // Active vehicle turntables; neighbours angle away as they slide out
      group.rotation.y = (animate ? t * 0.3 : 0.6) + dx * 0.9;
    });
  });

  return (
    <group position={[0, -1.05, 0]}>
      {VEHICLES.map((v, i) => (
        <group
          key={v.id}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <VehicleModel url={v.file} length={v.length} yaw={v.yaw} />
        </group>
      ))}
      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={16} blur={2.6} far={3.4} color="#000000" />
    </group>
  );
}

interface FleetSceneProps {
  progressRef: MutableRefObject<number>;
  animate?: boolean;
}

export default function FleetScene({ progressRef, animate = true }: FleetSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.2, 9.5], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      className="!pointer-events-none"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.16} />
        <spotLight position={[6, 8, 5]} intensity={100} angle={0.5} penumbra={1} color="#fff6ec" />
        <spotLight position={[-7, 3, -6]} intensity={170} angle={0.55} penumbra={1} color="#FF5C1A" />

        <CarouselRig progressRef={progressRef} animate={animate} />

        <Environment resolution={256}>
          <Lightformer intensity={5} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 7, 1]} color="#fff8f0" />
          <Lightformer intensity={3} position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[8, 1.6, 1]} color="#FF5C1A" />
          <Lightformer intensity={1.6} position={[6, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[7, 1.2, 1]} color="#ffffff" />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
