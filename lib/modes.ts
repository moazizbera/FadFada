import type { WorldId } from "./worlds";

export type ModeId = "listen" | "support" | "joy" | "organize" | "expert" | "coach" | "research";

export type Mode = {
  id: ModeId;
  defaultWorld: WorldId;
  examples: string;
};

export const modes: Record<ModeId, Mode> = {
  listen: {
    id: "listen",
    defaultWorld: "calm",
    examples: "casual venting, no advice wanted",
  },
  support: {
    id: "support",
    defaultWorld: "calm",
    examples: "sadness, anxiety, emotional pain",
  },
  joy: {
    id: "joy",
    defaultWorld: "celebration",
    examples: "good news, achievement",
  },
  organize: {
    id: "organize",
    defaultWorld: "build",
    examples: "overwhelm, needs structure",
  },
  expert: {
    id: "expert",
    defaultWorld: "learning",
    examples: "medical/legal/financial questions",
  },
  coach: {
    id: "coach",
    defaultWorld: "build",
    examples: "goals, motivation, accountability",
  },
  research: {
    id: "research",
    defaultWorld: "learning",
    examples: "wants to learn/study, asks for resources",
  },
};

export function inferMode(text: string): ModeId {
  const normalized = text.toLowerCase();

  if (/congrat|نجحت|فرحان|فرحانة|achievement|great news/.test(normalized)) return "joy";
    if (/study|learn|course|research|video|watch|material|resource|pdf|article|ذاكر|تعلم|مصادر|شرح|فيديو|موارد|مصدر|مقال/.test(normalized)) return "research";
  if (/plan|organize|overwhelmed|خطة|رتب|متلخبط|مش عارف أبدأ/.test(normalized)) return "organize";
  if (/goal|habit|motivation|هدف|عادة|التزام/.test(normalized)) return "coach";
  if (/doctor|legal|finance|health|طبيب|قانون|فلوس|صحة/.test(normalized)) return "expert";
  if (/sad|anxious|tired|lonely|حزين|قلقان|تعبان|وحيد/.test(normalized)) return "support";

  return "listen";
}

export function inferWorld(text: string): WorldId {
  const normalized = text.toLowerCase();

  if (/story|حكاية|قصة|قصه|حدوتة|حدوته/.test(normalized)) return "story";
  if (/poem|poetry|شعر|قصيدة|قصيده/.test(normalized)) return "poetry";
  if (/pray|prayer|دعاء|صلاة|صلاه|ربنا|إيمان|ايمان/.test(normalized)) return "faith";
  if (/plan|organize|build|خطة|خطه|رتب|نظم|بناء/.test(normalized)) return "build";

  return modes[inferMode(text)].defaultWorld;
}
