export type PresentationTemplateId = 
  | "spotlight" 
  | "gradient" 
  | "minimal" 
  | "neon" 
  | "aurora" 
  | "minimal-bold" 
  | "glass" 
  | "cinema";
export type PresentationBackgroundId = 
  | "midnight" 
  | "violet" 
  | "sunset" 
  | "emerald" 
  | "cyberpunk" 
  | "ocean" 
  | "neon-pink" 
  | "gold" 
  | "aurora-borealis" 
  | "deep-space";

export interface PresentationTemplate {
  id: PresentationTemplateId;
  name: string;
  description: string;
}

export interface PresentationBackground {
  id: PresentationBackgroundId;
  name: string;
  colors: [string, string, string];
}

export interface PresentationSlideConfig {
  template: PresentationTemplateId;
  title: string;
  subtitle: string;
  imageUrl?: string;
  background: PresentationBackgroundId;
  durationSeconds: number;
}

export const PRESENTATION_TEMPLATES: PresentationTemplate[] = [
  { id: "spotlight", name: "Spotlight", description: "Titre central premium avec halo lumineux." },
  { id: "gradient", name: "Gradient", description: "Grand texte éditorial sur fond dynamique." },
  { id: "minimal", name: "Minimal", description: "Carte sobre, lisible et élégante." },
  { id: "neon", name: "Neon", description: "Effets lumineux neon futuristes." },
  { id: "aurora", name: "Aurora", description: "Fond avec auroras animées." },
  { id: "minimal-bold", name: "Minimal Bold", description: "Texte massif avec bordure premium." },
  { id: "glass", name: "Glass", description: "Carte en verre avec blur." },
  { id: "cinema", name: "Cinema", description: "Bandeau noir et blanc hollywoodien." },
];

export const PRESENTATION_BACKGROUNDS: PresentationBackground[] = [
  { id: "midnight", name: "Midnight", colors: ["#020617", "#312e81", "#0f172a"] },
  { id: "violet", name: "Violet", colors: ["#16001e", "#7c3aed", "#111827"] },
  { id: "sunset", name: "Sunset", colors: ["#431407", "#f97316", "#881337"] },
  { id: "emerald", name: "Emerald", colors: ["#022c22", "#10b981", "#0f172a"] },
  { id: "cyberpunk", name: "Cyberpunk", colors: ["#0a0118", "#ff00ff", "#00ffff"] },
  { id: "ocean", name: "Ocean", colors: ["#0c4a6e", "#0ea5e9", "#0369a1"] },
  { id: "neon-pink", name: "Neon Pink", colors: ["#1f0017", "#ec4899", "#0f172a"] },
  { id: "gold", name: "Gold", colors: ["#171717", "#fbbf24", "#44403c"] },
  { id: "aurora-borealis", name: "Aurora Borealis", colors: ["#0f172a", "#22c55e", "#3b82f6"] },
  { id: "deep-space", name: "Deep Space", colors: ["#000000", "#4f46e5", "#0f172a"] },
];

export function getPresentationTemplate(id: PresentationTemplateId): PresentationTemplate {
  return PRESENTATION_TEMPLATES.find((template) => template.id === id) ?? PRESENTATION_TEMPLATES[0];
}

export function getPresentationBackground(id: PresentationBackgroundId): PresentationBackground {
  return PRESENTATION_BACKGROUNDS.find((background) => background.id === id) ?? PRESENTATION_BACKGROUNDS[0];
}
