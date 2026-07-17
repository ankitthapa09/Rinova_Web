"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

interface VehicleModelProps {
  url: string;
  /** Longest dimension after normalization, in world units */
  length: number;
  yaw?: number;
}

export default function VehicleModel({ url, length, yaw = 0 }: VehicleModelProps) {
  const { scene } = useGLTF(url);

  const { object, scale, offset } = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = length / Math.max(size.x, size.y, size.z);
    return {
      object: cloned,
      scale: s,
      offset: new THREE.Vector3(-center.x, -box.min.y, -center.z),
    };
  }, [scene, length]);

  return (
    <group rotation-y={yaw} scale={scale}>
      <primitive object={object} position={offset.toArray()} />
    </group>
  );
}
