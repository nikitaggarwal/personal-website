export type Project = {
  /** Image URL — leave undefined to use a generated gradient placeholder */
  image?: string;
  title: string;
  href?: string;
  /** Accent color for the placeholder gradient (hex) */
  color?: string;
};

// thum.io serves screenshots with CORS headers, so Three.js can sample them
// as textures without tainting the canvas. `viewportWidth/1200` + `crop/1500`
// gives a consistent 4:5 hero-shot of the live site.
const shot = (url: string) =>
  `https://image.thum.io/get/width/1200/crop/1500/viewportWidth/1280/wait/3/${url}`;

export const PROJECTS: Project[] = [
  {
    title: "Zach Casting",
    href: "https://zachcasting.vercel.app/roster",
    image: shot("https://zachcasting.vercel.app/roster"),
    color: "#3b3b6e",
  },
  {
    title: "Events",
    href: "https://events-theta-teal.vercel.app/",
    image: shot("https://events-theta-teal.vercel.app/"),
    color: "#3b6e6e",
  },
  {
    title: "Arielle Letters",
    href: "https://arielleletters.vercel.app/",
    image: shot("https://arielleletters.vercel.app/"),
    color: "#d4c4a8",
  },
  {
    title: "Congrats Shihao",
    href: "https://congratsshihao.vercel.app/",
    image: shot("https://congratsshihao.vercel.app/"),
    color: "#6e3b5a",
  },

  // TODO: add more — drop in more `{ title, href, image: shot(url) }` entries.
  // Placeholder slots so the sphere stays full while you build out the list:
  { title: "Coming Soon", color: "#3b6e4f" },
  { title: "Coming Soon", color: "#6e5a3b" },
  { title: "Coming Soon", color: "#5a3b6e" },
  { title: "Coming Soon", color: "#3b5a6e" },
  { title: "Coming Soon", color: "#6e6e3b" },
  { title: "Coming Soon", color: "#4a3b6e" },
  { title: "Coming Soon", color: "#6e4a3b" },
  { title: "Coming Soon", color: "#3b6e4a" },
  { title: "Coming Soon", color: "#6e3b6e" },
  { title: "Coming Soon", color: "#3b4a6e" },
  { title: "Coming Soon", color: "#6e6e6e" },
  { title: "Coming Soon", color: "#5a6e3b" },
  { title: "Coming Soon", color: "#3b6e5a" },
  { title: "Coming Soon", color: "#5a3b3b" },
  { title: "Coming Soon", color: "#3b3b3b" },
  { title: "Coming Soon", color: "#6e5a5a" },
];
