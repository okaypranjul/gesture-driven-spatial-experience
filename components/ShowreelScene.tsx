
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Image, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { ShowreelItem, HandData } from '../types';

const Group = 'group' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const Color = 'color' as any;
const Fog = 'fog' as any;

interface ShowreelSceneProps {
  handDataRef: React.MutableRefObject<HandData>;
  items: ShowreelItem[];
}

const ImageSphere: React.FC<{ 
  handDataRef: React.MutableRefObject<HandData>, 
  items: ShowreelItem[] 
}> = ({ handDataRef, items }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const sphereItems = useMemo(() => {
    const count = items.length;
    return items.map((item, i) => {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      
      // Compact radius: 6.2 for a tighter look
      const radius = 6.2;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      return {
        ...item,
        position: [x, y, z] as [number, number, number],
      };
    });
  }, [items]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const hand = handDataRef.current;

    const lerpFactor = 0.15; // Even smoother response

    if (hand.present) {
      // Zoom Logic: distance is usually 0.05 to 0.4
      // Normalize distance: 0 (closed pinch) to 1 (wide open pinch)
      const normalizedDist = Math.min(Math.max((hand.distance - 0.05) / 0.35, 0), 1);
      
      // Extreme close-up: targetScale up to 24.0
      const targetScale = 0.9 + (normalizedDist * 23.1);
      const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, lerpFactor);
      groupRef.current.scale.set(s, s, s);

      // Rotation Logic: direct mapping
      const targetRotX = (hand.position.y - 0.5) * 5.5;
      const targetRotY = (hand.position.x - 0.5) * 5.5;
      
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, lerpFactor);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, lerpFactor);
    } else {
      // Idle movement: gentle drift
      groupRef.current.rotation.y += delta * 0.12;
      const s = THREE.MathUtils.lerp(groupRef.current.scale.x, 1.1, 0.05);
      groupRef.current.scale.set(s, s, s);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.04);
    }
  });

  return (
    <Group ref={groupRef}>
      {sphereItems.map((item) => (
        <Group key={item.id} position={item.position}>
          <ImageItem item={item} />
        </Group>
      ))}
    </Group>
  );
};

const ImageItem: React.FC<{ item: ShowreelItem }> = ({ item }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <Group>
      <Image
        ref={meshRef as any}
        url={item.url}
        transparent
        opacity={1.0}
        scale={[1, 1.35, 1]}
        toneMapped={false}
      />
    </Group>
  );
};

export const ShowreelScene: React.FC<ShowreelSceneProps> = ({ handDataRef, items }) => {
  return (
    <div className="absolute inset-0 z-0 bg-white">
      <Canvas
        camera={{ position: [0, 0, 16], fov: 32 }}
        gl={{ 
          antialias: true, 
          alpha: true, 
          powerPreference: "high-performance" 
        }}
        dpr={window.devicePixelRatio > 1.5 ? 2 : 1.5}
      >
        <Color attach="background" args={['#ffffff']} />
        <Fog attach="fog" args={['#ffffff', 20, 30]} />
        <AmbientLight intensity={1.5} />
        <PointLight position={[10, 20, 20]} intensity={2.5} color="#ffffff" />
        <ImageSphere handDataRef={handDataRef} items={items} />
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
};
