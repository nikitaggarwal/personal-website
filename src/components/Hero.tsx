"use client";

import dynamic from "next/dynamic";
import { PROJECTS } from "@/data/projects";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

export default function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(40,40,40,0.45),transparent_70%)]" />

      <div className="pointer-events-none absolute top-10 left-0 right-0 text-center z-10 px-6">
        <h1 className="text-4xl md:text-6xl font-light tracking-tight">
          Nikita Aggarwal
        </h1>
        <p className="mt-3 text-sm md:text-base text-neutral-400">
          {/* TODO: tagline */}
          Engineer · Builder · Wanderer
        </p>
      </div>

      <div className="absolute inset-0">
        <Globe items={PROJECTS} />
      </div>

      <div className="pointer-events-none absolute bottom-10 left-0 right-0 text-center text-xs uppercase tracking-[0.3em] text-neutral-500 z-10">
        Drag to rotate · scroll for more
      </div>
    </section>
  );
}
