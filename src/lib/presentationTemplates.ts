export type PresentationTemplateId = "spotlight" | "gradient" | "minimal";
export type PresentationBackgroundId = "midnight" | "violet" | "sunset" | "emerald";

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
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Titre central premium avec halo lumineux.",
  },
  {
    id: "gradient",
    name: "Gradient",
    description: "Grand texte éditorial sur fond dynamique.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Carte sobre, lisible et élégante.",
  },
];

export const PRESENTATION_BACKGROUNDS: PresentationBackground[] = [
  { id: "midnight", name: "Midnight", colors: ["#020617", "#312e81", "#0f172a"] },
  { id: "violet", name: "Violet", colors: ["#16001e", "#7c3aed", "#111827"] },
  { id: "sunset", name: "Sunset", colors: ["#431407", "#f97316", "#881337"] },
  { id: "emerald", name: "Emerald", colors: ["#022c22", "#10b981", "#0f172a"] },
];

export function getPresentationTemplate(id: PresentationTemplateId): PresentationTemplate {
  return PRESENTATION_TEMPLATES.find((template) => template.id === id) ?? PRESENTATION_TEMPLATES[0];
}

export function getPresentationBackground(id: PresentationBackgroundId): PresentationBackground {
  return PRESENTATION_BACKGROUNDS.find((background) => background.id === id) ?? PRESENTATION_BACKGROUNDS[0];
}
