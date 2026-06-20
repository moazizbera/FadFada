export type WorldId = "calm" | "story" | "poetry" | "faith" | "learning" | "build" | "celebration" | "grief";

export type ParticleKind = "dust" | "embers" | "petals" | "stars" | "rain" | "confetti" | "none";
export type OrbShape = "sphere" | "flame" | "bloom" | "crescent" | "lantern" | "spark" | "still-water";
export type WorldFont = "sans" | "serif-italic" | "serif" | "arabic-serif" | "mono";

export type World = {
  id: WorldId;
  nameAr: string;
  nameEn: string;
  gradient: string;
  particle: ParticleKind;
  particleColor?: string;
  orbShape: OrbShape;
  orbHex: string;
  font: WorldFont;
  typeSpeed: number;
};

export const worlds: Record<WorldId, World> = {
  calm: {
    id: "calm",
    nameAr: "مساحة هادئة",
    nameEn: "Calm Space",
    gradient: "radial-gradient(circle at 50% 15%, #1a1825 0%, #0E0D10 55%)",
    particle: "dust",
    particleColor: "#8B7BB8",
    orbShape: "sphere",
    orbHex: "#8B7BB8",
    font: "sans",
    typeSpeed: 14,
  },
  story: {
    id: "story",
    nameAr: "ركن الحكاية",
    nameEn: "Story Circle",
    gradient: "radial-gradient(circle at 50% 100%, #3a2418 0%, #1a120c 45%, #0E0D10 75%)",
    particle: "embers",
    particleColor: "#D4724A",
    orbShape: "flame",
    orbHex: "#D4724A",
    font: "serif-italic",
    typeSpeed: 28,
  },
  poetry: {
    id: "poetry",
    nameAr: "غرفة الشعر",
    nameEn: "Poetry Room",
    gradient: "radial-gradient(circle at 30% 20%, #241a2e 0%, #150f1c 50%, #0E0D10 80%)",
    particle: "petals",
    particleColor: "#C9A86A",
    orbShape: "bloom",
    orbHex: "#C9A86A",
    font: "serif",
    typeSpeed: 45,
  },
  faith: {
    id: "faith",
    nameAr: "طمأنينة إيمانية",
    nameEn: "Quiet Faith",
    gradient: "radial-gradient(circle at 50% 30%, #1c2520 0%, #10160f 50%, #0E0D10 80%)",
    particle: "stars",
    particleColor: "#9FB89F",
    orbShape: "crescent",
    orbHex: "#9FB89F",
    font: "arabic-serif",
    typeSpeed: 30,
  },
  learning: {
    id: "learning",
    nameAr: "غرفة التعلم",
    nameEn: "Learning Room",
    gradient: "radial-gradient(circle at 50% 0%, #14201c 0%, #0d1512 50%, #0E0D10 80%)",
    particle: "dust",
    particleColor: "#5C7C6B",
    orbShape: "lantern",
    orbHex: "#5C7C6B",
    font: "sans",
    typeSpeed: 10,
  },
  build: {
    id: "build",
    nameAr: "استوديو البناء",
    nameEn: "Build Studio",
    gradient: "radial-gradient(circle at 50% 50%, #1a1a14 0%, #100f0c 50%, #0E0D10 80%)",
    particle: "none",
    orbShape: "spark",
    orbHex: "#C9A86A",
    font: "mono",
    typeSpeed: 6,
  },
  celebration: {
    id: "celebration",
    nameAr: "مساحة الفرح",
    nameEn: "Celebration Room",
    gradient: "radial-gradient(circle at 50% 20%, #2e2210 0%, #1c1408 50%, #0E0D10 80%)",
    particle: "confetti",
    particleColor: "#D4724A",
    orbShape: "spark",
    orbHex: "#D4724A",
    font: "sans",
    typeSpeed: 12,
  },
  grief: {
    id: "grief",
    nameAr: "سكينة",
    nameEn: "Stillness",
    gradient: "radial-gradient(circle at 50% 50%, #15151a 0%, #0E0D10 70%)",
    particle: "rain",
    particleColor: "#6B7280",
    orbShape: "still-water",
    orbHex: "#6B7280",
    font: "sans",
    typeSpeed: 22,
  },
};

export const worldShiftIds: WorldId[] = ["story", "poetry", "faith", "build", "calm"];

export function getWorld(id: WorldId): World {
  return worlds[id];
}
