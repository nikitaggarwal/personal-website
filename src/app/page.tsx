import Hero from "@/components/Hero";
import Projects from "@/components/Projects";

export default function Page() {
  return (
    <main className="flex flex-col">
      <Hero />
      <Projects />
      <footer className="py-12 px-6 text-center text-xs uppercase tracking-[0.3em] text-neutral-600">
        {/* TODO: socials / contact */}
        © {new Date().getFullYear()} Nikita Aggarwal
      </footer>
    </main>
  );
}
