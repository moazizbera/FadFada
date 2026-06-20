export type PersonaId = "omar" | "sami" | "nora";

export type Persona = {
  id: PersonaId;
  name: string;
  nameAr: string;
  role: string;
  gradient: string;
  voice: string;
};

export const personas: Persona[] = [
  {
    id: "omar",
    name: "Omar",
    nameAr: "عمر",
    role: "Close friend",
    gradient: "linear-gradient(135deg, #8B7BB8, #534AB7)",
    voice: "warm, direct, and casually reassuring",
  },
  {
    id: "sami",
    name: "Uncle Sami",
    nameAr: "عم سامي",
    role: "Wise elder",
    gradient: "linear-gradient(135deg, #C9A86A, #8A6A33)",
    voice: "patient, old-soul, and story-rich",
  },
  {
    id: "nora",
    name: "Nora",
    nameAr: "نورا",
    role: "Action coach",
    gradient: "linear-gradient(135deg, #5C7C6B, #2E4A3C)",
    voice: "focused, practical, and gently accountable",
  },
];
