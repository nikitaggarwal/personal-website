"use client";

import dynamic from "next/dynamic";
import { PROJECTS } from "@/data/projects";

const ImageCarousel = dynamic(() => import("./ImageCarousel"), { ssr: false });

export default function Projects() {
  return (
    <section className="relative min-h-screen w-full py-24">
      <div className="px-6 md:px-12">
        <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Selected work
        </h2>
        <p className="mt-3 text-3xl md:text-5xl font-light max-w-2xl">
          Things I&apos;ve built.
        </p>
      </div>
      <div className="mt-12">
        <ImageCarousel items={PROJECTS} />
      </div>
    </section>
  );
}
