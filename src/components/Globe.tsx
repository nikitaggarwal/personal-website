"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Project } from "@/data/projects";

/* ---------- Placeholder gradient texture (same approach as carousel) ---------- */

function makePlaceholderTexture(color: string, label: string) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 1024;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "600 64px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(label, 48, c.height - 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* --------------------------- Curved-card shader --------------------------- */
// Wraps a tessellated plane onto a sphere of radius uRadius so the card hugs
// the sphere surface. Local +Z faces outward; mesh transform handles where on
// the sphere it sits.

const vertexShader = /* glsl */ `
  uniform float uRadius;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float ax = pos.x / uRadius;
    float ay = pos.y / uRadius;
    // Bend in X (horizontal arc)
    pos.x = sin(ax) * uRadius;
    pos.z -= uRadius * (1.0 - cos(ax));
    // Bend in Y (vertical arc) — smaller, just enough to read as spherical
    pos.y = sin(ay) * uRadius;
    pos.z -= uRadius * (1.0 - cos(ay)) * 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTex;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTex, vUv);
    gl_FragColor = c;
  }
`;

/* ------------------------------- Card mesh ------------------------------- */

type CardProps = {
  texture: THREE.Texture;
  position: THREE.Vector3;
  w: number;
  h: number;
  radius: number;
};

function CardMesh({ texture, position, w, h, radius }: CardProps) {
  const ref = useRef<THREE.Mesh>(null);

  // Orient the card so its +Z faces outward from sphere center.
  // Achieved by aiming the mesh at a point further along its own radial.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.position.copy(position);
    const outward = position.clone().multiplyScalar(2);
    ref.current.lookAt(outward);
  }, [position]);

  const uniforms = useMemo(
    () => ({ uTex: { value: texture }, uRadius: { value: radius } }),
    [texture, radius],
  );

  return (
    <mesh ref={ref}>
      <planeGeometry args={[w, h, 24, 24]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

function ImageCard(props: { item: Project } & Omit<CardProps, "texture">) {
  const tex = useTexture(props.item.image!);
  tex.colorSpace = THREE.SRGBColorSpace;
  return <CardMesh {...props} texture={tex} />;
}

function PlaceholderCard(props: { item: Project } & Omit<CardProps, "texture">) {
  const tex = useMemo(
    () => makePlaceholderTexture(props.item.color ?? "#444", props.item.title),
    [props.item.color, props.item.title],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return <CardMesh {...props} texture={tex} />;
}

/* --------------------------------- Sphere -------------------------------- */

function Sphere({ items, radius }: { items: Project[]; radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { size, gl } = useThree();

  // Card dimensions in world units. Width chosen so ~6 cards fit around the equator.
  const cardW = (Math.PI * 2 * radius) / 7;
  const cardH = cardW * 1.35;

  // Fibonacci sphere distribution
  const positions = useMemo(() => {
    const N = items.length;
    const phi = Math.PI * (3 - Math.sqrt(5));
    return items.map((_, i) => {
      const y = 1 - (i / Math.max(N - 1, 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      return new THREE.Vector3(
        Math.cos(theta) * r,
        y,
        Math.sin(theta) * r,
      ).multiplyScalar(radius);
    });
  }, [items.length, radius]);

  // Drag state
  const rot = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      vel.current = { x: 0, y: 0 };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      // Map pixels to radians: full screen width ≈ 2π rotation
      const rx = (dy / size.height) * Math.PI;
      const ry = (dx / size.width) * Math.PI * 2;
      target.current.x += rx;
      target.current.y += ry;
      vel.current = { x: rx, y: ry };
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      el.style.cursor = "grab";
    };

    el.style.cursor = "grab";
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [gl, size.width, size.height]);

  useFrame((_, dt) => {
    // Idle gentle rotation when user isn't dragging and momentum has died down
    if (!dragging.current) {
      target.current.x += vel.current.x;
      target.current.y += vel.current.y;
      vel.current.x *= 0.93;
      vel.current.y *= 0.93;
      if (Math.abs(vel.current.x) < 1e-4 && Math.abs(vel.current.y) < 1e-4) {
        target.current.y += dt * 0.08; // slow auto-spin
      }
    }
    // Clamp vertical so we don't tumble past poles
    target.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, target.current.x));

    const lerp = 1 - Math.pow(0.001, dt);
    rot.current.x += (target.current.x - rot.current.x) * lerp;
    rot.current.y += (target.current.y - rot.current.y) * lerp;

    if (groupRef.current) {
      groupRef.current.rotation.x = rot.current.x;
      groupRef.current.rotation.y = rot.current.y;
    }
  });

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => {
        const item = items[i];
        const Card = item.image ? ImageCard : PlaceholderCard;
        return (
          <Card
            key={i}
            item={item}
            position={pos}
            w={cardW}
            h={cardH}
            radius={radius}
          />
        );
      })}
    </group>
  );
}

/* ------------------------------- Public API ------------------------------ */

type Props = {
  items: Project[];
  radius?: number;
  className?: string;
};

export default function Globe({ items, radius = 3.2, className }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className={"relative w-full h-full select-none " + (className ?? "")}>
      {mounted && (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 8.2], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Sphere items={items} radius={radius} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
