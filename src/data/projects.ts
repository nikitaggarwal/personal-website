export type Project = {
  /** Image URL — leave undefined to use a generated gradient placeholder */
  image?: string;
  title: string;
  href?: string;
  /** Accent color for the placeholder gradient (hex) */
  color?: string;
};

// TODO: replace with real projects + image URLs.
// Aim for 18–28 items for the globe view to look full.
export const PROJECTS: Project[] = [
  { title: "Project One", color: "#3b3b6e" },
  { title: "Project Two", color: "#6e3b3b" },
  { title: "Project Three", color: "#3b6e4f" },
  { title: "Project Four", color: "#6e5a3b" },
  { title: "Project Five", color: "#5a3b6e" },
  { title: "Project Six", color: "#3b5a6e" },
  { title: "Project Seven", color: "#6e3b5a" },
  { title: "Project Eight", color: "#3b6e6e" },
  { title: "Project Nine", color: "#6e6e3b" },
  { title: "Project Ten", color: "#4a3b6e" },
  { title: "Project Eleven", color: "#6e4a3b" },
  { title: "Project Twelve", color: "#3b6e4a" },
  { title: "Project Thirteen", color: "#6e3b6e" },
  { title: "Project Fourteen", color: "#3b4a6e" },
  { title: "Project Fifteen", color: "#6e6e6e" },
  { title: "Project Sixteen", color: "#5a6e3b" },
  { title: "Project Seventeen", color: "#3b6e5a" },
  { title: "Project Eighteen", color: "#5a3b3b" },
  { title: "Project Nineteen", color: "#3b3b3b" },
  { title: "Project Twenty", color: "#6e5a5a" },
];
