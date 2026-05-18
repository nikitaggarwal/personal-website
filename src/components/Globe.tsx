"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Project } from "@/data/projects";

/* ----------------------- Placeholder cover texture ---------------------- */

function makeCoverTexture(color: string, label: string) {
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
  return tex;
}

/* -------------------------- Seeded random utils -------------------------- */

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller — normal-distributed sample (mean 0, stddev 1)
function gauss(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Uniformly distributed random quaternion (Shoemake)
function randomQuaternion(rand: () => number) {
  const u1 = rand();
  const u2 = rand();
  const u3 = rand();
  return new THREE.Quaternion(
    Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2),
    Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
    Math.sqrt(u1) * Math.sin(2 * Math.PI * u3),
    Math.sqrt(u1) * Math.cos(2 * Math.PI * u3),
  );
}

/* ------------------------ Build paper poses ------------------------ *
 * Papers thrown in the air, frozen mid-flight: gaussian-cloud positions
 * around origin + completely random orientations + a per-paper drift axis
 * and rate so each one gently rotates in place like it's caught in slow air.
 */
type PaperPose = {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  driftAxis: THREE.Vector3;
  driftSpeed: number;
};

function buildPaperPoses(count: number, spread = 2.5, seed = 7): PaperPose[] {
  const rand = mulberry32(seed);
  const out: PaperPose[] = [];
  for (let i = 0; i < count; i++) {
    const pos = new THREE.Vector3(
      gauss(rand) * spread,
      gauss(rand) * spread,
      gauss(rand) * spread,
    );
    // Random tangent axis for slow drift
    const ax = new THREE.Vector3(
      rand() - 0.5,
      rand() - 0.5,
      rand() - 0.5,
    ).normalize();
    out.push({
      pos,
      quat: randomQuaternion(rand),
      driftAxis: ax,
      driftSpeed: 0.04 + rand() * 0.06, // radians/sec — barely-perceptible drift
    });
  }
  return out;
}

/* --------------------------------- Paper -------------------------------- */

type PaperProps = {
  item: Project;
  pose: PaperPose;
  w: number;
  h: number;
  thickness: number;
};

function Paper({ item, pose, w, h, thickness }: PaperProps) {
  const groupRef = useRef<THREE.Group>(null);

  const placeholder = useMemo(
    () => makeCoverTexture(item.color ?? "#444", item.title),
    [item.color, item.title],
  );
  useEffect(() => () => placeholder.dispose(), [placeholder]);

  const [imageTex, setImageTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!item.image) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      item.image,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        setImageTex(tex);
      },
      undefined,
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [item.image]);
  useEffect(() => () => imageTex?.dispose(), [imageTex]);

  const cover = imageTex ?? placeholder;

  // Materials — front/back show the cover, sides are warm off-white paper edges
  const materials = useMemo(() => {
    const edge = new THREE.MeshBasicMaterial({ color: "#f6f0e6" });
    const face = new THREE.MeshBasicMaterial({ map: cover, toneMapped: false });
    return [edge, edge, edge, edge, face, face];
  }, [cover]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  // Snap to final pose on first frame
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(pose.pos);
    groupRef.current.quaternion.copy(pose.quat);
  }, [pose]);

  const [hovered, setHovered] = useState(false);
  const driftQuat = useRef(new THREE.Quaternion());

  useFrame((_, dt) => {
    if (!groupRef.current) return;

    // Per-paper slow drift — feels like air currents
    driftQuat.current.setFromAxisAngle(pose.driftAxis, pose.driftSpeed * dt);
    groupRef.current.quaternion.multiply(driftQuat.current);

    // Hover scale
    const targetScale = hovered ? 1.25 : 1.0;
    const cur = groupRef.current.scale.x;
    const next = cur + (targetScale - cur) * 0.15;
    groupRef.current.scale.setScalar(next);
  });

  return (
    <group ref={groupRef}>
      <mesh
        material={materials}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = item.href ? "pointer" : "grab";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (item.href) window.open(item.href, "_blank", "noopener");
        }}
      >
        <boxGeometry args={[w, h, thickness]} />
      </mesh>
    </group>
  );
}

/* ----------------------------- Scene wrapper ---------------------------- */

function Scene({ items }: { items: Project[] }) {
  const wrapperRef = useRef<THREE.Group>(null);
  const { size, gl } = useThree();

  // Paper dimensions — letter-paper aspect, thin, slightly bigger than the
  // old cards so they read as actual sheets of paper.
  const paperW = 1.3;
  const paperH = paperW * 1.4;
  const paperT = 0.015;

  const poses = useMemo(
    () => buildPaperPoses(items.length, 2.6, 7),
    [items.length],
  );

  // Drag state — rotates the whole cloud, no auto-spin (the scene is "frozen")
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
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      const rx = (dy / size.height) * Math.PI;
      const ry = (dx / size.width) * Math.PI * 2;
      target.current.x += rx;
      target.current.y += ry;
      vel.current = { x: rx, y: ry };
    };
    const onUp = () => {
      dragging.current = false;
    };
    el.style.cursor = "grab";
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl, size.width, size.height]);

  useFrame((_, dt) => {
    if (!dragging.current) {
      target.current.x += vel.current.x;
      target.current.y += vel.current.y;
      vel.current.x *= 0.94;
      vel.current.y *= 0.94;
    }
    const lerp = 1 - Math.pow(0.001, dt);
    rot.current.x += (target.current.x - rot.current.x) * lerp;
    rot.current.y += (target.current.y - rot.current.y) * lerp;
    if (wrapperRef.current) {
      wrapperRef.current.rotation.x = rot.current.x;
      wrapperRef.current.rotation.y = rot.current.y;
    }
  });

  return (
    <group ref={wrapperRef}>
      {items.map((item, i) => (
        <Paper
          key={i}
          item={item}
          pose={poses[i % poses.length]}
          w={paperW}
          h={paperH}
          thickness={paperT}
        />
      ))}
    </group>
  );
}

/* ------------------------------ Public API ----------------------------- */

type Props = { items: Project[]; className?: string };

export default function Globe({ items, className }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className={"relative w-full h-full select-none " + (className ?? "")}>
      {mounted && (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene items={items} />
        </Canvas>
      )}
    </div>
  );
}
