export type WorldId = "calm" | "story" | "faith" | "build" | "learning" | "celebration" | "grief";

export type World = {
  id: WorldId;
  nameAr: string;
  nameEn: string;
  gradient: string;
  orbHex: string;
  shape: "circle" | "teardrop" | "crescent" | "star" | "lantern" | "rings";
  tone: string;
};

export const worlds: Record<WorldId, World> = {
  calm: {
    id: "calm",
    nameAr: "هادئ",
    nameEn: "Calm",
    gradient: "radial-gradient(circle at 50% 12%, #1a1825 0%, #0E0D10 56%)",
    orbHex: "#8B7BB8",
    shape: "circle",
    tone: "soft reflective companion",
  },
  story: {
    id: "story",
    nameAr: "حكاية",
    nameEn: "Story",
    gradient: "radial-gradient(circle at 50% 100%, #3a2418 0%, #1a120c 46%, #0E0D10 76%)",
    orbHex: "#D4724A",
    shape: "teardrop",
    tone: "old storyteller with grounded imagery",
  },
  faith: {
    id: "faith",
    nameAr: "إيمان",
    nameEn: "Faith",
    gradient: "radial-gradient(circle at 50% 28%, #1c2520 0%, #10160f 52%, #0E0D10 82%)",
    orbHex: "#9FB89F",
    shape: "crescent",
    tone: "gentle spiritual reassurance without preaching",
  },
  build: {
    id: "build",
    nameAr: "بناء",
    nameEn: "Build",
    gradient: "radial-gradient(circle at 50% 50%, #1a1a14 0%, #100f0c 52%, #0E0D10 82%)",
    orbHex: "#C9A86A",
    shape: "star",
    tone: "clear structured tactical planning",
  },
  learning: {
    id: "learning",
    nameAr: "تعلم",
    nameEn: "Learning",
    gradient: "radial-gradient(circle at 50% 0%, #14201c 0%, #0d1512 52%, #0E0D10 82%)",
    orbHex: "#5C7C6B",
    shape: "lantern",
    tone: "focused learning coach with resources",
  },
  celebration: {
    id: "celebration",
    nameAr: "فرح",
    nameEn: "Celebrate",
    gradient: "radial-gradient(circle at 50% 20%, #2e2210 0%, #1c1408 52%, #0E0D10 82%)",
    orbHex: "#D4724A",
    shape: "star",
    tone: "warm celebratory reflection",
  },
  grief: {
    id: "grief",
    nameAr: "سكينة",
    nameEn: "Stillness",
    gradient: "radial-gradient(circle at 50% 50%, #15151a 0%, #0E0D10 72%)",
    orbHex: "#6B7280",
    shape: "rings",
    tone: "slow safety-first grounding",
  },
};

export const selectableWorlds: WorldId[] = ["calm", "story", "faith", "build", "learning"];
