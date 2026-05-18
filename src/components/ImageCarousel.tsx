"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type { Project } from "@/data/projects";

type Props = {
  items: Project[];
  className?: string;
};

/* ---------- Placeholder gradient texture (when no image provided) ---------- */

function makePlaceholderTexture(color: string, label: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1280;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 56px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(label, 60, c.height - 80);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* --------------------------------- Shader --------------------------------- */

const vertexShader = /* glsl */ `
  uniform float uVelocity;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Curve the plane on the X axis based on drag velocity.
    // Wobble decays at the edges via a gentle sin envelope.
    float v = clamp(uVelocity, -1.5, 1.5);
    float bend = sin(uv.x * 3.14159) * v * 0.35;
    pos.z += bend;
    // Slight breathing in Y while idle
    pos.y += sin(uTime * 0.6 + uv.x * 6.0) * 0.005;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uVelocity;
  varying vec2 vUv;

  void main() {
    // RGB shift proportional to velocity
    float amt = clamp(abs(uVelocity) * 0.04, 0.0, 0.06);
    vec2 dir = vec2(sign(uVelocity), 0.0);
    float r = texture2D(uTex, vUv - dir * amt).r;
    float g = texture2D(uTex, vUv).g;
    float b = texture2D(uTex, vUv + dir * amt).b;
    float a = texture2D(uTex, vUv).a;
    gl_FragColor = vec4(r, g, b, a);
  }
`;

/* ------------------------------- Image plane ------------------------------ */

type PlaneProps = {
  texture: THREE.Texture;
  x: number;
  velocity: React.MutableRefObject<number>;
  planeW: number;
  planeH: number;
};

function Plane({ texture, x, velocity, planeW, planeH }: PlaneProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTex: { value: texture },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
    }),
    [texture],
  );

  useFrame((_, dt) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uVelocity.value = velocity.current;
    matRef.current.uniforms.uTime.value += dt;
  });

  return (
    <mesh position={[x, 0, 0]}>
      <planeGeometry args={[planeW, planeH, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

function ImagePlane({
  item,
  ...rest
}: { item: Project } & Omit<PlaneProps, "texture">) {
  // Hook is unconditional here — this component only renders when item.image is set.
  const tex = useTexture(item.image!);
  tex.colorSpace = THREE.SRGBColorSpace;
  return <Plane texture={tex} {...rest} />;
}

function PlaceholderPlane({
  item,
  ...rest
}: { item: Project } & Omit<PlaneProps, "texture">) {
  const tex = useMemo(
    () => makePlaceholderTexture(item.color ?? "#444", item.title),
    [item.color, item.title],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return <Plane texture={tex} {...rest} />;
}

/* --------------------------------- Scene --------------------------------- */

function Scene({ items }: { items: Project[] }) {
  const { viewport, size } = useThree();
  // Plane sized relative to viewport, with gap between
  const planeH = viewport.height * 0.62;
  const planeW = planeH * 0.78;
  const gap = planeW * 0.18;
  const step = planeW + gap;
  const stripWidth = step * items.length;

  // State refs (no re-renders in the loop)
  const target = useRef(0);
  const current = useRef(0);
  const velocity = useRef(0);
  const isDragging = useRef(false);
  const lastPointer = useRef(0);
  const releaseVelocity = useRef(0);

  // Wire pointer / wheel to the underlying canvas dom element
  useEffect(() => {
    const el = (document.getElementById("carousel-canvas") ??
      document.querySelector("canvas")) as HTMLCanvasElement | null;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastPointer.current = e.clientX;
      releaseVelocity.current = 0;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current;
      lastPointer.current = e.clientX;
      // Convert pixels to world units (viewport.width spans `size.width` pixels)
      const worldDx = (dx / size.width) * viewport.width;
      target.current += worldDx;
      releaseVelocity.current = worldDx;
    };
    const onUp = (e: PointerEvent) => {
      isDragging.current = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      // horizontal wheel / shift+wheel / trackpad
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const worldDx = (-dx / size.width) * viewport.width;
      target.current += worldDx;
      releaseVelocity.current = worldDx;
    };

    el.style.cursor = "grab";
    el.style.touchAction = "pan-y";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [size.width, viewport.width]);

  useFrame((_, dt) => {
    // Momentum decay while not dragging
    if (!isDragging.current) {
      target.current += releaseVelocity.current;
      releaseVelocity.current *= 0.92;
      if (Math.abs(releaseVelocity.current) < 0.0005) releaseVelocity.current = 0;
    }
    // Smooth current toward target
    const lerp = 1 - Math.pow(0.001, dt); // frame-rate independent ease
    const next = current.current + (target.current - current.current) * lerp;
    velocity.current = (next - current.current) / Math.max(dt, 0.001);
    current.current = next;
  });

  return (
    <>
      {items.map((item, i) => (
        <PositionedPlane
          key={i}
          item={item}
          index={i}
          step={step}
          stripWidth={stripWidth}
          current={current}
          velocity={velocity}
          planeW={planeW}
          planeH={planeH}
        />
      ))}
    </>
  );
}

/** Updates its mesh position each frame so the strip wraps infinitely. */
function PositionedPlane({
  item,
  index,
  step,
  stripWidth,
  current,
  velocity,
  planeW,
  planeH,
}: {
  item: Project;
  index: number;
  step: number;
  stripWidth: number;
  current: React.MutableRefObject<number>;
  velocity: React.MutableRefObject<number>;
  planeW: number;
  planeH: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const half = stripWidth / 2;
    const baseX = index * step + current.current - (stripWidth - step) / 2;
    const x = (((baseX + half) % stripWidth) + stripWidth) % stripWidth - half;
    groupRef.current.position.x = x;
  });

  const Inner = item.image ? ImagePlane : PlaceholderPlane;
  return (
    <group ref={groupRef}>
      <Inner item={item} x={0} velocity={velocity} planeW={planeW} planeH={planeH} />
    </group>
  );
}

/* ------------------------------- Public API ------------------------------ */

export default function ImageCarousel({ items, className }: Props) {
  // Avoid SSR mismatch: only mount canvas client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className={"relative h-[80vh] w-full select-none " + (className ?? "")}
      // expose to children via canvas id
    >
      {mounted && (
        <Canvas
          id="carousel-canvas"
          dpr={[1, 2]}
          camera={{ position: [0, 0, 3], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Scene items={items} />
          </Suspense>
        </Canvas>
      )}

      {/* Hover/click affordance overlay — clicks pass through unless on a title */}
      <ul className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center gap-6 text-xs uppercase tracking-[0.25em] text-neutral-500">
        <li className="pointer-events-auto">drag · scroll</li>
      </ul>
    </div>
  );
}
