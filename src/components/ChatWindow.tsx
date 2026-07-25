"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { type ChangeEvent, FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { prepareArabicForSpeech } from "../lib/arabicSpeech";
import { childStories, type ChildStory } from "../lib/childStories";
import { NEW_CHILDREN_ROSTER, personas, type Persona, type PersonaId, type PersonaVoiceConfig } from "../lib/personas";
import { selectableWorlds, worlds, type WorldId } from "../lib/worlds";
import { useAppLocale } from "./AppShell";
import { BreathingExercise } from "./BreathingExercise";
import { PersonaDrawer } from "./PersonaDrawer";
import { TypewriterSync, type EmotionalCadence } from "./TypewriterSync";

// Web Speech API types (browser-only, not in all TS dom lib versions)
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionErrorEvent {
  error?: string;
}

type Language = "ar" | "en";
type HomeHeaderAction = "start" | "avatars" | "stories" | "homework" | "newChat";

type BehaviorStyle = "signature" | "deep" | "coach" | "quick";
type HomeToolPanel = "checkin" | "sessions" | "progress" | "tone" | "prompts" | "plans" | "about";

type PersonaEnvironmentProfile = {
  ambientClassName: string;
  animationClassName: string;
  textClassName: string;
  typographyClassName: string;
  typewriterClassName: string;
  cadenceOverride?: EmotionalCadence;
  formatAssistantText?: (text: string) => string;
};

type ChildChallenge = {
  type: "riddle" | "quiz" | "dare";
  question: string;
  pointsReward: number;
};

type ChildHomeworkActivity = {
  type: "quiz" | "trace" | "match" | "story" | "challenge";
  title: string;
  prompt: string;
  hint: string;
  choices?: string[];
  visual?: ChildHomeworkVisual;
};

type ChildHomeworkVisual = {
  kind: "stars" | "circles" | "triangles" | "squares" | "letters" | "numbers" | "mixed";
  count?: number;
  label?: string;
};

type ChildHomeworkAssignment = {
  id: string;
  subject: "math" | "english" | "arabic" | "kg" | "mixed";
  detectedTask: string;
  childIntro: string;
  activities: ChildHomeworkActivity[];
  assignedAt: string;
  source: "image" | "hint";
  missionCompleted: boolean;
  missionCompletedAt: string | null;
  missionPoints: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  world: WorldId;
  language?: Language;
  cadence?: EmotionalCadence;
  resources?: LearningResource[];
  generatedMedia?: GeneratedMediaAsset;
  challenge?: ChildChallenge;
  childHomeworkActivities?: ChildHomeworkActivity[];
  suggestions?: string[];
  personaId?: PersonaId;
  personaName?: string;
  avatarPath?: string;
  childStoryId?: string;
};

type ChatSessionSummary = {
  sessionId: string;
  title: string;
  activePersonaId: string;
  activeWorld: string;
  language: Language;
  messages: ChatMessage[];
  messageCount?: number;
  updatedAt?: string;
};

type ChildChoiceVisual = {
  label: string;
  kind: "castle" | "forest" | "sea" | "letters" | "numbers" | "story" | "spark";
  gradientClassName: string;
};

type DailyChildMoment = {
  dateKey: string;
  learn: { label: string; text: string; world: WorldId };
  feel: { label: string; text: string; world: WorldId };
  connect: { label: string; text: string; world: WorldId };
};

type LearningResource = {
  title: string;
  type: "video" | "article" | "document";
  url: string;
  summary: string;
};

type GeneratedMediaAsset = {
  id: string;
  kind: "image" | "video";
  title: string;
  prompt: string;
  sourceText: string;
  createdAt: string;
};

type TinyPlan = {
  id: string;
  title: string;
  steps: string[];
  world: WorldId;
  language: Language;
  createdAt: string;
};

type JourneySnapshot = {
  id: string;
  title: string;
  theme: string;
  nextStep: string;
  messageCount: number;
  world: WorldId;
  language: Language;
  createdAt: string;
};

type GrowthQuest = {
  id: string;
  title: string;
  reason: string;
  days: Array<{ label: string; done: boolean }>;
  world: WorldId;
  language: Language;
  createdAt: string;
};

type StoryMirrorShot = {
  sceneNumber: number;
  title: string;
  shotType: string;
  duration: string;
  visualNotes: string;
  audioNotes: string;
  prompt: string;
};

type StoryMirrorImageState = {
  status: "idle" | "loading" | "ready" | "error";
  imageDataUrl?: string;
  source?: string;
  model?: string;
};

type ReflectResponse = {
  text?: string;
  world?: WorldId;
  challenge?: ChildChallenge;
  suggestions?: string[];
  triggerAudioPlayback?: boolean;
  emotionalCadence?: {
    speed?: EmotionalCadence;
  };
  mediaIntent?: {
    kind?: "image" | "video";
    confidence?: number;
    prompt?: string;
  };
  resources?: LearningResource[];
  error?: "PAYWALL_TRIGGERED" | string;
  promptUpsell?: boolean;
  message?: string;
};

type CustomPersonaDraft = {
  name: string;
  description: string;
  avatarPath?: string;
};

type DailyPulseState = {
  mood: "low" | "heavy" | "steady" | "bright";
  energy: "empty" | "tired" | "okay" | "charged";
  need: "calm" | "plan" | "learn" | "comfort";
};

type DailyPulseStats = {
  count: number;
  streak: number;
  lastDate: string | null;
};

type MomentActionKey = "save" | "plan" | "share" | "proof" | "download" | "speak" | "helpful" | "softer";
type ShareStatus = "idle" | "copied" | "error";
type AccessState = "anonymous" | "signed" | "plus";

const behaviorStyles: Record<BehaviorStyle, { ar: string; en: string; hintAr: string; hintEn: string }> = {
  signature: {
    ar: "فضفضة",
    en: "FadFada",
    hintAr: "الأسلوب الأصلي: دافئ، عربي أولاً، وخطوة صغيرة.",
    hintEn: "Original FadFada voice: warm, Arabic-first, one small step.",
  },
  deep: {
    ar: "عمق",
    en: "Deep AI",
    hintAr: "رد أطول قليلاً، يلتقط الطبقات النفسية والمعنى.",
    hintEn: "A deeper reflective style that names layers and meaning.",
  },
  coach: {
    ar: "تنفيذ",
    en: "Action AI",
    hintAr: "يركز على قرار واضح وخطوتين قابلتين للتنفيذ.",
    hintEn: "More structured, decisive, and action-oriented.",
  },
  quick: {
    ar: "سريع",
    en: "Fast AI",
    hintAr: "أقصر رد ممكن بدون فقدان الدفء.",
    hintEn: "Shortest useful answer while staying warm.",
  },
};

type InteractionEventType = "starter_tap" | "moment_save" | "tiny_plan" | "moment_share" | "app_share" | "capsule_download" | "helpful_feedback" | "softer_feedback" | "visitor_comment" | "visitor_name_register" | "avatar_rating";

const worldLabels: Record<WorldId, { ar: string; en: string }> = {
  story: { ar: "حكاية", en: "Story" },
  faith: { ar: "إيمان", en: "Faith" },
  build: { ar: "بناء", en: "Build" },
  calm: { ar: "هادئ", en: "Calm" },
  learning: { ar: "تعلم", en: "Learn" },
  celebration: { ar: "فرح", en: "Joy" },
  grief: { ar: "سكينة", en: "Stillness" },
};

const openingMessages: Record<Language, string> = {
  ar: "اكتب اللي جواك بأي لغة. أنا هنا أسمعك بهدوء، وبعدها نطلع بخطوة صغيرة واضحة.",
  en: "Write what is inside you in any language. I will listen calmly, then help you leave with one small clear step.",
};

function buildOpeningMessage(language: Language, userName: string | null) {
  if (!userName) return openingMessages[language];
  return language === "ar"
    ? `أهلاً ${userName}. اكتب اللي جواك بأي لغة. أنا هنا أسمعك بهدوء، وبعدها نطلع بخطوة صغيرة واضحة.`
    : `Hi ${userName}. Write what is inside you in any language. I will listen calmly, then help you leave with one small clear step.`;
}

function buildChildOpeningMessage(language: Language, childName: string | null) {
  const name = childName || (language === "ar" ? "يا بطل" : "friend");
  return language === "ar"
    ? `أهلاً ${name}. هذه مساحتك الآمنة للقصص والتعلم واللعب الهادئ. اختر رفيقاً من الأطفال أو اكتب ما تريد تجربته الآن.`
    : `Hi ${name}. This is your safe space for stories, learning, and calm play. Choose a children companion or write what you want to try now.`;
}

function normalizeGreetingName(value: string | null | undefined) {
  const rawName = value?.trim();
  if (!rawName) return null;
  const displayName = rawName.includes("@") ? rawName.split("@")[0].replace(/[._-]+/g, " ") : rawName;
  const cleanedName = displayName.replace(/[<>()[\]{}]/g, "").replace(/\s+/g, " ").trim();
  return cleanedName ? cleanedName.slice(0, 32) : null;
}

function cleanClientDiscountCode(value: string | null) {
  const cleanedValue = value?.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 48);
  return cleanedValue || "";
}

function cleanDemoCommand(value: string | null) {
  const cleanedValue = value?.trim().toLowerCase();
  const allowedCommands = new Set(["/judge", "/story", "/proof", "/pitch", "/launch", "/badge", "/capsule", "/quest"]);
  return cleanedValue && allowedCommands.has(cleanedValue) ? cleanedValue : "";
}

const visitorUserIdKey = "fadfada-user-id";
const chatSessionIdStorageKey = "fadfada-active-chat-session-id";
const conversationStorageKey = "fadfada-chat-session-v1";
const personaStorageKey = "fadfada-active-persona-id";
const customPersonaStorageKey = "fadfada-custom-persona";
const localCreditStorageKey = "fadfada-beta-credits-used";
const dailyPulseStorageKey = "fadfada-daily-pulse";
const tinyPlanStorageKey = "fadfada-tiny-plans";
const journeySnapshotStorageKey = "fadfada-journey-snapshots";
const growthQuestStorageKey = "fadfada-growth-quests";
const generatedMediaStorageKey = "fadfada-generated-media";
const discountCodeStorageKey = "fadfada-discount-code";
const voiceDialectStorageKey = "fadfada-voice-dialect";
const offlineDraftStorageKey = "fadfada-offline-draft";
const visitorNameStorageKey = "fadfada-visitor-name";
const defaultExperienceConfiguration = {
  anonymousReflectionLimit: 5,
  signedGiftReflectionLimit: 15,
  anonymousPersonaLimit: 4,
  signedPersonaLimit: 10,
  avatarsEnabled: true,
  blockedPersonaIds: [] as PersonaId[],
  anonymousPersonaIds: personas.slice(0, 4).map((persona) => persona.id),
  signedPersonaIds: personas.slice(0, 10).map((persona) => persona.id),
  plusPersonaIds: personas.map((persona) => persona.id),
};

const childPersonaIdSet = new Set<string>([
  "lulu_letters",
  "zizo_numbers",
  "tala_explorer",
  "biso_kindness",
  ...NEW_CHILDREN_ROSTER.map((persona) => persona.id),
]);

function cleanPersonaIdList(value: unknown) {
  const validPersonaIds = new Set(personas.map((persona) => persona.id));
  return Array.from(new Set((Array.isArray(value) ? value : [])
    .map((item) => typeof item === "string" ? item.trim().slice(0, 80) : "")
    .filter((personaId): personaId is PersonaId => validPersonaIds.has(personaId))));
}

function cleanPersonaIdListOrDefault(value: unknown, fallback: PersonaId[]) {
  if (!Array.isArray(value)) return fallback;
  return cleanPersonaIdList(value);
}

const maxStoredMessages = 80;
const fadfadaHomeActionEventName = "fadfada:home-action";
const childHistorySyncedStorageKey = "fadfada-child-history-synced";

const starterMoments: Record<Language, Array<{ label: string; text: string; world: WorldId }>> = {
  ar: [
    { label: "أنا مضغوط", text: "أنا مضغوط اليوم ومحتاج أرتب اللي جوايا بهدوء.", world: "calm" },
    { label: "حوّلها لخطة", text: "عندي حاجات كتير ومش عارف أبدأ منين. ساعدني أحولها لخطة صغيرة.", world: "build" },
    { label: "طمني", text: "محتاج كلام يطمني من غير نصائح كتير.", world: "faith" },
    { label: "احكيها كقصة", text: "حوّل إحساسي ده لحكاية قصيرة تساعدني أفهم نفسي.", world: "story" },
  ],
  en: [
    { label: "I feel heavy", text: "I feel heavy today and I need help naming what is inside me.", world: "calm" },
    { label: "Make a plan", text: "I have too many things in my head. Help me turn them into one small plan.", world: "build" },
    { label: "Reassure me", text: "I need a gentle sentence that helps me breathe without too much advice.", world: "faith" },
    { label: "Tell it as a story", text: "Turn this feeling into a short story that helps me understand myself.", world: "story" },
  ],
};

const dailyChildMomentOptions: Record<Language, Array<Omit<DailyChildMoment, "dateKey">>> = {
  ar: [
    {
      learn: { label: "لماذا السماء زرقاء؟", text: "علّمني شيئاً صغيراً: لماذا تبدو السماء زرقاء؟ اشرحها كقصة قصيرة.", world: "learning" },
      feel: { label: "لون يومي", text: "أريد أن أختار لوناً ليومي وأفهم ماذا يعني شعوري.", world: "calm" },
      connect: { label: "سؤال قبل النوم", text: "ساعدني أختار سؤالاً لطيفاً أسأله لوالدي قبل النوم.", world: "story" },
    },
    {
      learn: { label: "سر النوم", text: "علّمني ماذا يفعل جسمي وأنا نائم بطريقة سهلة وممتعة.", world: "learning" },
      feel: { label: "غيمة أم شمس؟", text: "ساعدني أقول هل شعوري اليوم مثل غيمة أم شمس، ولماذا.", world: "calm" },
      connect: { label: "شكر صغير", text: "ساعدني أكتب جملة شكر صغيرة لشخص في البيت.", world: "celebration" },
    },
    {
      learn: { label: "كيف يعمل الصوت؟", text: "علّمني كيف يصل الصوت إلى أذني كأنها مغامرة صغيرة.", world: "learning" },
      feel: { label: "اسم الشعور", text: "اسألني أسئلة سهلة حتى أجد اسماً لشعوري الآن.", world: "calm" },
      connect: { label: "لعبة دقيقتين", text: "اقترح لي لعبة دقيقتين ألعبها مع والدي بدون شاشة.", world: "build" },
    },
  ],
  en: [
    {
      learn: { label: "Why is the sky blue?", text: "Teach me one tiny thing: why does the sky look blue? Explain it like a short story.", world: "learning" },
      feel: { label: "My day color", text: "I want to choose a color for my day and understand what my feeling means.", world: "calm" },
      connect: { label: "Bedtime question", text: "Help me choose a kind question to ask my parent before sleep.", world: "story" },
    },
    {
      learn: { label: "Sleep secret", text: "Teach me what my body does while I sleep in a simple fun way.", world: "learning" },
      feel: { label: "Cloud or sun?", text: "Help me say whether my feeling today is like a cloud or the sun, and why.", world: "calm" },
      connect: { label: "Tiny thank-you", text: "Help me write one small thank-you sentence for someone at home.", world: "celebration" },
    },
    {
      learn: { label: "How sound works", text: "Teach me how sound reaches my ears like a tiny adventure.", world: "learning" },
      feel: { label: "Name the feeling", text: "Ask me easy questions so I can find a name for my feeling now.", world: "calm" },
      connect: { label: "Two-minute game", text: "Suggest a two-minute no-screen game I can play with my parent.", world: "build" },
    },
  ],
};

function buildDailyChildMoment(language: Language, childProfileId: string, childName: string | null, dateKey?: string): DailyChildMoment {
  // Use a fixed placeholder date during SSR to ensure server/client match
  // Real date will be set after hydration via useEffect
  const key = dateKey ?? "2024-01-01";
  const seedText = `${key}:${childProfileId || childName || "child"}`;
  const seed = Array.from(seedText).reduce((total, char) => total + char.charCodeAt(0), 0);
  const options = dailyChildMomentOptions[language];
  return { dateKey: key, ...options[seed % options.length] };
}

const visitorChallengeMoments: Record<Language, Array<{ badge: string; title: string; description: string; text: string; world: WorldId; personaId: PersonaId }>> = {
  ar: [
    {
      badge: "30 ثانية",
      title: "اعرف رفيقك المناسب",
      description: "اختبار سريع يحوّل حالتك إلى رفيق وخطوة واضحة.",
      text: "اسألني 3 أسئلة قصيرة لتعرف أي رفيق في فضفضة يناسبني الآن، ثم اختر لي الرفيق المناسب وخطوة واحدة أبدأ بها.",
      world: "calm",
      personaId: "noor_companion",
    },
    {
      badge: "شاركها",
      title: "حوّل شعورك إلى بطاقة",
      description: "رد جاهز يتحول بسهولة إلى لقطة مشاركة أو قصة.",
      text: "حوّل شعوري الحالي إلى بطاقة قصيرة قابلة للمشاركة: عنوان قوي، جملة صادقة، وخطوة صغيرة. اجعلها دافئة وغير محرجة.",
      world: "story",
      personaId: "rawi",
    },
    {
      badge: "هاكاثون",
      title: "اصنع خطة دقيقة الآن",
      description: "للزوار الذين يريدون قيمة عملية من أول دقيقة.",
      text: "لدي هدف مهم هذا الأسبوع. اسألني سؤالاً واحداً فقط إذا احتجت، ثم أعطني خطة 3 خطوات قابلة للتنفيذ خلال 24 ساعة.",
      world: "build",
      personaId: "nora",
    },
  ],
  en: [
    {
      badge: "30 sec",
      title: "Quick companion match",
      description: "A 3-question quiz that maps your current state to the right companion and gives you one clear first step.",
      text: "Ask me 3 short questions to find which FadFada companion fits me right now, then choose the companion and give me one first step.",
      world: "calm",
      personaId: "noor_companion",
    },
    {
      badge: "Shareable",
      title: "Turn a feeling into a card",
      description: "A response visitors can turn into a share moment or story.",
      text: "Turn my current feeling into a short shareable card: a strong title, one honest sentence, and one small step. Keep it warm, not embarrassing.",
      world: "story",
      personaId: "rawi",
    },
    {
      badge: "Hackathon",
      title: "Build a tiny action plan",
      description: "For visitors who want practical value in the first minute.",
      text: "I have an important goal this week. Ask me only one question if needed, then give me a 3-step plan I can execute in the next 24 hours.",
      world: "build",
      personaId: "nora",
    },
  ],
};

type ConsultantScenario = {
  badge: string;
  title: string;
  description: string;
  intake: string;
  output: string;
  text: string;
  world: WorldId;
  personaId: PersonaId;
};

type LifeProjectTemplate = {
  badge: string;
  title: string;
  description: string;
  bring: string;
  artifacts: string[];
  text: string;
  world: WorldId;
  personaId: PersonaId;
};

const lifeProjectTemplates: Record<Language, LifeProjectTemplate[]> = {
  ar: [
    {
      badge: "Interview",
      title: "Sprint مقابلة عمل",
      description: "حوّل إعلان الوظيفة إلى خطة إجابات وتدريب سريع.",
      bring: "الصق إعلان الوظيفة وملخص خبرتك.",
      artifacts: ["Pitch", "أسئلة متوقعة", "تدريب 15 دقيقة"],
      text: "ابدأ معي كمشروع مقابلة عمل سريع. اسألني عن إعلان الوظيفة وخبرتي إذا لم أرفقهما، ثم ابنِ لي: 1) pitch مختصر، 2) أقوى 5 نقاط مناسبة للوظيفة، 3) أسئلة مقابلة متوقعة مع إجابات نموذجية بصوتي، 4) تدريب 15 دقيقة قبل المقابلة، 5) خطوة واحدة أعملها الآن.",
      world: "build",
      personaId: "nora",
    },
    {
      badge: "Business",
      title: "اختبار فكرة مشروع",
      description: "قبل ما تبني، اختبر العميل والسعر والمخاطر.",
      bring: "اكتب المنتج والعميل والسعر المتوقع.",
      artifacts: ["عرض قيمة", "مخاطر", "اختبار 48 ساعة"],
      text: "ابدأ معي كمشروع اختبار فكرة تجارية. اسألني عن المنتج والعميل والسعر إذا لم أوضحها، ثم أخرج لي: 1) عرض قيمة واضح، 2) العميل الأول الأنسب، 3) طريقة تسعير أولية، 4) أكبر 3 مخاطر، 5) تجربة تحقق خلال 48 ساعة برسالة جاهزة أرسلها لعميل محتمل.",
      world: "build",
      personaId: "dr_fahad",
    },
    {
      badge: "Message",
      title: "رسالة صعبة بدون توتر",
      description: "اكتب رداً محترماً يضع حدوداً ولا يصعّد المشكلة.",
      bring: "الصق ما حدث وما تريد قوله.",
      artifacts: ["فهم", "3 ردود", "حدود"],
      text: "ابدأ معي كمشروع صياغة رسالة صعبة. اسألني عن العلاقة وما حدث والهدف إذا لم أوضحها، ثم أعطني: 1) قراءة هادئة للموقف، 2) حدود يجب حمايتها، 3) ثلاث صيغ للرد: لطيفة، مباشرة، وحازمة، 4) جملة لا يجب قولها، 5) خطوة بعد الإرسال.",
      world: "calm",
      personaId: "layla_eq",
    },
    {
      badge: "Study",
      title: "إنقاذ مذاكرة قبل الامتحان",
      description: "خطة واقعية حسب الوقت المتبقي ونقاط الضعف.",
      bring: "اكتب المادة والموعد وما لا تفهمه.",
      artifacts: ["جدول", "أولويات", "اختبار صغير"],
      text: "ابدأ معي كمشروع إنقاذ مذاكرة. اسألني عن المادة والموعد والمستوى إذا لم أوضحها، ثم أخرج لي: 1) ترتيب الأولويات، 2) جدول مذاكرة واقعي حتى الموعد، 3) طريقة فهم لكل جزء صعب، 4) اختبار صغير، 5) أول جلسة أبدأها الآن.",
      world: "learning",
      personaId: "professor_zain",
    },
    {
      badge: "Money",
      title: "إعادة ضبط الميزانية",
      description: "قرار مالي أو مصروفات كثيرة تتحول لخطة أرقام واضحة.",
      bring: "اكتب الدخل والمصاريف والقرار الحالي.",
      artifacts: ["خريطة أرقام", "تقليل خطر", "خطة أسبوع"],
      text: "ابدأ معي كمشروع إعادة ضبط ميزانية تعليمي عام، وليس نصيحة مالية مرخصة. اسألني عن الدخل والمصاريف والهدف إذا لم أوضحها، ثم أعطني: 1) خريطة أرقام بسيطة، 2) أين يتسرب المال، 3) مقارنة القرار الحالي، 4) مخاطر يجب تجنبها، 5) خطة أسبوع واحد.",
      world: "build",
      personaId: "khalid_investor",
    },
    {
      badge: "Launch",
      title: "حزمة إطلاق محتوى",
      description: "حوّل منتجك أو فكرتك إلى منشورات ورسالة بيع.",
      bring: "اكتب المنتج والجمهور والمنصة.",
      artifacts: ["زوايا", "5 منشورات", "CTA"],
      text: "ابدأ معي كمشروع إطلاق محتوى. اسألني عن المنتج والجمهور والمنصة إذا لم أوضحها. إذا طلبت منك التجهيز أو الاختيار بدلاً مني، لا تشرح الاستراتيجية؛ أخرج أصولاً جاهزة للنشر: 1) زاوية تموضع واحدة، 2) نص بوست كامل قابل للنسخ، 3) نص كاروسيل/برزنتيشن شريحة بشريحة، 4) CTA واضح، 5) هاشتاجات، 6) ملاحظات تصميم قصيرة، 7) اختبار سريع لمعرفة أي زاوية تعمل أفضل.",
      world: "build",
      personaId: "maya_creator",
    },
  ],
  en: [
    {
      badge: "Interview",
      title: "Job interview sprint",
      description: "Turn a job post into answers, proof points, and a quick rehearsal.",
      bring: "Paste the job post and your experience summary.",
      artifacts: ["Pitch", "Likely questions", "15-min rehearsal"],
      text: "Start this as a job interview sprint. Ask me for the job post and my experience if I did not provide them, then build: 1) a short interview pitch, 2) my strongest 5 proof points for the role, 3) likely interview questions with answers in my voice, 4) a 15-minute rehearsal plan, and 5) one action to do now.",
      world: "build",
      personaId: "nora",
    },
    {
      badge: "Business",
      title: "Business idea test",
      description: "Validate the customer, price, and risk before building too much.",
      bring: "Write the product, customer, and expected price.",
      artifacts: ["Value prop", "Risks", "48-hour test"],
      text: "Start this as a business idea test. Ask me about the product, customer, and price if I did not provide them, then give me: 1) a clear value proposition, 2) the best first customer, 3) initial pricing logic, 4) the top 3 risks, and 5) a 48-hour validation experiment with a ready message to send to a potential customer.",
      world: "build",
      personaId: "dr_fahad",
    },
    {
      badge: "Message",
      title: "Difficult message builder",
      description: "Write a respectful reply that sets boundaries without escalating.",
      bring: "Paste what happened and what you want to say.",
      artifacts: ["Clarity", "3 replies", "Boundaries"],
      text: "Start this as a difficult message project. Ask me about the relationship, what happened, and the goal if I did not provide them, then give me: 1) a calm read of the situation, 2) boundaries to protect, 3) three reply versions: warm, direct, and firm, 4) one sentence not to send, and 5) the next step after sending.",
      world: "calm",
      personaId: "layla_eq",
    },
    {
      badge: "Study",
      title: "Study rescue plan",
      description: "A realistic exam plan based on time left and weak points.",
      bring: "Write the subject, deadline, and what you do not understand.",
      artifacts: ["Schedule", "Priorities", "Mini test"],
      text: "Start this as a study rescue project. Ask me about the subject, deadline, and level if I did not provide them, then give me: 1) priority order, 2) a realistic study schedule until the deadline, 3) a learning method for each hard part, 4) a mini test, and 5) the first session to start now.",
      world: "learning",
      personaId: "professor_zain",
    },
    {
      badge: "Money",
      title: "Budget reset",
      description: "Turn a money decision or messy expenses into a clear number plan.",
      bring: "Write your income, expenses, and current decision.",
      artifacts: ["Number map", "Risk reduction", "Week plan"],
      text: "Start this as a general educational budget reset, not licensed financial advice. Ask me about income, expenses, and goal if I did not provide them, then give me: 1) a simple number map, 2) where money is leaking, 3) comparison of the current decision, 4) risks to avoid, and 5) a one-week plan.",
      world: "build",
      personaId: "khalid_investor",
    },
    {
      badge: "Launch",
      title: "Content launch pack",
      description: "Turn a product or idea into posts and a clear sales message.",
      bring: "Write the product, audience, and platform.",
      artifacts: ["Angles", "5 posts", "CTA"],
      text: "Start this as a content launch project. Ask me about the product, audience, and platform if I did not provide them. If I ask you to prepare it or choose for me, do not explain strategy; produce ready-to-publish assets: 1) one positioning angle, 2) full post copy, 3) carousel/presentation copy slide by slide, 4) a clear CTA, 5) hashtags, 6) brief design notes, and 7) a quick test to learn which angle works best.",
      world: "build",
      personaId: "maya_creator",
    },
  ],
};

const consultantScenarios: Record<Language, ConsultantScenario[]> = {
  ar: [
    {
      badge: "قانون",
      title: "افهم موقفك القانوني",
      description: "رتّب العقد أو المشكلة قبل الذهاب لمحامٍ.",
      intake: "الصق بند عقد أو اشرح النزاع والبلد.",
      output: "مخاطر + أسئلة للمحامي",
      text: "تصرف كمستشار معلومات قانونية عام، وليس بديلاً عن محامٍ مرخص. اسألني أولاً عن البلد ونوع المشكلة إذا لم أوضحها، ثم ساعدني في ترتيب الموقف إلى: 1) ملخص بسيط، 2) نقاط الخطر، 3) مستندات أحتاج جمعها، 4) أسئلة دقيقة أسألها لمحامٍ مختص. لا تعطيني فتوى قانونية نهائية.",
      world: "build",
      personaId: "lina_consultant",
    },
    {
      badge: "IT",
      title: "حل مشكلة تقنية",
      description: "برمجة، أخطاء، سيرفرات، أدوات، أو اختيار تقنية.",
      intake: "الصق رسالة الخطأ أو صف الجهاز والهدف.",
      output: "تشخيص + خطوات إصلاح",
      text: "تصرف كمستشار IT عملي. اسألني عن البيئة والخطأ والهدف إذا لم أوضحها، ثم أعطني تشخيصاً منظماً: السبب المحتمل، خطوات فحص سريعة، حل أول، وحل احتياطي. اجعل الرد مناسباً لشخص يريد إنجاز المشكلة لا درساً طويلاً.",
      world: "learning",
      personaId: "rami_operator",
    },
    {
      badge: "Math",
      title: "مدرس رياضيات خطوة بخطوة",
      description: "افهم المسألة بدل حفظ الإجابة فقط.",
      intake: "اكتب المسألة أو صوّرها بالكلام.",
      output: "شرح + تدريب صغير",
      text: "تصرف كمدرس رياضيات صبور. اطلب مني نص المسألة أو صوّرها بالكلام، ثم حلها خطوة بخطوة مع سبب كل خطوة. بعد الحل، أعطني سؤالاً مشابهاً بسيطاً لأتأكد أنني فهمت.",
      world: "learning",
      personaId: "professor_zain",
    },
    {
      badge: "تجارة",
      title: "راجع فكرة مشروعك",
      description: "سعر، جمهور، منافسين، ومخاطر قبل التنفيذ.",
      intake: "اكتب المنتج والعميل والسعر المتوقع.",
      output: "نموذج ربح + خطة اختبار",
      text: "تصرف كمستشار تجارة ومشاريع. اسألني عن المنتج والعميل والسعر الحالي إذا لم أوضحها، ثم أعطني مراجعة عملية: العميل المناسب، عرض القيمة، طريقة التسعير، أكبر 3 مخاطر، وتجربة اختبار خلال 48 ساعة.",
      world: "build",
      personaId: "dr_fahad",
    },
    {
      badge: "Career",
      title: "جهّز قرارك المهني",
      description: "CV، مقابلة، عرض عمل، أو تغيير مسار.",
      intake: "الصق CV أو إعلان وظيفة أو قرارك الحالي.",
      output: "قرار + خطوة اليوم",
      text: "تصرف كمستشار مهني عملي. اسألني عن وضعي الحالي والهدف إذا لم أوضحه، ثم ساعدني في اختيار الخطوة التالية: تحليل الخيارات، المخاطر، رسالة أو CV pitch مختصر، وخطوة واحدة أعملها اليوم.",
      world: "build",
      personaId: "nora",
    },
    {
      badge: "صحة",
      title: "افهم معلومة صحية بأمان",
      description: "تبسيط أبحاث وأعراض عامة بدون تشخيص.",
      intake: "اكتب السؤال أو المصطلح الصحي الذي تريد فهمه.",
      output: "فهم + متى تسأل مختصاً",
      text: "تصرف كمرشد تثقيف صحي عام، وليس طبيباً ولا بديلاً عن رعاية طبية. ساعدني أفهم المعلومة أو السؤال الصحي بلغة بسيطة، واذكر علامات تستدعي التواصل مع طبيب أو طوارئ، ولا تقدم تشخيصاً أو وصفة علاجية.",
      world: "learning",
      personaId: "hadi_researcher",
    },
    {
      badge: "مال",
      title: "رتّب ميزانيتك وقرارك المالي",
      description: "مصروف، ادخار، تسعير، ديون، أو قرار شراء.",
      intake: "اكتب دخلك ومصاريفك والقرار المطلوب.",
      output: "خطة أرقام + مخاطر",
      text: "تصرف كمرشد مالي تعليمي عام، وليس مستشاراً مالياً مرخصاً. اسألني عن الدخل والمصاريف والهدف إذا لم أوضحها، ثم ساعدني في ترتيب الميزانية، تقليل المخاطر، مقارنة الخيارات، وخطوة مالية آمنة هذا الأسبوع. لا تقدم نصيحة استثمارية ملزمة.",
      world: "build",
      personaId: "khalid_investor",
    },
    {
      badge: "دراسة",
      title: "اصنع خطة مذاكرة ذكية",
      description: "امتحان، كورس، بحث، أو موضوع صعب.",
      intake: "اكتب المادة والموعد ونقاط الضعف.",
      output: "جدول + طريقة فهم",
      text: "تصرف كمدرب دراسة عملي. اسألني عن المادة والموعد والمستوى إذا لم أوضحها، ثم أعطني خطة مذاكرة واقعية، طريقة فهم، جدول مراجعة، واختباراً صغيراً يقيس التقدم.",
      world: "learning",
      personaId: "professor_zain",
    },
    {
      badge: "علاقات",
      title: "افهم موقفاً عاطفياً أو اجتماعياً",
      description: "خلاف، حدود، رسالة صعبة، أو سوء فهم.",
      intake: "اكتب ما حدث والرسالة التي تريد إرسالها.",
      output: "فهم + رد مناسب",
      text: "تصرف كمدرب ذكاء عاطفي آمن. ساعدني أفهم المشاعر والحدود والاحتمالات، ثم اقترح ردوداً محترمة وواضحة. لا تتلاعب بالطرف الآخر ولا تشجع علاقة مؤذية.",
      world: "calm",
      personaId: "layla_eq",
    },
    {
      badge: "أسرة",
      title: "رتّب مشكلة عائلية أو تربوية",
      description: "أهل، أطفال، مسؤوليات، أو حوار حساس.",
      intake: "اكتب العمر والعلاقة وما حدث.",
      output: "حوار + حدود",
      text: "تصرف كمرشد أسري عام وغير علاجي. ساعدني في فهم المشكلة، وضع حدود محترمة، وصياغة حوار هادئ وخطوة عملية. شجع طلب مختص عند وجود عنف أو خطر أو أزمة نفسية شديدة.",
      world: "calm",
      personaId: "hana_therapist",
    },
    {
      badge: "تسويق",
      title: "سوّق منتجك أو فكرتك",
      description: "محتوى، حملة، جمهور، أو عرض بيع.",
      intake: "اكتب المنتج والجمهور والمنصة.",
      output: "زوايا + خطة نشر",
      text: "تصرف كخبير تسويق ومحتوى. اسألني عن المنتج والجمهور والمنصة إذا لم أوضحها. إذا طلبت منك أن تختار أو تجهز للنشر، لا تعطيني شرحاً أو أفكاراً عامة؛ أعطني أصولاً جاهزة: نص بوست كامل، نص برزنتيشن/كاروسيل شريحة بشريحة، CTA، هاشتاجات، وملاحظات تصميم قصيرة. إذا كان المطلوب في البداية عاماً، أعطني زوايا محتوى، عرض بيع واضح، 5 أفكار منشورات، وخطة اختبار بسيطة.",
      world: "build",
      personaId: "maya_creator",
    },
    {
      badge: "كتابة",
      title: "اكتب رسالة أو إعلاناً يقنع",
      description: "إيميل، إعلان، صفحة هبوط، أو عرض.",
      intake: "الصق المسودة أو اكتب الهدف والجمهور.",
      output: "صياغة جاهزة",
      text: "تصرف ككاتب إقناعي. اسألني عن الجمهور والهدف والنبرة إذا لم أوضحها، ثم اكتب نسخة واضحة ومقنعة مع عنوان قوي، CTA، ونسخة بديلة أقصر.",
      world: "build",
      personaId: "ziad_copywriter",
    },
    {
      badge: "تصميم",
      title: "حوّل فكرتك لاتجاه بصري",
      description: "هوية، واجهة، ألوان، أو عرض تقديمي.",
      intake: "اكتب فكرة المشروع والشعور المطلوب.",
      output: "اتجاه بصري + عناصر",
      text: "تصرف كمستشار تصميم بصري. اسألني عن الجمهور والاستخدام إذا لم أوضحها، ثم اقترح اتجاهاً بصرياً، ألواناً، أسلوب كتابة، تخطيطاً عاماً، وأخطاء يجب تجنبها.",
      world: "story",
      personaId: "dana_designer",
    },
    {
      badge: "إنتاجية",
      title: "نظّم يومك وعاداتك",
      description: "تشتت، تسويف، عادة جديدة، أو ضغط مهام.",
      intake: "اكتب مهامك ووقت فراغك وأكبر عائق.",
      output: "روتين + أول خطوة",
      text: "تصرف كمدرب عادات وتركيز. ساعدني أحذف الزائد، أحدد الأولوية، أصمم روتيناً واقعياً، وأبدأ بخطوة صغيرة خلال 10 دقائق.",
      world: "build",
      personaId: "coach_ibrahim",
    },
    {
      badge: "بحث",
      title: "افهم موضوعاً معقداً بسرعة",
      description: "بحث، مقارنة، قرار، أو مجال جديد.",
      intake: "اكتب الموضوع وما تريد معرفته تحديداً.",
      output: "خريطة فهم + مصادر",
      text: "تصرف كباحث معرفة. عرّف المصطلحات، لخّص المدارس أو الخيارات، افصل الحقائق عن الافتراضات، ثم أعطني خريطة تعلم ومصادر أو أسئلة بحث تالية.",
      world: "learning",
      personaId: "hadi_researcher",
    },
    {
      badge: "اتجاه",
      title: "اختر خطوة حياتية أو قراراً كبيراً",
      description: "حيرة بين مسارات، انتقال، أو هدف طويل.",
      intake: "اكتب الخيارات والقيود وما تخاف خسارته.",
      output: "مقارنة + اتجاه",
      text: "تصرف كمستشار اتجاه متوازن. ساعدني أوضح القيم والقيود والمخاطر، قارن الخيارات بصدق، ثم اقترح اتجاهاً عملياً وخطوة اختبار صغيرة قبل القرار النهائي.",
      world: "calm",
      personaId: "amal_guide",
    },
  ],
  en: [
    {
      badge: "Law",
      title: "Understand a legal situation",
      description: "Organize a contract or issue before speaking to a lawyer.",
      intake: "Paste a clause or describe the issue and country.",
      output: "Risks + lawyer questions",
      text: "Act as a general legal information guide, not a substitute for a licensed lawyer. First ask my country/jurisdiction and issue type if I did not provide them, then organize the situation into: 1) plain summary, 2) risk points, 3) documents to collect, and 4) precise questions to ask a qualified lawyer. Do not give a final legal opinion.",
      world: "build",
      personaId: "lina_consultant",
    },
    {
      badge: "IT",
      title: "Fix a technical problem",
      description: "Code, bugs, servers, tools, or choosing a stack.",
      intake: "Paste the error or describe the device and goal.",
      output: "Diagnosis + fix steps",
      text: "Act as a practical IT consultant. Ask about my environment, error, and goal if I did not provide them, then give a structured diagnosis: likely cause, quick checks, first fix, and backup fix. Keep it useful for someone trying to solve the problem now.",
      world: "learning",
      personaId: "rami_operator",
    },
    {
      badge: "Math",
      title: "Learn math step by step",
      description: "Understand the problem instead of memorizing the answer.",
      intake: "Type the problem or describe the photo.",
      output: "Explanation + mini drill",
      text: "Act as a patient math tutor. Ask me for the problem statement if I did not provide it, then solve it step by step with the reason behind each step. After the solution, give me one similar small practice question to confirm I understood.",
      world: "learning",
      personaId: "professor_zain",
    },
    {
      badge: "Commerce",
      title: "Review a business idea",
      description: "Pricing, audience, competitors, and risks before execution.",
      intake: "Write the product, customer, and expected price.",
      output: "Profit logic + test plan",
      text: "Act as a commerce and business consultant. Ask me about the product, customer, and current price if I did not provide them, then give a practical review: best customer, value proposition, pricing logic, top 3 risks, and one 48-hour validation experiment.",
      world: "build",
      personaId: "dr_fahad",
    },
    {
      badge: "Career",
      title: "Prepare a career decision",
      description: "CV, interview, job offer, or career switch.",
      intake: "Paste a CV, job post, offer, or career question.",
      output: "Decision + today step",
      text: "Act as a practical career consultant. Ask about my current situation and goal if I did not provide them, then help me choose the next move: option analysis, risks, a short CV/interview pitch, and one action I can take today.",
      world: "build",
      personaId: "nora",
    },
    {
      badge: "Health",
      title: "Understand health info safely",
      description: "Simplify research and general symptoms without diagnosis.",
      intake: "Write the health term or question you want to understand.",
      output: "Clarity + when to ask a pro",
      text: "Act as a general health literacy guide, not a doctor or a replacement for medical care. Help me understand the health question in simple language, mention signs that mean I should contact a clinician or emergency services, and do not provide diagnosis or treatment prescriptions.",
      world: "learning",
      personaId: "hadi_researcher",
    },
    {
      badge: "Money",
      title: "Organize a money decision",
      description: "Budgeting, saving, debt, pricing, or a purchase choice.",
      intake: "Write your income, expenses, and the decision.",
      output: "Number plan + risks",
      text: "Act as a general financial education guide, not a licensed financial advisor. Ask about my income, expenses, and goal if I did not provide them, then help me organize the budget, reduce risk, compare options, and choose one safer money step this week. Do not give binding investment advice.",
      world: "build",
      personaId: "khalid_investor",
    },
    {
      badge: "Study",
      title: "Build a smart study plan",
      description: "Exam, course, research, or a difficult topic.",
      intake: "Write the subject, deadline, and weak points.",
      output: "Schedule + learning method",
      text: "Act as a practical study coach. Ask about the subject, deadline, and level if I did not provide them, then give me a realistic study plan, understanding method, revision schedule, and a small progress check.",
      world: "learning",
      personaId: "professor_zain",
    },
    {
      badge: "Relations",
      title: "Understand a social or emotional situation",
      description: "Conflict, boundaries, a hard message, or misunderstanding.",
      intake: "Write what happened and the message you want to send.",
      output: "Clarity + reply options",
      text: "Act as a safe emotional intelligence coach. Help me understand the feelings, boundaries, and possibilities, then suggest respectful clear replies. Do not manipulate the other person or encourage harmful relationships.",
      world: "calm",
      personaId: "layla_eq",
    },
    {
      badge: "Family",
      title: "Handle a family or parenting issue",
      description: "Parents, children, responsibilities, or sensitive talk.",
      intake: "Write the age, relationship, and what happened.",
      output: "Conversation + boundaries",
      text: "Act as a general family guide, not a therapist. Help me understand the issue, set respectful boundaries, and phrase a calm conversation plus one practical next step. Encourage professional support when there is violence, danger, or severe distress.",
      world: "calm",
      personaId: "hana_therapist",
    },
    {
      badge: "Marketing",
      title: "Market your product or idea",
      description: "Content, campaign, audience, or sales offer.",
      intake: "Write the product, audience, and platform.",
      output: "Angles + posting plan",
      text: "Act as a marketing and content strategist. Ask about the product, audience, and platform if I did not provide them. If I ask you to choose or prepare it for publishing, do not give explanation or generic ideas; give ready assets: full post copy, carousel/presentation copy slide by slide, CTA, hashtags, and brief design notes. If the request is initially broad, give content angles, a clear offer, 5 post ideas, and a simple testing plan.",
      world: "build",
      personaId: "maya_creator",
    },
    {
      badge: "Writing",
      title: "Write a message or ad that persuades",
      description: "Email, ad, landing page, pitch, or offer.",
      intake: "Paste the draft or write the goal and audience.",
      output: "Ready copy",
      text: "Act as a persuasive copywriter. Ask about audience, goal, and tone if I did not provide them, then write a clear persuasive version with a strong headline, CTA, and a shorter alternate version.",
      world: "build",
      personaId: "ziad_copywriter",
    },
    {
      badge: "Design",
      title: "Turn an idea into visual direction",
      description: "Brand, UI, colors, layout, or presentation.",
      intake: "Write the project idea and desired feeling.",
      output: "Visual direction + elements",
      text: "Act as a visual design consultant. Ask about audience and use case if I did not provide them, then suggest visual direction, colors, writing style, layout structure, and mistakes to avoid.",
      world: "story",
      personaId: "dana_designer",
    },
    {
      badge: "Productivity",
      title: "Organize your day and habits",
      description: "Distraction, procrastination, new habit, or task pressure.",
      intake: "Write your tasks, free time, and biggest blocker.",
      output: "Routine + first step",
      text: "Act as a habit and focus coach. Help me remove noise, choose the priority, design a realistic routine, and start with one small action in the next 10 minutes.",
      world: "build",
      personaId: "coach_ibrahim",
    },
    {
      badge: "Research",
      title: "Understand a complex topic fast",
      description: "Research, comparison, decision, or new field.",
      intake: "Write the topic and exactly what you need to know.",
      output: "Knowledge map + sources",
      text: "Act as a knowledge researcher. Define terms, summarize schools or options, separate facts from assumptions, then give me a learning map and useful sources or next research questions.",
      world: "learning",
      personaId: "hadi_researcher",
    },
    {
      badge: "Direction",
      title: "Choose a life step or big decision",
      description: "Confusion between paths, transition, or long-term goal.",
      intake: "Write the options, constraints, and what you fear losing.",
      output: "Comparison + direction",
      text: "Act as a balanced direction advisor. Help me clarify values, constraints, and risks, compare options honestly, then suggest a practical direction and a small test step before the final decision.",
      world: "calm",
      personaId: "amal_guide",
    },
  ],
};

const judgeDemoScenarios: Record<Language, Array<{ label: string; companion: string; personaId: PersonaId; text: string; world: WorldId; targetLanguage: Language }>> = {
  ar: [
    { label: "مريم تسمعك", companion: "مريم", personaId: "maryam", text: "حد قريب مني قلل من اللي حاسه وقال لي العادة كذا. أنا مش محتاج حد يبرر له، محتاج أحس إن إحساسي مفهوم.", world: "calm", targetLanguage: "ar" },
    { label: "راوية تحكي الشعور", companion: "راوية", personaId: "rawi", text: "حاسس إن جوايا فوضى ومش عارف أشرحها مباشرة. حوّليها لمشهد رمزي صغير يساعدني أشوف نفسي من بعيد، ثم أعطيني خطوة واحدة هادئة.", world: "story", targetLanguage: "ar" },
    { label: "سند في الفقد", companion: "سند", personaId: "sanad", text: "أنا فاقد شخص عزيز ومش قادر أسمع كلام جاهز. محتاج حضور هادئ بس.", world: "grief", targetLanguage: "ar" },
    { label: "لغز يفك العقدة", companion: "لغز", personaId: "logoz", text: "عندي مشكلة غامضة في مشروعي: الناس تدخل وتجرب ثم تختفي. اسألني أسئلة ذكية تساعدني أفهم السبب.", world: "learning", targetLanguage: "ar" },
    { label: "نورا تبني خطوة", companion: "نورا", personaId: "nora", text: "I am preparing a hackathon demo. Give me a crisp one-minute execution plan to present FadFada clearly.", world: "build", targetLanguage: "en" },
  ],
  en: [
    { label: "Maryam listens", companion: "Maryam", personaId: "maryam", text: "Someone close to me minimized what I feel and told me it is normal. I do not need excuses for them; I need my feeling to be understood first.", world: "calm", targetLanguage: "en" },
    { label: "Rawiya mirrors", companion: "Rawiya", personaId: "rawi", text: "I feel messy inside and I cannot explain it directly. Turn it into a small symbolic scene that helps me see myself from a distance, then give me one gentle next step.", world: "story", targetLanguage: "en" },
    { label: "Sanad holds loss", companion: "Sanad", personaId: "sanad", text: "I lost someone important and I cannot handle ready-made comfort. I only need quiet presence right now.", world: "grief", targetLanguage: "en" },
    { label: "Logoz solves", companion: "Logoz", personaId: "logoz", text: "I have a product mystery: people visit, try the app, then disappear. Ask sharp questions that help me find the hidden cause.", world: "learning", targetLanguage: "en" },
    { label: "Nora builds", companion: "Nora", personaId: "nora", text: "I am preparing a hackathon demo. Give me a crisp one-minute execution plan to present FadFada clearly.", world: "build", targetLanguage: "en" },
  ],
};

const dailyPulseOptions = {
  mood: {
    low: { ar: "منخفض", en: "Low" },
    heavy: { ar: "ثقيل", en: "Heavy" },
    steady: { ar: "متزن", en: "Steady" },
    bright: { ar: "مشرق", en: "Bright" },
  },
  energy: {
    empty: { ar: "فارغ", en: "Empty" },
    tired: { ar: "متعب", en: "Tired" },
    okay: { ar: "مقبول", en: "Okay" },
    charged: { ar: "نشط", en: "Charged" },
  },
  need: {
    calm: { ar: "تهدئة", en: "Calm" },
    plan: { ar: "خطة", en: "Plan" },
    learn: { ar: "تعلم", en: "Learn" },
    comfort: { ar: "طمأنة", en: "Comfort" },
  },
} as const;

function getPersonaDisplayName(persona: { nameEn: string; nameAr: string }, activeLanguage: Language) {
  return activeLanguage === "ar" ? persona.nameAr : persona.nameEn;
}

const headerAvatarFrameClass = "relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-[#0E0D10] shadow-2xl";
const headerPersonaIds = [
  "omar",
  "sami",
  "maryam",
  "nema",
  "sanad",
  "rawi",
  "nora",
  "kareem",
  "malik",
  "sheikh",
  "grandmaster",
  "zein",
  "poetry_bot",
  "screenwriter",
  "dania",
  "adam",
  "ryan",
  "layan",
  "layl",
  "sarah",
  "tareq",
] as const;
type HeaderPersonaId = (typeof headerPersonaIds)[number];

type HeaderAvatarPresentation = {
  avatarPath: string;
  nameAr: string;
  nameEn: string;
  auraHex: string;
};

const headerAvatarPresentationById: Partial<Record<HeaderPersonaId, HeaderAvatarPresentation>> = {
  omar: { avatarPath: "/avatars/omar.png", nameAr: "عمر", nameEn: "Omar", auraHex: "#5C7C6B" },
  sami: { avatarPath: "/avatars/sami.png", nameAr: "عم سامي", nameEn: "Uncle Sami", auraHex: "#C9A86A" },
  nora: { avatarPath: "/avatars/nora.png", nameAr: "نورا", nameEn: "Nora", auraHex: "#8B7BB8" },
  kareem: { avatarPath: "/avatars/kareem.png", nameAr: "كابتن كريم", nameEn: "Captain Kareem", auraHex: "#22C55E" },
  malik: { avatarPath: "/avatars/malik.png", nameAr: "مالك", nameEn: "Malik GamerX", auraHex: "#06B6D4" },
  sheikh: { avatarPath: "/avatars/sheikh.png", nameAr: "مهندس المليار", nameEn: "The Silicon Sheikh", auraHex: "#A855F7" },
  zein: { avatarPath: "/avatars/zein.png", nameAr: "بروفيسور زين", nameEn: "Professor Zein", auraHex: "#22C55E" },
  screenwriter: { avatarPath: "/avatars/screenwriter.png", nameAr: "المخرج الرقمي", nameEn: "The Screenwriter", auraHex: "#A855F7" },
  layl: { avatarPath: "/avatars/layl.png", nameAr: "دي جي ليل", nameEn: "DJ Layl", auraHex: "#06B6D4" },
  rawi: { avatarPath: "/avatars/rawi.png", nameAr: "راوية", nameEn: "Rawiya", auraHex: "#D4724A" },
};

function isHeaderPersonaId(value: string): value is HeaderPersonaId {
  return headerPersonaIds.includes(value as HeaderPersonaId);
}

function getHeaderAvatarPresentation(persona: Persona): HeaderAvatarPresentation {
  const presentation = isHeaderPersonaId(persona.id) ? headerAvatarPresentationById[persona.id] : undefined;
  return presentation ?? { avatarPath: persona.avatarPath, nameAr: persona.nameAr, nameEn: persona.nameEn, auraHex: persona.glowColorHex };
}

function getHeaderDisplayName(persona: Persona, activeLanguage: Language) {
  const presentation = getHeaderAvatarPresentation(persona);
  return activeLanguage === "ar" ? presentation.nameAr : presentation.nameEn;
}

const defaultEnvironmentProfile: PersonaEnvironmentProfile = {
  ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_90px_rgba(201,168,106,0.08)]",
  animationClassName: "persona-ambient-calm",
  textClassName: "text-[#F7F3EC]/90",
  typographyClassName: "font-arsans",
  typewriterClassName: "",
};

const personaEnvironmentProfiles: Partial<Record<PersonaId, PersonaEnvironmentProfile>> = {
  omar: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_100px_rgba(92,124,107,0.15)]",
    animationClassName: "persona-ambient-calm",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-500",
    cadenceOverride: "steady_calm",
  },
  maryam: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_100px_rgba(92,124,107,0.15)]",
    animationClassName: "persona-ambient-warm",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-500",
    cadenceOverride: "steady_calm",
  },
  sami: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_100px_rgba(201,168,106,0.12)]",
    animationClassName: "persona-ambient-literary",
    textClassName: "text-[#F7F3EC]/84",
    typographyClassName: "font-arserif",
    typewriterClassName: "delay-75 duration-700",
    cadenceOverride: "slow_reflective",
  },
  nema: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_100px_rgba(201,168,106,0.12)]",
    animationClassName: "persona-ambient-tea",
    textClassName: "text-[#F7F3EC]/84",
    typographyClassName: "font-arserif",
    typewriterClassName: "delay-75 duration-700",
    cadenceOverride: "slow_reflective",
  },
  sanad: {
    ambientClassName: "bg-[#0A0A0C] shadow-[inset_0_0_120px_rgba(139,123,184,0.08)]",
    animationClassName: "persona-ambient-stillness",
    textClassName: "text-[#F7F3EC]/70",
    typographyClassName: "font-arsans",
    typewriterClassName: "leading-[2.15] tracking-[0.01em]",
    cadenceOverride: "slow_reflective",
    formatAssistantText: formatSanadSilence,
  },
  rawi: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_120px_rgba(212,114,74,0.14)]",
    animationClassName: "persona-ambient-story",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-arserif",
    typewriterClassName: "leading-[2.05] duration-700",
    cadenceOverride: "slow_reflective",
  },
  nora: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_120px_rgba(139,123,184,0.16)]",
    animationClassName: "persona-ambient-kinetic",
    textClassName: "text-[#F7F3EC]/92",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-300",
    cadenceOverride: "rapid_energetic",
  },
  kareem: {
    ambientClassName: "bg-[#07110B] shadow-[inset_0_0_120px_rgba(34,197,94,0.16)]",
    animationClassName: "persona-ambient-field",
    textClassName: "text-[#F7F3EC]/92",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-300",
    cadenceOverride: "rapid_energetic",
  },
  malik: {
    ambientClassName: "bg-[#061216] shadow-[inset_0_0_120px_rgba(6,182,212,0.16)]",
    animationClassName: "persona-ambient-digital",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.015em]",
  },
  malik_alt: {
    ambientClassName: "bg-[#061016] shadow-[inset_0_0_110px_rgba(2,132,199,0.14)]",
    animationClassName: "persona-ambient-detox",
    textClassName: "text-[#F7F3EC]/84",
    typographyClassName: "font-arsans",
    typewriterClassName: "leading-[2] duration-700",
    cadenceOverride: "slow_reflective",
  },
  sheikh: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_100px_rgba(168,85,247,0.14)]",
    animationClassName: "persona-ambient-capital",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.02em]",
  },
  grandmaster: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_100px_rgba(168,85,247,0.14)]",
    animationClassName: "persona-ambient-architect",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.02em]",
  },
  zein: {
    ambientClassName: "bg-[#06130F] shadow-[inset_0_0_120px_rgba(16,185,129,0.16)]",
    animationClassName: "persona-ambient-research",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.015em]",
  },
  logoz: {
    ambientClassName: "bg-[#0D0A16] shadow-[inset_0_0_120px_rgba(139,92,246,0.16)]",
    animationClassName: "persona-ambient-puzzle",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.015em]",
  },
  poetry_bot: {
    ambientClassName: "bg-[#07120E] shadow-[inset_0_0_120px_rgba(5,150,105,0.15)]",
    animationClassName: "persona-ambient-poetry",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-arserif",
    typewriterClassName: "leading-[2.25] duration-700",
    cadenceOverride: "slow_reflective",
  },
  screenwriter: {
    ambientClassName: "bg-[#130717] shadow-[inset_0_0_120px_rgba(217,70,239,0.15)]",
    animationClassName: "persona-ambient-cinema",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-enserif",
    typewriterClassName: "leading-[2] duration-700",
  },
  dania: {
    ambientClassName: "bg-[#071022] shadow-[inset_0_0_120px_rgba(29,78,216,0.14)]",
    animationClassName: "persona-ambient-legal",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.012em]",
  },
  adam: {
    ambientClassName: "bg-[#151205] shadow-[inset_0_0_120px_rgba(234,179,8,0.16)]",
    animationClassName: "persona-ambient-metabolic",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-300",
  },
  ryan: {
    ambientClassName: "bg-[#160B05] shadow-[inset_0_0_120px_rgba(234,88,12,0.15)]",
    animationClassName: "persona-ambient-biohack",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.012em]",
  },
  layan: {
    ambientClassName: "bg-[#170713] shadow-[inset_0_0_120px_rgba(236,72,153,0.14)]",
    animationClassName: "persona-ambient-clinical",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-500",
  },
  wamda: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_120px_rgba(234,179,8,0.16)]",
    animationClassName: "persona-ambient-spark",
    textClassName: "text-[#F7F3EC]/92",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-300",
    cadenceOverride: "rapid_energetic",
  },
  radar: {
    ambientClassName: "bg-[#0E0D10] shadow-[inset_0_0_100px_rgba(6,182,212,0.14)]",
    animationClassName: "persona-ambient-radar",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.015em]",
    cadenceOverride: "steady_calm",
  },
  layl: {
    ambientClassName: "bg-[#050D14] shadow-[inset_0_0_120px_rgba(6,182,212,0.14)]",
    animationClassName: "persona-ambient-sonic",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-enserif",
    typewriterClassName: "leading-[2.05] duration-700",
    cadenceOverride: "slow_reflective",
  },
  sarah: {
    ambientClassName: "bg-[#080817] shadow-[inset_0_0_120px_rgba(139,92,246,0.16)]",
    animationClassName: "persona-ambient-cosmic",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-arsans",
    typewriterClassName: "duration-700",
  },
  sarah_alt: {
    ambientClassName: "bg-[#090A18] shadow-[inset_0_0_120px_rgba(99,102,241,0.15)]",
    animationClassName: "persona-ambient-academic",
    textClassName: "text-[#F7F3EC]/88",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.012em]",
  },
  tareq: {
    ambientClassName: "bg-[#06130C] shadow-[inset_0_0_120px_rgba(34,197,94,0.15)]",
    animationClassName: "persona-ambient-engineering",
    textClassName: "text-[#F7F3EC]/90",
    typographyClassName: "font-mono",
    typewriterClassName: "font-mono tracking-[0.012em]",
    cadenceOverride: "rapid_energetic",
  },
};

function getPersonaEnvironmentProfile(personaIdValue: PersonaId) {
  const aliases: Record<string, PersonaId> = {
    dr_fahad: "grandmaster",
    khalid_investor: "sheikh",
    lina_consultant: "dania",
    rami_operator: "tareq",
    salma_planner: "maryam",
    youssef_builder: "adam",
    layla_eq: "layan",
    hana_therapist: "nema",
    noor_companion: "sanad",
    maya_creator: "screenwriter",
    ziad_copywriter: "radar",
    dana_designer: "wamda",
    professor_zain: "zein",
    adel_debater: "logoz",
    hadi_researcher: "ryan",
    faisal_njm: "adam",
    coach_ibrahim: "kareem",
    tarek_challenger: "tareq",
    bilal_focus: "radar",
    reem_ideator: "wamda",
    sami_explorer: "malik_alt",
    farah_visionary: "sarah",
    amal_guide: "layl",
    yara_minimal: "nema",
  };
  const resolvedPersonaId = aliases[personaIdValue] ?? personaIdValue;
  return personaEnvironmentProfiles[resolvedPersonaId] ?? defaultEnvironmentProfile;
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean;
  const parsed = Number.parseInt(value, 16);
  if (!Number.isFinite(parsed)) return `rgba(201, 168, 106, ${alpha})`;

  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatSanadSilence(text: string) {
  return text
    .replace(/([.!؟?])\s+/g, "$1\n\n")
    .replace(/،\s+/g, "،\n")
    .replace(/\n{3,}/g, "\n\n");
}

function resolvePersonaCadence(messageCadence: EmotionalCadence | undefined, messageWorld: WorldId, profile: PersonaEnvironmentProfile) {
  return profile.cadenceOverride ?? messageCadence ?? normalizeCadence(undefined, messageWorld);
}

function buildCustomPersona(draft: CustomPersonaDraft | null): Persona | null {
  const name = draft?.name.trim();
  const description = draft?.description.trim();
  if (!name || !description) return null;
  const coreSystemPrompt = [
    `You are ${name}, a custom FadFada companion created by the user.`,
    `The user wants this persona to look and feel like: ${description}.`,
    "Stay emotionally safe, bilingual Arabic/English, warm, non-clinical, and practical.",
    "Reflect in the user's language, adapt your tone to the custom persona description, and end with one small next step.",
  ].join("\n");

  return {
    id: "custom",
    nameAr: name,
    nameEn: name,
    primaryWorldId: "calm",
    fallbackWorldIds: ["story"],
    roleAr: "رفيق من اختيارك",
    roleEn: "Your custom companion",
    family: "listen",
    avatarPath: draft?.avatarPath || inferCustomAvatarPath(description),
    glowColorHex: "#C9A86A",
    voiceConfig: buildCustomVoiceConfig(description),
    isPremium: false,
    paddlePriceId: "",
    coreSystemPrompt,
  };
}

function resolveMessagePersona(message: ChatMessage, customPersona: Persona | null): Persona {
  if (message.personaId === "custom" && customPersona) return customPersona;
  return personas.find((persona) => persona.id === message.personaId) ?? personas.find((persona) => persona.id === "omar") ?? personas[0];
}

function buildCompanionContinuityPrompt(persona: Persona, messages: ChatMessage[], language: Language) {
  const samePersonaReplies = messages
    .filter((message) => message.role === "assistant" && message.personaId === persona.id && message.text.trim().length > 0)
    .slice(-3)
    .map((message) => message.text.replace(/\s+/g, " ").slice(0, 220));

  if (samePersonaReplies.length === 0) return "";

  const heading = language === "ar"
    ? "استمرارية الرفيق: تذكر بلطف هذه الخيوط من ردودك السابقة مع نفس المستخدم، دون أن تقول إنك تملك ذاكرة دائمة ودون إعادة سردها حرفياً."
    : "Companion continuity: gently carry these threads from your previous replies with this user, without claiming permanent memory and without repeating them verbatim.";

  return `${heading}\n${samePersonaReplies.map((reply, index) => `${index + 1}. ${reply}`).join("\n")}`;
}

function buildPersonaResponseContract(persona: Persona) {
  const contracts: Record<string, string> = {
    dr_fahad: "Intent class: Strategy & Business. Full role mode: corporate strategist. Use big-picture frameworks, market positioning, moats, long-term dominance, risks, and executive decisions. Shape: Understanding, strategic diagnosis, framework, decision recommendation, action steps.",
    nora: "Intent class: Strategy & Business. Full role mode: startup innovator. Use disruption, MVP thinking, launch loops, growth experiments, speed, and calculated risk. Shape: hypothesis, MVP, experiment, risk, next launch move.",
    khalid_investor: "Intent class: Strategy & Business. Full role mode: financial strategist. Be numbers-driven, ROI-focused, critical, and profit-aware. Shape: assumptions, economics, upside/downside, risk controls, decision.",
    lina_consultant: "Intent class: Strategy & Business. Full role mode: market expert. Clarify customers, competitors, niche, category, differentiation, and positioning. Shape: market read, positioning gap, customer language, next test.",
    kareem: "Intent class: Execution & Productivity. Full role mode: execution leader. Be direct, disciplined, delivery-oriented, and no-excuses. Shape: what matters now, action list, deadline, accountability.",
    rami_operator: "Intent class: Execution & Productivity. Full role mode: systems builder. Build processes, workflows, automation, SOPs, delegation, and efficiency loops. Shape: system map, workflow, automation, metric.",
    salma_planner: "Intent class: Execution & Productivity. Full role mode: organizer. Create structured plans, timelines, milestones, owners, dependencies, and clean next steps.",
    youssef_builder: "Intent class: Execution & Productivity. Full role mode: fast executor. Reduce overthinking. Produce the first usable draft or first action quickly with minimal theory.",
    layla_eq: "Intent class: Emotional & Personal. Full role mode: emotional intelligence coach. Be empathetic and grounded. Name emotions, patterns, boundaries, and balance without clinical claims.",
    omar: "Intent class: Emotional & Personal. Full role mode: deep listener. Reflect and validate first so the user feels heard. Ask one gentle question only when useful. Avoid generic advice.",
    hana_therapist: "Intent class: Emotional & Personal. Full role mode: personal guide. Be careful, insightful, and growth-oriented. Help with personal struggles while staying non-clinical.",
    noor_companion: "Intent class: Emotional & Personal. Full role mode: support partner. Use gentle encouragement for low energy or doubt. Reduce shame and make one small step feel possible.",
    rawi: "Intent class: Creativity & Content. Full role mode: The Poet storyteller. Be expressive, emotional, and deep. Use scenes, story, lyrical prose, or poetry. Do not become generic advice.",
    maya_creator: "Intent class: Creativity & Content. Full role mode: content strategist. Be trend-aware and bold. Generate hooks, angles, formats, captions, and engagement plays.",
    ziad_copywriter: "Intent class: Creativity & Content. Full role mode: conversion writer. Be sharp and persuasive. Produce ads, landing copy, offer framing, CTAs, and sales copy.",
    dana_designer: "Intent class: Creativity & Content. Full role mode: visual thinker. Think in UI, layout, brand, hierarchy, color, mood, visual systems, and design rationale.",
    professor_zain: "Intent class: Thinking & Analysis. Full role mode: logical thinker. Use structured reasoning, definitions, premises, tradeoffs, causal links, and clear conclusions.",
    sami: "Intent class: Thinking & Analysis. Full role mode: data thinker. Break down evidence, variables, numbers, comparisons, and assumptions. Be analytical and detailed.",
    adel_debater: "Intent class: Thinking & Analysis. Full role mode: critical challenger. Question weak assumptions, test arguments, expose contradictions, and strengthen the idea.",
    hadi_researcher: "Intent class: Thinking & Analysis. Full role mode: knowledge explorer. Be thorough and informative. Teach topics with depth, context, definitions, and research paths.",
    faisal_njm: "Intent class: Growth & Discipline. Full role mode: performance coach. Be intense and demanding. Push standards, winning mindset, and disciplined action.",
    coach_ibrahim: "Intent class: Growth & Discipline. Full role mode: habit builder. Build routines, triggers, streaks, consistency systems, recovery rules, and accountability.",
    tarek_challenger: "Intent class: Growth & Discipline. Full role mode: limit breaker. Be confrontational when the user is stuck, but useful. Challenge avoidance and force a decisive next move.",
    bilal_focus: "Intent class: Growth & Discipline. Full role mode: focus optimizer. Be minimal and sharp. Eliminate distractions, cut noise, and define the one priority.",
    malik: "Intent class: Exploration & Brainstorming. Full role mode: thinking partner. Collaborate, expand ideas, ask useful questions, connect possibilities, and shape options.",
    reem_ideator: "Intent class: Exploration & Brainstorming. Full role mode: creative generator. Produce imaginative options, non-obvious combinations, and innovation directions.",
    sami_explorer: "Intent class: Exploration & Brainstorming. Full role mode: possibility seeker. Keep thinking open when direction is unclear. Present options without premature closure.",
    farah_visionary: "Intent class: Exploration & Brainstorming. Full role mode: future thinker. Be bold, long-term, visionary, and scenario-driven. Turn dreams into a future map.",
    sarah: "Intent class: Clarity & Life Direction. Full role mode: clarity guide. Be calm and focused. Simplify overwhelm, identify the real question, and define the next decision.",
    sheikh: "Intent class: Clarity & Life Direction. Full role mode: philosophical guide. Be deep and reflective about meaning, values, patience, and life questions. Avoid religious rulings.",
    amal_guide: "Intent class: Clarity & Life Direction. Full role mode: direction advisor. Give balanced life-decision advice through values, constraints, tradeoffs, and purpose.",
    yara_minimal: "Intent class: Clarity & Life Direction. Full role mode: simplifier. Cut noise. Use less but better. Reduce complexity to the few things that matter.",
  };

  const specificContract = contracts[persona.id] ?? "Custom companion: follow the user's described personality, keep a distinct voice, and avoid generic assistant phrasing.";

  return [
    `Active companion: ${persona.nameEn} / ${persona.nameAr}.`,
    `Role: ${persona.roleEn} / ${persona.roleAr}.`,
    "Always classify the user's intent internally into one of: Strategy & Business, Execution & Productivity, Emotional & Personal, Creativity & Content, Thinking & Analysis, Growth & Discipline, Exploration & Brainstorming, Clarity & Life Direction.",
    "Respond with this structure when it fits the user's ask: Understanding, Avatar Response in full role mode, Action Steps, Optional Suggestion. Use natural headings in the user's language.",
    "Keep the user's language: Arabic in, Arabic out; English in, English out.",
    "Never act as a generic assistant. Make this companion's structure, rhythm, vocabulary, expertise, and final step visibly different from the other avatars.",
    specificContract,
  ].join("\n");
}
function inferCustomAvatarPath(description: string) {
  const loweredDescription = description.toLowerCase();
  if (/spark|energy|fire|حماس|نار|طاقة|سريع|نشط/.test(loweredDescription)) return "/profile-logos/spark.svg";
  if (/moon|night|sleep|quiet|قمر|ليل|نوم|هادئ|ناعم/.test(loweredDescription)) return "/profile-logos/moon.svg";
  if (/wave|sea|flow|calm|بحر|موج|هادي|هدوء/.test(loweredDescription)) return "/profile-logos/wave.svg";
  if (/earth|warm|ground|ترابي|دافئ|أرض/.test(loweredDescription)) return "/profile-logos/terracotta.svg";
  if (/tree|wise|elder|cedar|حكيم|كبير|شجرة|أرز/.test(loweredDescription)) return "/profile-logos/cedar.svg";
  return "/profile-logos/calm.svg";
}

function isProfileLogoPath(value: string | undefined) {
  return value === "/profile-logos/calm.svg" || value === "/profile-logos/spark.svg" || value === "/profile-logos/cedar.svg" || value === "/profile-logos/moon.svg" || value === "/profile-logos/wave.svg" || value === "/profile-logos/terracotta.svg";
}

function isGeneratedAvatarPath(value: string | undefined) {
  return Boolean(value && /^data:image\/(png|jpeg|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value) && value.length < 2_600_000);
}

function isSvgAvatarPath(value: string | undefined) {
  return Boolean(value?.endsWith(".svg"));
}

function cleanChildChoiceLabel(value: string) {
  return value
    .trim()
    .replace(/^[أابجABCabc][\)\-\.\s]+/u, "")
    .replace(/^[A-Ca-c]\)\s*/u, "")
    .trim();
}

function getChildChoiceVisual(value: string): ChildChoiceVisual {
  const label = cleanChildChoiceLabel(value);
  const normalized = label.toLowerCase();

  if (/قصر|castle|princess|أمير|امير|ملكة|ملك/.test(normalized)) return { label, kind: "castle", gradientClassName: "from-rose-200/28 via-amber-100/18 to-sky-200/20" };
  if (/غابة|forest|tree|شجر|حديقة|نبات/.test(normalized)) return { label, kind: "forest", gradientClassName: "from-emerald-200/26 via-lime-100/16 to-cyan-200/18" };
  if (/بحر|sea|ocean|water|ماء|موج|نهر/.test(normalized)) return { label, kind: "sea", gradientClassName: "from-cyan-200/28 via-sky-200/18 to-blue-300/18" };
  if (/حرف|حروف|letter|letters|كلمة|قراءة/.test(normalized)) return { label, kind: "letters", gradientClassName: "from-fuchsia-200/24 via-rose-100/18 to-amber-100/18" };
  if (/رقم|أرقام|ارقام|number|numbers|عد|حساب/.test(normalized)) return { label, kind: "numbers", gradientClassName: "from-amber-200/26 via-orange-100/16 to-emerald-100/18" };
  if (/قصة|حكاية|story|قصص|مشهد/.test(normalized)) return { label, kind: "story", gradientClassName: "from-indigo-200/24 via-sky-100/16 to-amber-100/20" };
  return { label, kind: "spark", gradientClassName: "from-[#C9A86A]/24 via-white/10 to-sky-200/14" };
}

function ChildChoicePicture({ visual }: { visual: ChildChoiceVisual }) {
  const commonPathClass = "stroke-[#0E0D10]/72";
  const shortLabel = visual.label.split(/\s+/).filter(Boolean).slice(0, 2).join(" ").slice(0, 10);

  return (
    <span className={`relative grid h-14 w-full place-items-center overflow-hidden rounded-xl bg-gradient-to-br sm:h-20 sm:rounded-2xl ${visual.gradientClassName}`} aria-hidden="true">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.5),transparent_1.8rem),radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.28),transparent_1.5rem)]" />
      {visual.kind === "castle" ? (
        <svg viewBox="0 0 96 72" className="relative h-10 w-14 drop-shadow-xl sm:h-14 sm:w-20">
          <path d="M16 62h64V31l-8 5-8-5-8 5-8-5-8 5-8-5-8 5-8-5v31Z" fill="#F7D7A7" className={commonPathClass} strokeWidth="3" strokeLinejoin="round" />
          <path d="M26 62V23l8-8 8 8v39M54 62V23l8-8 8 8v39" fill="#F3B7C8" className={commonPathClass} strokeWidth="3" strokeLinejoin="round" />
          <path d="M44 62V47a4 4 0 0 1 8 0v15" fill="#8A5A44" className={commonPathClass} strokeWidth="3" />
          <path d="M30 34h8M58 34h8" className={commonPathClass} strokeWidth="4" strokeLinecap="round" />
        </svg>
      ) : visual.kind === "forest" ? (
        <svg viewBox="0 0 96 72" className="relative h-10 w-14 drop-shadow-xl sm:h-14 sm:w-20">
          <path d="M18 60h60" className={commonPathClass} strokeWidth="4" strokeLinecap="round" />
          <path d="M30 54V31M48 58V22M66 54V34" className={commonPathClass} strokeWidth="5" strokeLinecap="round" />
          <path d="M30 13 14 42h32L30 13ZM48 6 29 45h38L48 6ZM66 18 51 44h30L66 18Z" fill="#86D98B" className={commonPathClass} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      ) : visual.kind === "sea" ? (
        <svg viewBox="0 0 96 72" className="relative h-10 w-14 drop-shadow-xl sm:h-14 sm:w-20">
          <path d="M15 44c8-8 16-8 24 0s16 8 24 0 16-8 24 0M15 57c8-8 16-8 24 0s16 8 24 0 16-8 24 0" fill="none" className={commonPathClass} strokeWidth="5" strokeLinecap="round" />
          <path d="M21 30c9-13 23-16 36-7 8 6 13 5 20 0-4 12-14 20-28 20-12 0-21-5-28-13Z" fill="#8BD7FF" className={commonPathClass} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      ) : visual.kind === "letters" ? (
        <span className="relative flex h-10 w-14 items-center justify-center gap-1 rounded-xl bg-white/72 text-xl font-bold text-[#0E0D10]/78 shadow-xl sm:h-14 sm:w-20 sm:gap-2 sm:rounded-2xl sm:text-3xl">أ B</span>
      ) : visual.kind === "numbers" ? (
        <span className="relative flex h-10 w-14 items-center justify-center gap-1 rounded-xl bg-white/72 text-xl font-bold text-[#0E0D10]/78 shadow-xl sm:h-14 sm:w-20 sm:gap-2 sm:rounded-2xl sm:text-3xl">١ 2</span>
      ) : visual.kind === "story" ? (
        <svg viewBox="0 0 96 72" className="relative h-10 w-14 drop-shadow-xl sm:h-14 sm:w-20">
          <path d="M18 16h25c5 0 9 4 9 9v35H27a9 9 0 0 1-9-9V16ZM52 25c0-5 4-9 9-9h17v35a9 9 0 0 1-9 9H52V25Z" fill="#F7F3EC" className={commonPathClass} strokeWidth="3" strokeLinejoin="round" />
          <path d="M29 30h12M29 42h11M62 30h8M62 42h7" className={commonPathClass} strokeWidth="4" strokeLinecap="round" />
        </svg>
      ) : (
        <span className="relative grid h-10 min-w-14 max-w-[5.75rem] place-items-center rounded-xl bg-white/72 px-2 text-center font-arsans text-sm font-bold leading-4 text-[#0E0D10]/78 shadow-xl sm:h-14 sm:max-w-[7rem] sm:rounded-2xl sm:text-base">
          {shortLabel || "★"}
        </span>
      )}
    </span>
  );
}

function ChildStorySceneCard({ story, language }: { story: ChildStory; language: Language }) {
  const isArabic = language === "ar";
  const storyTitle = isArabic ? story.titleAr : story.titleEn;
  const storySubtitle = isArabic ? story.subtitleAr : story.subtitleEn;
  const firstPage = isArabic ? story.pagesAr[0] : story.pagesEn[0];

  return (
    <div className="mb-4 overflow-hidden rounded-[1.4rem] border border-sky-100/18 bg-[#0E0D10] shadow-[0_22px_60px_rgba(0,0,0,0.34)]">
      <div className={`relative min-h-44 overflow-hidden bg-gradient-to-br ${story.posterClassName}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.5),transparent_2.7rem),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.22),transparent_3rem),radial-gradient(circle_at_50%_92%,rgba(14,13,16,0.42),transparent_8rem)]" />
        <div className="absolute left-5 top-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/24 bg-white/18 font-arserif text-4xl text-white shadow-2xl backdrop-blur-md">
          {story.posterGlyph}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-start">
          <p className="font-arsans text-[11px] font-semibold uppercase tracking-[0.12em] text-white/72">{isArabic ? "صورة القصة" : "story image"}</p>
          <h3 className="mt-1 font-arserif text-2xl leading-8 text-white drop-shadow-lg">{storyTitle}</h3>
          <p className="mt-1 max-w-xl font-arsans text-sm leading-6 text-white/82">{storySubtitle}</p>
        </div>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-[1fr_0.78fr]">
        <p className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 font-arsans text-sm leading-6 text-bone/72">{firstPage}</p>
        <div className="grid gap-2">
          {(isArabic ? story.tapChoicesAr : story.tapChoicesEn).slice(0, 3).map((choice) => (
            <span key={choice} className="rounded-full border border-sky-100/16 bg-sky-100/[0.055] px-3 py-2 font-arsans text-xs text-sky-50/78">{choice}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function getHomeworkActivityVisual(activity: ChildHomeworkActivity, index: number): { kind: ChildHomeworkVisual["kind"]; count: number; label: string } {
  const text = `${activity.title} ${activity.prompt} ${activity.hint}`.toLowerCase();
  const kind = activity.visual?.kind
    ?? (/نجوم|نجمة|star/.test(text) ? "stars"
      : /دوائر|دائرة|circle/.test(text) ? "circles"
        : /مثلث|triang/.test(text) ? "triangles"
          : /مربع|square|box/.test(text) ? "squares"
            : /حرف|letter|abc|أ|ب|ت/.test(text) ? "letters"
              : /عدد|رقم|number|count|عد/.test(text) ? "numbers"
                : "mixed");
  const count = typeof activity.visual?.count === "number" && Number.isFinite(activity.visual.count)
    ? Math.min(8, Math.max(2, Math.round(activity.visual.count)))
    : [5, 4, 3, 6][index % 4];
  const label = activity.visual?.label?.trim() || activity.title || activity.prompt.slice(0, 32);
  return { kind, count, label };
}

function ChildHomeworkVisualCard({
  activity,
  index,
  language,
  selectedAnswer,
  onSelectAnswer,
}: {
  activity: ChildHomeworkActivity;
  index: number;
  language: Language;
  selectedAnswer: string | null;
  onSelectAnswer: (value: string) => void;
}) {
  const visual = getHomeworkActivityVisual(activity, index);
  const isArabic = language === "ar";
  const [voiceAnswerStatus, setVoiceAnswerStatus] = useState<"idle" | "listening" | "unsupported" | "no-match">("idle");
  const shapes = Array.from({ length: visual.count }, (_, shapeIndex) => shapeIndex);
  const letterTiles = isArabic ? ["أ", "ب", "ت", "ث", "ج", "ح", "خ", "د"] : ["A", "B", "C", "D", "E", "F", "G", "H"];
  const countKinds: ChildHomeworkVisual["kind"][] = ["stars", "circles", "triangles", "squares", "numbers", "mixed"];
  const answerOptions = countKinds.includes(visual.kind)
    ? buildCountingAnswerOptions(visual.count, isArabic)
    : (activity.choices || []).slice(0, 4).map((choice) => ({ value: choice, label: choice }));
  const selectedIsCorrect = selectedAnswer ? normalizeAnswerValue(selectedAnswer) === String(visual.count) : false;

  function speakQuestion() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(prepareArabicForSpeech(`${activity.title}. ${activity.prompt}`, language, "egyptian"));
    utterance.lang = language === "ar" ? "ar-EG" : "en-US";
    utterance.rate = language === "ar" ? 0.92 : 0.96;
    window.speechSynthesis.speak(utterance);
  }

  function listenForAnswer() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = typeof window !== "undefined" ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) as (new () => ISpeechRecognition) | undefined : undefined;
    if (!SpeechRecognitionAPI) {
      setVoiceAnswerStatus("unsupported");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language === "ar" ? "ar-EG" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceAnswerStatus("listening");
    recognition.onend = () => setVoiceAnswerStatus((current) => current === "listening" ? "idle" : current);
    recognition.onerror = () => setVoiceAnswerStatus("no-match");
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      const spokenNumber = extractSpokenNumber(transcript);
      if (!spokenNumber) {
        setVoiceAnswerStatus("no-match");
        return;
      }
      onSelectAnswer(spokenNumber);
      setVoiceAnswerStatus("idle");
    };
    recognition.start();
  }

  return (
    <article className="rounded-[1.35rem] border border-amber-100/18 bg-[#0E0D10] p-3 shadow-[0_18px_42px_rgba(0,0,0,0.26)]">
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <div className="relative min-h-32 overflow-hidden rounded-[1.15rem] border border-white/12 bg-gradient-to-br from-[#FFF1B8] via-[#7DD3FC] to-[#F9A8D4] p-3">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.62),transparent_2rem),radial-gradient(circle_at_82%_24%,rgba(255,255,255,0.35),transparent_2.5rem)]" />
          <div className="relative grid h-full min-h-24 grid-cols-3 place-items-center gap-2">
            {shapes.map((shapeIndex) => {
              const tileClass = "grid h-9 w-9 place-items-center bg-white/78 font-arsans text-lg font-black text-[#0E0D10]/78 shadow-lg";
              if (visual.kind === "stars") return <span key={shapeIndex} className={`${tileClass} rounded-full text-2xl text-amber-500`}>★</span>;
              if (visual.kind === "circles") return <span key={shapeIndex} className="h-9 w-9 rounded-full border-4 border-[#0E0D10]/70 bg-white/78 shadow-lg" />;
              if (visual.kind === "triangles") return <span key={shapeIndex} className="h-0 w-0 border-x-[18px] border-b-[32px] border-x-transparent border-b-emerald-400 drop-shadow-lg" />;
              if (visual.kind === "squares") return <span key={shapeIndex} className="h-9 w-9 rounded-lg border-4 border-[#0E0D10]/70 bg-white/78 shadow-lg" />;
              if (visual.kind === "letters") return <span key={shapeIndex} className={`${tileClass} rounded-xl`}>{letterTiles[shapeIndex % letterTiles.length]}</span>;
              if (visual.kind === "numbers") return <span key={shapeIndex} className={`${tileClass} rounded-xl`}>{isArabic ? ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨"][shapeIndex] : shapeIndex + 1}</span>;
              return <span key={shapeIndex} className={`${tileClass} rounded-xl`}>{["★", "●", "▲", "■"][shapeIndex % 4]}</span>;
            })}
          </div>
        </div>
        <div className="text-start">
          <p className="font-arsans text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-100/70">{isArabic ? `سؤال ${index + 1}` : `Question ${index + 1}`}</p>
          <h3 className="mt-1 font-arsans text-base font-bold leading-6 text-bone/92">{activity.title || visual.label}</h3>
          <p className="mt-2 font-arsans text-sm leading-6 text-bone/72">{activity.prompt}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={speakQuestion} className="ui-action rounded-xl border border-cyan-100/20 bg-cyan-100/[0.07] px-2 py-2 font-arsans text-xs text-cyan-50 hover:bg-cyan-100 hover:text-[#0E0D10]">
              {isArabic ? "اسمع السؤال" : "Hear question"}
            </button>
            <button type="button" onClick={listenForAnswer} className="ui-action rounded-xl border border-emerald-100/20 bg-emerald-100/[0.07] px-2 py-2 font-arsans text-xs text-emerald-50 hover:bg-emerald-100 hover:text-[#0E0D10]">
              {voiceAnswerStatus === "listening" ? (isArabic ? "أسمعك..." : "Listening...") : isArabic ? "جاوب بصوتك" : "Answer by voice"}
            </button>
          </div>
          {voiceAnswerStatus === "unsupported" || voiceAnswerStatus === "no-match" ? <p className="mt-2 font-arsans text-[11px] text-rose-100/78">{voiceAnswerStatus === "unsupported" ? (isArabic ? "المتصفح لا يدعم إجابة الصوت هنا." : "This browser does not support voice answers here.") : (isArabic ? "لم أفهم الرقم. جرّب مرة أخرى أو اضغط الإجابة." : "I did not catch the number. Try again or tap the answer.")}</p> : null}
          {answerOptions.length ? (
            <div className="mt-3 rounded-2xl border border-amber-100/16 bg-amber-100/[0.045] p-2">
              <p className="px-1 font-arsans text-[11px] font-semibold text-amber-50/70">{isArabic ? "اختر الإجابة" : "Choose your answer"}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {answerOptions.map((option) => {
                  const active = selectedAnswer === option.value;
                  const correct = normalizeAnswerValue(option.value) === String(visual.count);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSelectAnswer(option.value)}
                      className={`min-h-10 rounded-xl border px-2 py-2 font-arsans text-sm font-bold transition-colors ${active ? correct ? "border-emerald-200/55 bg-emerald-200 text-[#0E0D10]" : "border-rose-200/55 bg-rose-200 text-[#0E0D10]" : "border-white/12 bg-[#050607] text-bone/84 hover:border-amber-100/45 hover:text-amber-50"}`}
                      aria-pressed={active}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {selectedAnswer ? <p className={`mt-2 font-arsans text-xs font-semibold ${selectedIsCorrect ? "text-emerald-100" : "text-rose-100"}`}>{selectedIsCorrect ? (isArabic ? "أحسنت! إجابة صحيحة." : "Great! Correct answer.") : (isArabic ? "قريب! عدّ الصورة مرة أخرى." : "Close! Count the picture again.")}</p> : null}
            </div>
          ) : null}
          {activity.hint ? <p className="mt-2 rounded-xl border border-cyan-100/14 bg-cyan-100/[0.055] px-3 py-2 font-arsans text-xs leading-5 text-cyan-50/76">{isArabic ? "تلميح: " : "Hint: "}{activity.hint}</p> : null}
        </div>
      </div>
    </article>
  );
}

function isHomeworkAnswerCorrect(activity: ChildHomeworkActivity, index: number, answer: string | null) {
  if (!answer) return false;
  const visual = getHomeworkActivityVisual(activity, index);
  return normalizeAnswerValue(answer) === String(visual.count);
}

function ChildHomeworkActivityCards({
  activities,
  language,
  onPlayAction,
  childProfileId,
  childNickname,
}: {
  activities: ChildHomeworkActivity[];
  language: Language;
  onPlayAction?: () => void;
  childProfileId?: string;
  childNickname?: string | null;
}) {
  const homeworkResultsStorageKey = "fadfada-child-homework-results";
  const [activeIndex, setActiveIndex] = useState(0);
  const [answersByIndex, setAnswersByIndex] = useState<Record<number, string>>({});
  const [showCompletionCelebrate, setShowCompletionCelebrate] = useState(false);
  const [closedAfterPlay, setClosedAfterPlay] = useState(false);
  const [savedResultId, setSavedResultId] = useState("");
  const [awardedBadgeLabel, setAwardedBadgeLabel] = useState("");
  const hasActivities = activities.length > 0;
  const activitiesSignature = activities.map((activity, index) => `${index}:${activity.title}|${activity.prompt}|${activity.hint}`).join("\n");
  const activeActivity = hasActivities ? activities[Math.min(activeIndex, activities.length - 1)] : null;
  const solvedCount = hasActivities
    ? activities.reduce((count, activity, index) => {
      return count + (isHomeworkAnswerCorrect(activity, index, answersByIndex[index] || null) ? 1 : 0);
    }, 0)
    : 0;
  const allSolved = hasActivities && solvedCount === activities.length;

  useEffect(() => {
    setActiveIndex(0);
    setAnswersByIndex({});
    setShowCompletionCelebrate(false);
    setClosedAfterPlay(false);
    setSavedResultId("");
    setAwardedBadgeLabel("");
  }, [activitiesSignature]);

  useEffect(() => {
    if (!allSolved || showCompletionCelebrate) return;
    setShowCompletionCelebrate(true);
  }, [allSolved, showCompletionCelebrate]);

  useEffect(() => {
    if (!allSolved || savedResultId || typeof window === "undefined") return;

    const badgeLabel = language === "ar" ? "وسام المُنجز" : "Finisher badge";
    const resultId = crypto.randomUUID();
    const record = {
      id: resultId,
      childProfileId: childProfileId || "guest-child",
      childNickname: childNickname || null,
      signature: activitiesSignature,
      completedAt: new Date().toISOString(),
      solvedCount,
      totalCount: activities.length,
      badgeLabel,
    };

    try {
      const existing = JSON.parse(window.localStorage.getItem(homeworkResultsStorageKey) || "[]") as Array<typeof record>;
      const isDuplicate = existing.some((item) => item.childProfileId === record.childProfileId && item.signature === record.signature);
      const next = isDuplicate ? existing : [...existing, record];
      window.localStorage.setItem(homeworkResultsStorageKey, JSON.stringify(next.slice(-120)));
      setSavedResultId(resultId);
      setAwardedBadgeLabel(badgeLabel);
    } catch {
      setSavedResultId(resultId);
      setAwardedBadgeLabel(badgeLabel);
    }
  }, [activities.length, activitiesSignature, allSolved, childNickname, childProfileId, language, savedResultId, solvedCount]);

  function resetHomeworkRound() {
    setAnswersByIndex({});
    setActiveIndex(0);
    setShowCompletionCelebrate(false);
  }

  if (!hasActivities || !activeActivity || closedAfterPlay) return null;

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-100/14 bg-[#050607] px-3 py-2 font-arsans text-xs text-amber-50/76">
        <span>{language === "ar" ? "تحدي مصوّر" : "Picture challenge"}</span>
        <span dir="ltr">{allSolved ? `${activities.length}/${activities.length}` : `${activeIndex + 1}/${activities.length}`}</span>
      </div>
      <ChildHomeworkVisualCard
        key={`${activeActivity.title}-${activeActivity.prompt}-${activeIndex}`}
        activity={activeActivity}
        index={activeIndex}
        language={language}
        selectedAnswer={answersByIndex[activeIndex] || null}
        onSelectAnswer={(value) => {
          const previousAnswer = answersByIndex[activeIndex] || null;
          const nowCorrect = isHomeworkAnswerCorrect(activeActivity, activeIndex, value);
          const wasCorrect = isHomeworkAnswerCorrect(activeActivity, activeIndex, previousAnswer);
          setAnswersByIndex((current) => ({ ...current, [activeIndex]: value }));

          if (!wasCorrect && nowCorrect && activeIndex < activities.length - 1) {
            window.setTimeout(() => {
              setActiveIndex((current) => (current === activeIndex ? Math.min(activities.length - 1, current + 1) : current));
            }, 450);
          }
        }}
      />
      {activities.length > 1 && !showCompletionCelebrate ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setActiveIndex((current) => Math.max(0, current - 1))} disabled={activeIndex === 0} className="ui-action rounded-xl border border-white/10 px-3 py-2 font-arsans text-xs text-bone/70 hover:border-amber-100/35 hover:text-amber-100 disabled:opacity-40">
            {language === "ar" ? "السابق" : "Previous"}
          </button>
          <button type="button" onClick={() => setActiveIndex((current) => Math.min(activities.length - 1, current + 1))} disabled={activeIndex >= activities.length - 1} className="ui-action rounded-xl border border-amber-100/28 bg-amber-100/10 px-3 py-2 font-arsans text-xs text-amber-50 hover:bg-amber-100 hover:text-[#0E0D10] disabled:opacity-40">
            {language === "ar" ? "التالي" : "Next"}
          </button>
        </div>
      ) : null}
      {showCompletionCelebrate ? (
        <div className="rounded-2xl border border-emerald-100/30 bg-emerald-100/[0.12] p-3 text-start shadow-[0_18px_44px_rgba(16,185,129,0.18)]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-100/45 bg-black/20 text-2xl">🏅</span>
            <div className="min-w-0">
              <p className="font-arsans text-sm font-bold text-emerald-50">{language === "ar" ? "أحسنت! أنهيت كل الأسئلة" : "Great job! You finished all questions"}</p>
              <p className="font-arsans text-xs text-emerald-50/80" dir="ltr">{solvedCount}/{activities.length}</p>
            </div>
          </div>
          <p className="mt-2 rounded-xl border border-emerald-100/28 bg-black/20 px-3 py-2 font-arsans text-xs text-emerald-50/84">
            {language === "ar" ? "تم حفظ النتيجة تلقائياً" : "Result saved automatically"}
            {awardedBadgeLabel ? ` • ${awardedBadgeLabel}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={resetHomeworkRound}
              className="ui-action rounded-xl border border-white/14 bg-black/20 px-3 py-2 font-arsans text-xs text-bone/84 hover:border-emerald-100/45 hover:text-emerald-50"
            >
              {language === "ar" ? "إعادة نفس التحدي" : "Replay this challenge"}
            </button>
            <button
              type="button"
              onClick={() => {
                setClosedAfterPlay(true);
                if (onPlayAction) {
                  onPlayAction();
                  return;
                }
                resetHomeworkRound();
              }}
              className="ui-action rounded-xl border border-emerald-100/32 bg-emerald-100/16 px-3 py-2 font-arsans text-xs font-semibold text-emerald-50 hover:bg-emerald-100 hover:text-[#0E0D10]"
            >
              {language === "ar" ? "ابدأ لعبة جديدة" : "Start a new game"}
            </button>
          </div>
          <p className="mt-2 font-arsans text-[11px] text-emerald-50/70">
            {language === "ar" ? "الأول يعيد نفس الأسئلة، والثاني يفتح لعبة مختلفة." : "First replays this quiz, second opens a different game."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function buildCountingAnswerOptions(count: number, isArabic: boolean) {
  const values = Array.from(new Set([Math.max(1, count - 1), count, count + 1])).slice(0, 3);
  return values.map((value) => ({ value: String(value), label: isArabic ? toArabicDigits(value) : String(value) }));
}

function normalizeAnswerValue(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[^0-9]/g, "");
}

function toArabicDigits(value: number) {
  return String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)] || digit);
}

function extractSpokenNumber(value: string) {
  const normalized = value.toLowerCase().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) return digitMatch[0];
  const words: Record<string, string> = {
    one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8",
    واحد: "1", واحدة: "1", اثنين: "2", اتنين: "2", اثنان: "2", ثلاثة: "3", ثلاثه: "3", اربعة: "4", أربعة: "4", خمسه: "5", خمسة: "5", ستة: "6", سته: "6", سبعة: "7", سبعه: "7", ثمانية: "8", ثمانيه: "8",
  };
  const token = normalized.split(/\s+/).find((part) => words[part]);
  return token ? words[token] : "";
}

function parseLegacyChildHomeworkActivities(message: ChatMessage): ChildHomeworkActivity[] {
  if (message.role !== "assistant" || message.world !== "learning" || !childPersonaIdSet.has(message.personaId || "")) return [];
  if (!/(?:^|\n)\s*(?:\d+|[٠-٩]+)[\.)]\s+/.test(message.text) || !/(تلميح|hint)\s*:/i.test(message.text)) return [];

  const activities: ChildHomeworkActivity[] = [];
  const questionPattern = /(?:^|\n)\s*(?:\d+|[٠-٩]+)[\.)]\s+([\s\S]*?)(?=(?:\n\s*(?:\d+|[٠-٩]+)[\.)]\s+)|$)/g;
  for (const match of message.text.matchAll(questionPattern)) {
    const block = match[1]?.trim();
    if (!block) continue;
    const [promptPart, hintPart = ""] = block.split(/\n\s*(?:تلميح|hint)\s*:/i);
    const prompt = promptPart.trim();
    const hint = hintPart.trim();
    if (!prompt) continue;
    activities.push({
      type: "quiz",
      title: buildLegacyHomeworkTitle(prompt, message.language || "ar"),
      prompt,
      hint,
    });
  }

  return activities.slice(0, 5);
}

function buildLegacyHomeworkTitle(prompt: string, language: Language) {
  const text = prompt.toLowerCase();
  if (/نجوم|نجمة|star/.test(text)) return language === "ar" ? "كم نجمة؟" : "How many stars?";
  if (/دوائر|دائرة|circle/.test(text)) return language === "ar" ? "كم دائرة؟" : "How many circles?";
  if (/مثلث|triang/.test(text)) return language === "ar" ? "كم مثلثاً؟" : "How many triangles?";
  if (/مربع|square/.test(text)) return language === "ar" ? "كم مربعاً؟" : "How many squares?";
  return prompt.split(/\s+/).slice(0, 4).join(" ");
}

function getLegacyHomeworkIntroText(text: string, language: Language) {
  const intro = text.split(/\n\s*(?:\d+|[٠-٩]+)[\.)]\s+/)[0]?.trim();
  return intro || (language === "ar" ? "هيا نحل الواجب خطوة خطوة." : "Let’s solve the homework step by step.");
}

function isAllowedCustomAvatarPath(value: string | undefined) {
  return isProfileLogoPath(value) || isGeneratedAvatarPath(value);
}

function buildCustomVoiceConfig(description: string): PersonaVoiceConfig {
  const loweredDescription = description.toLowerCase();
  const energetic = /energetic|fast|حماس|سريع|نشط/.test(loweredDescription);
  const calm = /calm|soft|هادئ|ناعم|حنون/.test(loweredDescription);
  const wise = /wise|elder|حكيم|هادئ|كبير/.test(loweredDescription);

  return {
    locale: wise ? "ar-SA" : "ar-EG",
    rate: energetic ? 1.08 : calm || wise ? 0.88 : 0.96,
    pitch: wise ? 0.78 : energetic ? 1.02 : 0.92,
  };
}

function getSpeechLocale(language: Language, voiceConfig: PersonaVoiceConfig) {
  if (language === "en") return "en-US";
  return voiceConfig.locale.startsWith("ar") ? voiceConfig.locale : "ar-EG";
}

function getDialectLocalePreferences(language: Language, voiceConfig: PersonaVoiceConfig) {
  if (language === "en") return ["en-US", "en-GB", "en"];

  const locale = voiceConfig.locale.toLowerCase();
  if (locale.includes("ar-eg")) return ["ar-EG", "ar"];
  if (locale.includes("ar-ae")) return ["ar-AE", "ar-SA", "ar-KW", "ar-QA", "ar-BH", "ar"];
  if (locale.includes("ar-lb")) return ["ar-LB", "ar-JO", "ar-SY", "ar-PS", "ar"];
  if (locale.includes("ar-sa")) return ["ar-SA", "ar", "ar-EG"];
  return [getSpeechLocale(language, voiceConfig), "ar"];
}

function getDialectNameHints(language: Language, voiceConfig: PersonaVoiceConfig) {
  if (language === "en") return ["english", "united states", "us"];

  const locale = voiceConfig.locale.toLowerCase();
  if (locale.includes("ar-eg")) return ["egypt", "egyptian", "مصر", "ar-eg"];
  if (locale.includes("ar-ae")) return ["saudi", "gulf", "kuwait", "emirates", "uae", "arabia", "ar-sa", "ar-ae"];
  if (locale.includes("ar-lb")) return ["leban", "jordan", "levant", "syria", "ar-lb", "ar-jo"];
  if (locale.includes("ar-sa")) return ["saudi", "arabic", "ar-sa"];
  return ["arabic"];
}

function getArabicSpeechDialect(voiceConfig: PersonaVoiceConfig) {
  const locale = voiceConfig.locale.toLowerCase();
  if (locale.includes("ar-eg")) return "egyptian";
  if (locale.includes("ar-ae")) return "gulf";
  if (locale.includes("ar-lb")) return "levantine";
  if (locale.includes("ar-sa")) return "fusha";
  return "fusha";
}

function getPreferredVoiceConfig(voiceConfig: PersonaVoiceConfig): PersonaVoiceConfig {
  if (typeof window === "undefined") return voiceConfig;

  const preferredLocale = window.localStorage.getItem(voiceDialectStorageKey);
  if (!preferredLocale || !["ar-EG", "ar-SA", "ar-AE", "ar-LB"].includes(preferredLocale)) return voiceConfig;

  return { ...voiceConfig, locale: preferredLocale };
}

function selectSpeechVoice(language: Language, voiceConfig: PersonaVoiceConfig) {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;

  const localePreferences = getDialectLocalePreferences(language, voiceConfig).map((locale) => locale.toLowerCase());
  const nameHints = getDialectNameHints(language, voiceConfig);
  const exact = localePreferences
    .filter((locale) => locale.includes("-"))
    .map((locale) => voices.find((voice) => voice.lang.toLowerCase() === locale))
    .find(Boolean);
  const named = voices.find((voice) => {
    const voiceText = `${voice.name} ${voice.lang}`.toLowerCase();
    return nameHints.some((hint) => voiceText.includes(hint));
  });
  const sameLanguage = voices.find((voice) => voice.lang.toLowerCase().startsWith(localePreferences[0].split("-")[0]));
  return exact ?? named ?? sameLanguage;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) throw new Error("Clipboard copy failed");
  } finally {
    textArea.remove();
  }
}

export function ChatWindow() {
  const { data: session, status: authStatus } = useSession();
  const [world, setWorld] = useState<WorldId>("calm");
  const { language, setLanguage } = useAppLocale();
  const [personaId, setPersonaId] = useState<PersonaId>("omar");
  const [personaOpen, setPersonaOpen] = useState(false);
  const [personaDrawerMode, setPersonaDrawerMode] = useState<"avatars" | "stories">("avatars");
  const [storyShelfSignal, setStoryShelfSignal] = useState(0);
  const [input, setInput] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorNameDraft, setVisitorNameDraft] = useState("");
  const [visitorNameStatus, setVisitorNameStatus] = useState<"idle" | "saved" | "error">("idle");
  const [nameGateMessage, setNameGateMessage] = useState(false);
  const [userId, setUserId] = useState("local-demo-user");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "opening",
      role: "assistant",
      text: "...",
      world: "calm",
      language: "ar",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceCaptureStatus, setVoiceCaptureStatus] = useState<"idle" | "unsupported" | "permission" | "no-speech" | "error">("idle");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "error" | "paused">("idle");
  const [behaviorStyle, setBehaviorStyle] = useState<BehaviorStyle>("signature");
  const [softerNext, setSofterNext] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [appShareLoading, setAppShareLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [plusWelcomeOpen, setPlusWelcomeOpen] = useState(false);
  const [visitorShowcaseOpen, setVisitorShowcaseOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyboardGalleryOpen, setStoryboardGalleryOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeHomePanel, setActiveHomePanel] = useState<HomeToolPanel>("checkin");
  const [conversationHydrated, setConversationHydrated] = useState(false);
  const [dailyMomentDateKey, setDailyMomentDateKey] = useState<string | undefined>(undefined);
  const [journeySnapshotStatus, setJourneySnapshotStatus] = useState<"idle" | "saved">("idle");
  const [growthQuestStatus, setGrowthQuestStatus] = useState<"idle" | "saved">("idle");
  const [growthQuests, setGrowthQuests] = useState<GrowthQuest[]>([]);
  const [visitorComment, setVisitorComment] = useState("");
  const [visitorCommentStatus, setVisitorCommentStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedMomentIds, setSavedMomentIds] = useState<string[]>([]);
  const [feedbackMomentIds, setFeedbackMomentIds] = useState<string[]>([]);
  const [activeAvatarRatings, setActiveAvatarRatings] = useState<Record<string, number>>({});
  const [activeAvatarRatingStatus, setActiveAvatarRatingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dailyPulse, setDailyPulse] = useState<DailyPulseState>({ mood: "steady", energy: "okay", need: "calm" });
  const [dailyPulseStats, setDailyPulseStats] = useState<DailyPulseStats>({ count: 0, streak: 0, lastDate: null });
  const [customPersonaDraft, setCustomPersonaDraft] = useState<CustomPersonaDraft | null>(null);
  const [trialCounter, setTrialCounter] = useState(0);
  const [activeChatSessionId, setActiveChatSessionId] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "saving" | "saved" | "loading" | "error">("idle");
  const [hydratedConversationScope, setHydratedConversationScope] = useState("");
  const [animatedAssistantMessageIds, setAnimatedAssistantMessageIds] = useState<string[]>([]);
  const [accountTokenBalance, setAccountTokenBalance] = useState<number | null>(null);
  const [accountActiveTier, setAccountActiveTier] = useState<string | null>(null);
  const [grantedPersonaIds, setGrantedPersonaIds] = useState<PersonaId[]>([]);
  const [experienceConfiguration, setExperienceConfiguration] = useState(defaultExperienceConfiguration);
  const [activeDiscountCode, setActiveDiscountCode] = useState("");
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineDraftSaved, setOfflineDraftSaved] = useState(false);
  const [childRewardToast, setChildRewardToast] = useState<{ id: string; text: string } | null>(null);
  const [childHomeworkAssignments, setChildHomeworkAssignments] = useState<ChildHomeworkAssignment[]>([]);
  const [childHomeworkStatus, setChildHomeworkStatus] = useState<"idle" | "loading" | "error">("idle");
  const [childHomeworkDrawerOpen, setChildHomeworkDrawerOpen] = useState(false);
  const [childHomeworkTab, setChildHomeworkTab] = useState<"pending" | "completed">("pending");
  const [childMomentSlideIndex, setChildMomentSlideIndex] = useState(0);
  const [childHomeworkSlideIndex, setChildHomeworkSlideIndex] = useState(0);
  const [breathingOpen, setBreathingOpen] = useState(false);
  const recorderRef = useRef<ISpeechRecognition | null>(null);
  const keepRecordingRef = useRef(false);
  const recordingRestartCountRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const homeRef = useRef<HTMLElement | null>(null);
  const chatRef = useRef<HTMLElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const pendingVisitorChallengeFocusRef = useRef<"composer" | "name" | null>(null);
  const pendingReplyFocusRef = useRef(false);

  const activeWorld = worlds[world];
  const sessionUser = session?.user as ({ id?: string; activeTier?: string; tokenBalance?: number } & Record<string, unknown>) | undefined;
  const sessionReady = authStatus !== "loading";
  const isChildWorkspace = sessionUser?.workspaceMode === "child";
  const activeChildProfileId = isChildWorkspace && typeof sessionUser?.childProfileId === "string" ? sessionUser.childProfileId : "";
  const activeChildNickname = isChildWorkspace && typeof sessionUser?.childNickname === "string" ? normalizeGreetingName(sessionUser.childNickname) : null;
  const dailyChildMoment = useMemo(() => buildDailyChildMoment(language, activeChildProfileId, activeChildNickname, dailyMomentDateKey), [activeChildProfileId, activeChildNickname, language, dailyMomentDateKey]);
  const conversationScopeKey = activeChildProfileId ? `child:${activeChildProfileId}` : "parent";
  const scopedConversationStorageKey = `${conversationStorageKey}:${conversationScopeKey}`;
  const scopedChatSessionIdStorageKey = `${chatSessionIdStorageKey}:${conversationScopeKey}`;
  const scopedPersonaStorageKey = `${personaStorageKey}:${conversationScopeKey}`;
  const customPersona = useMemo(() => buildCustomPersona(customPersonaDraft), [customPersonaDraft]);
  const blockedPersonaIds = experienceConfiguration.blockedPersonaIds ?? [];
  const blockedPersonaIdSet = useMemo(() => new Set(blockedPersonaIds), [blockedPersonaIds]);
  const allAvailablePersonas = useMemo(() => personas.filter((persona) => !blockedPersonaIdSet.has(persona.id)), [blockedPersonaIdSet]);
  const childAvailablePersonas = useMemo(() => allAvailablePersonas.filter((persona) => childPersonaIdSet.has(persona.id)), [allAvailablePersonas]);
  const globallyAvailablePersonas = useMemo(() => allAvailablePersonas.filter((persona) => !childPersonaIdSet.has(persona.id)), [allAvailablePersonas]);
  const visiblePersonas = isChildWorkspace ? childAvailablePersonas : globallyAvailablePersonas;
  const fallbackPersona = visiblePersonas[0] ?? allAvailablePersonas[0] ?? personas[0];
  const activePersona = useMemo(() => {
    if (!isChildWorkspace && personaId === "custom" && customPersona) return customPersona;
    return visiblePersonas.find((persona) => persona.id === personaId) ?? fallbackPersona;
  }, [customPersona, fallbackPersona, isChildWorkspace, personaId, visiblePersonas]);
  const activeHeaderPresentation = getHeaderAvatarPresentation(activePersona);
  const personaAura = activeHeaderPresentation.auraHex;
  const activePersonaDisplayName = getHeaderDisplayName(activePersona, language);
  const personaEnvironment = getPersonaEnvironmentProfile(activePersona.id);
  const activePersonaIsChild = childPersonaIdSet.has(activePersona.id);
  const activeBehavior = behaviorStyles[behaviorStyle];
  const conversationContinuity = useMemo(() => buildConversationContinuity(messages, language), [messages, language]);
  const latestAssistantMessage = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant" && message.id !== "opening"), [messages]);
  const latestChildAssistantMessage = useMemo(() => {
    if (!isChildWorkspace || !activePersonaIsChild) return undefined;
    return [...messages].reverse().find((message) => message.role === "assistant" && childPersonaIdSet.has(message.personaId || "") && message.suggestions?.length);
  }, [activePersonaIsChild, isChildWorkspace, messages]);
  const childSuggestionChips = isChildWorkspace && activePersonaIsChild ? latestChildAssistantMessage?.suggestions?.slice(0, 3) ?? [] : [];
  const latestUserMessage = useMemo(() => [...messages].reverse().find((message) => message.role === "user"), [messages]);
  const childMomentSlides = useMemo(() => ([
    {
      id: "learn" as const,
      icon: "sparkles",
      emoji: "📘",
      title: language === "ar" ? "تعلّم" : "Learn",
      item: dailyChildMoment.learn,
      cardClassName: "border-amber-100/30 bg-gradient-to-br from-amber-100/20 to-amber-200/8 text-amber-50",
    },
    {
      id: "feel" as const,
      icon: "favorite",
      emoji: "☁️",
      title: language === "ar" ? "شعوري" : "Feel",
      item: dailyChildMoment.feel,
      cardClassName: "border-rose-100/28 bg-gradient-to-br from-rose-100/18 to-pink-200/8 text-rose-50",
    },
    {
      id: "connect" as const,
      icon: "diversity_1",
      emoji: "🤝",
      title: language === "ar" ? "اتصال" : "Connect",
      item: dailyChildMoment.connect,
      cardClassName: "border-emerald-100/30 bg-gradient-to-br from-emerald-100/18 to-cyan-200/8 text-emerald-50",
    },
  ]), [dailyChildMoment, language]);
  const activeChildMomentSlide = childMomentSlides[childMomentSlideIndex % childMomentSlides.length];
  const pendingChildHomeworkAssignments = useMemo(
    () => childHomeworkAssignments.filter((assignment) => !assignment.missionCompleted),
    [childHomeworkAssignments]
  );
  const completedChildHomeworkAssignments = useMemo(
    () => childHomeworkAssignments.filter((assignment) => assignment.missionCompleted),
    [childHomeworkAssignments]
  );
  const childHomeworkSlides = useMemo(() => {
    const source = pendingChildHomeworkAssignments.length > 0 ? pendingChildHomeworkAssignments : childHomeworkAssignments;
    return source.slice(0, 10);
  }, [childHomeworkAssignments, pendingChildHomeworkAssignments]);
  const activeChildHomeworkSlide = childHomeworkSlides[childHomeworkSlideIndex % Math.max(childHomeworkSlides.length, 1)];
  const storyboardGallerySourceMessage = useMemo<ChatMessage>(() => latestAssistantMessage ?? {
    id: "storyboard-gallery-demo",
    role: "assistant",
    text: language === "ar"
      ? "شعور مضغوط يتحول إلى مشهد رمزي: مساحة هادئة، ضباب خفيف، ونافذة ضوء تقود إلى خطوة صغيرة واضحة."
      : "A pressured feeling becomes a symbolic scene: a quiet room, light fog, and a window of light leading toward one small clear step.",
    world: "story",
    language,
    cadence: normalizeCadence("steady_calm", "story"),
    personaId: "rawi",
    personaName: language === "ar" ? "راوية" : "Rawiya",
    avatarPath: "/avatars/rawi.png",
  }, [language, latestAssistantMessage]);
  const storyboardGalleryShots = useMemo(
    () => buildStoryMirrorBoard(storyboardGallerySourceMessage, latestUserMessage, storyboardGallerySourceMessage.personaName || activePersonaDisplayName, language),
    [activePersonaDisplayName, language, latestUserMessage, storyboardGallerySourceMessage]
  );
  const greetingName = useMemo(() => normalizeGreetingName(session?.user?.name || session?.user?.email), [session?.user?.email, session?.user?.name]);
  const visitorDisplayName = useMemo(() => normalizeGreetingName(visitorName), [visitorName]);
  const effectiveUserName = greetingName ?? visitorDisplayName;
  const accountName = session?.user?.name || session?.user?.email || effectiveUserName || (language === "ar" ? "حسابي" : "Account");
  const accountImage = session?.user?.image || null;
  const effectiveAccountTier = accountActiveTier ?? sessionUser?.activeTier ?? null;
  const accessState: AccessState = effectiveAccountTier === "PLUS" || effectiveAccountTier === "BUSINESS" ? "plus" : sessionUser?.id ? "signed" : "anonymous";
  const { anonymousReflectionLimit, signedGiftReflectionLimit, anonymousPersonaLimit, signedPersonaLimit, avatarsEnabled, anonymousPersonaIds, signedPersonaIds, plusPersonaIds } = experienceConfiguration;
  const signedReflectionAllowance = Math.max(signedGiftReflectionLimit, accountTokenBalance ?? sessionUser?.tokenBalance ?? signedGiftReflectionLimit);
  const reflectionLimit = accessState === "anonymous" ? anonymousReflectionLimit : accessState === "signed" ? signedReflectionAllowance : Number.POSITIVE_INFINITY;
  const usedReflections = accessState === "plus" ? 0 : trialCounter;
  const remainingReflections = accessState === "plus" ? Number.POSITIVE_INFINITY : Math.max(0, reflectionLimit - usedReflections);
  const unlockedPersonaIds = useMemo<PersonaId[]>(() => {
    if (isChildWorkspace) return childAvailablePersonas.map((persona) => persona.id);
    const tierPersonaIds = accessState === "plus" ? plusPersonaIds : accessState === "signed" ? signedPersonaIds : anonymousPersonaIds;
    const tierPersonaIdSet = new Set(tierPersonaIds);
    const allowedTierPersonaIds = globallyAvailablePersonas.map((persona) => persona.id).filter((personaIdValue) => tierPersonaIdSet.has(personaIdValue));
    if (accessState === "anonymous") return Array.from(new Set(allowedTierPersonaIds));
    const globallyAvailablePersonaIdSet = new Set(globallyAvailablePersonas.map((persona) => persona.id));
    const grantedAvailablePersonaIds = grantedPersonaIds.filter((personaIdValue) => globallyAvailablePersonaIdSet.has(personaIdValue));
    return Array.from(new Set([...allowedTierPersonaIds, ...grantedAvailablePersonaIds]));
  }, [accessState, anonymousPersonaIds, blockedPersonaIdSet, childAvailablePersonas, globallyAvailablePersonas, grantedPersonaIds, isChildWorkspace, plusPersonaIds, signedPersonaIds]);

  useEffect(() => {
    if (!avatarsEnabled) setPersonaOpen(false);
  }, [avatarsEnabled]);

  useEffect(() => {
    if (childMomentSlideIndex >= childMomentSlides.length) {
      setChildMomentSlideIndex(0);
    }
  }, [childMomentSlideIndex, childMomentSlides.length]);

  useEffect(() => {
    if (childHomeworkSlideIndex >= Math.max(childHomeworkSlides.length, 1)) {
      setChildHomeworkSlideIndex(0);
    }
  }, [childHomeworkSlideIndex, childHomeworkSlides.length]);

  useEffect(() => {
    if (!isChildWorkspace || childMomentSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setChildMomentSlideIndex((current) => (current + 1) % childMomentSlides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isChildWorkspace, childMomentSlides.length]);

  useEffect(() => {
    if (!isChildWorkspace || childHomeworkSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setChildHomeworkSlideIndex((current) => (current + 1) % childHomeworkSlides.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [isChildWorkspace, childHomeworkSlides.length]);

  useEffect(() => {
    if (pendingChildHomeworkAssignments.length === 0 && completedChildHomeworkAssignments.length > 0) {
      setChildHomeworkTab("completed");
      return;
    }
    if (pendingChildHomeworkAssignments.length > 0) {
      setChildHomeworkTab("pending");
    }
  }, [completedChildHomeworkAssignments.length, pendingChildHomeworkAssignments.length]);

  useEffect(() => {
    // Set daily moment date after hydration to avoid server/client mismatch
    setDailyMomentDateKey(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (personaId !== "custom" && !visiblePersonas.some((persona) => persona.id === personaId)) {
      setPersonaId(fallbackPersona.id);
    }
  }, [fallbackPersona.id, personaId, visiblePersonas]);

  useEffect(() => {
    if (personaId === "custom" || unlockedPersonaIds.includes(personaId)) return;
    setPersonaId(unlockedPersonaIds[0] ?? fallbackPersona.id);
  }, [fallbackPersona.id, personaId, unlockedPersonaIds]);

  useEffect(() => {
    if (authStatus === "loading") return;

    const storedPersonaId = localStorage.getItem(scopedPersonaStorageKey) as PersonaId | null;
    const scopedPersona = storedPersonaId && visiblePersonas.some((persona) => persona.id === storedPersonaId) && (isChildWorkspace || !childPersonaIdSet.has(storedPersonaId)) ? storedPersonaId : null;
    const parentDefaultPersona = visiblePersonas.find((persona) => persona.id === "omar")?.id ?? fallbackPersona.id;
    const nextPersonaId = scopedPersona ?? (isChildWorkspace ? fallbackPersona.id : parentDefaultPersona);

    setPersonaId(nextPersonaId);
    window.setTimeout(() => focusConversationTail("auto"), 80);
  }, [authStatus, conversationScopeKey, fallbackPersona.id, isChildWorkspace, scopedPersonaStorageKey, visiblePersonas]);

  function getUsedCredits() {
    const parsedCredits = Number(localStorage.getItem(getCreditStorageKey()) || "0");
    return Number.isFinite(parsedCredits) ? parsedCredits : 0;
  }

  function useOneCredit() {
    const nextCredits = getUsedCredits() + 1;
    localStorage.setItem(getCreditStorageKey(), String(nextCredits));
    setTrialCounter(nextCredits);
    return nextCredits;
  }

  function getCreditStorageKey() {
    return accessState === "signed" && sessionUser?.id ? `${localCreditStorageKey}:${sessionUser.id}` : localCreditStorageKey;
  }

  function buildOpeningChatMessageForPersona(openingPersona: Persona): ChatMessage {
    const openingWorld = isChildWorkspace && openingPersona.primaryWorldId in worlds ? openingPersona.primaryWorldId as WorldId : "calm";

    return {
      id: "opening",
      role: "assistant",
      text: isChildWorkspace ? buildChildOpeningMessage(language, activeChildNickname) : buildOpeningMessage(language, effectiveUserName),
      world: openingWorld,
      language,
      personaId: openingPersona.id,
      personaName: language === "ar" ? openingPersona.nameAr : openingPersona.nameEn,
      avatarPath: openingPersona.avatarPath,
    };
  }

  function buildCurrentOpeningChatMessage(): ChatMessage {
    const openingPersona = isChildWorkspace ? (activePersonaIsChild ? activePersona : fallbackPersona) : personas.find((persona) => persona.id === "omar") ?? fallbackPersona;
    return buildOpeningChatMessageForPersona(openingPersona);
  }

  function submitStarterMoment(text: string, nextWorld: WorldId) {
    setWorld(nextWorld);
    trackInteraction("starter_tap", { world: nextWorld, language });
    void submitMessage(undefined, text, nextWorld);
  }

  function submitVisitorChallenge(text: string, nextWorld: WorldId, nextPersonaId: PersonaId) {
    const nextPersona = globallyAvailablePersonas.find((persona) => persona.id === nextPersonaId && unlockedPersonaIds.includes(persona.id))
      ?? globallyAvailablePersonas.find((persona) => persona.id === unlockedPersonaIds[0])
      ?? activePersona;
    const hasDisplayName = Boolean(effectiveUserName ?? normalizeGreetingName(visitorNameDraft));
    setPersonaId(nextPersona.id);
    setWorld(nextWorld);
    setToolsOpen(false);
    pendingVisitorChallengeFocusRef.current = hasDisplayName ? "composer" : "name";
    trackInteraction("starter_tap", { type: "visitor_challenge", world: nextWorld, language, personaId: nextPersona.id });
    void submitMessage(undefined, text, nextWorld, nextPersona);
  }

  function submitConsultantScenario(text: string, nextWorld: WorldId, nextPersonaId: PersonaId, consultantBadge: string) {
    const nextPersona = globallyAvailablePersonas.find((persona) => persona.id === nextPersonaId && unlockedPersonaIds.includes(persona.id))
      ?? globallyAvailablePersonas.find((persona) => persona.id === unlockedPersonaIds[0])
      ?? activePersona;
    const hasDisplayName = Boolean(effectiveUserName ?? normalizeGreetingName(visitorNameDraft));
    setPersonaId(nextPersona.id);
    setWorld(nextWorld);
    setToolsOpen(false);
    pendingVisitorChallengeFocusRef.current = hasDisplayName ? "composer" : "name";
    trackInteraction("starter_tap", { type: "consultant_hub", consultant: consultantBadge, world: nextWorld, language, personaId: nextPersona.id });
    void submitMessage(undefined, text, nextWorld, nextPersona);
  }

  function submitLifeProjectTemplate(text: string, nextWorld: WorldId, nextPersonaId: PersonaId, projectBadge: string) {
    const nextPersona = globallyAvailablePersonas.find((persona) => persona.id === nextPersonaId && unlockedPersonaIds.includes(persona.id))
      ?? globallyAvailablePersonas.find((persona) => persona.id === unlockedPersonaIds[0])
      ?? activePersona;
    const hasDisplayName = Boolean(effectiveUserName ?? normalizeGreetingName(visitorNameDraft));
    setPersonaId(nextPersona.id);
    setWorld(nextWorld);
    setToolsOpen(false);
    pendingVisitorChallengeFocusRef.current = hasDisplayName ? "composer" : "name";
    trackInteraction("starter_tap", { type: "life_project", project: projectBadge, world: nextWorld, language, personaId: nextPersona.id });
    void submitMessage(undefined, text, nextWorld, nextPersona);
  }

  function submitClientGeminiStoryDemo() {
    const storyPersona = globallyAvailablePersonas.find((persona) => persona.id === "rawi" && unlockedPersonaIds.includes(persona.id))
      ?? globallyAvailablePersonas.find((persona) => persona.id === unlockedPersonaIds[0])
      ?? activePersona;
    const text = language === "ar"
      ? "حوّل شعوري إلى لوحة مشاهد بصرية قابلة لتوليد الصور: شخص يدخل مساحة هادئة بعد يوم ضغط، يرى الفوضى كضباب خفيف، ثم يجد خطوة صغيرة نحو ضوء واضح. أعطني 3 مشاهد قصيرة، ولكل مشهد برومبت صورة سينمائية آمن بدون نص داخل الصورة."
      : "Turn my feeling into a visual storyboard ready for image generation: a person enters a calm space after a pressured day, sees the noise as light fog, then finds one small step toward clear light. Give me 3 short scenes, each with a safe cinematic image prompt and no text inside the image.";
    setPersonaId(storyPersona.id);
    setWorld("story");
    setToolsOpen(false);
    trackInteraction("starter_tap", { type: "client_gemini_studio", capability: "image_storyboard", world: "story", language, personaId: storyPersona.id });
    void submitMessage(undefined, text, "story", storyPersona);
  }

  function submitClientGeminiContentPack() {
    const launchProject = lifeProjectTemplates[language].find((template) => template.badge === "Launch") ?? lifeProjectTemplates[language][lifeProjectTemplates[language].length - 1];
    submitLifeProjectTemplate(launchProject.text, launchProject.world, launchProject.personaId, launchProject.badge);
  }

  function submitJudgeScenario(text: string, nextWorld: WorldId, targetLanguage: Language, nextPersonaId: PersonaId) {
    const nextPersona = globallyAvailablePersonas.find((persona) => persona.id === nextPersonaId && unlockedPersonaIds.includes(persona.id))
      ?? globallyAvailablePersonas.find((persona) => persona.id === unlockedPersonaIds[0])
      ?? activePersona;
    setPersonaId(nextPersona.id);
    setLanguage(targetLanguage);
    setWorld(nextWorld);
    setToolsOpen(false);
    trackInteraction("starter_tap", { type: "judge_demo", world: nextWorld, language: targetLanguage, personaId: nextPersona.id });
    scrollToSection("chat");
    void submitMessage(undefined, text, nextWorld, nextPersona);
  }

  function submitDailyPulse() {
    const today = dailyMomentDateKey || new Date().toISOString().slice(0, 10);
    const nextStats = buildNextDailyPulseStats(dailyPulseStats, today);
    localStorage.setItem(dailyPulseStorageKey, JSON.stringify(nextStats));
    setDailyPulseStats(nextStats);

    const nextWorld = dailyPulse.need === "plan" ? "build" : dailyPulse.need === "learn" ? "learning" : dailyPulse.need === "comfort" ? "faith" : "calm";
    const moodLabel = dailyPulseOptions.mood[dailyPulse.mood][language];
    const energyLabel = dailyPulseOptions.energy[dailyPulse.energy][language];
    const needLabel = dailyPulseOptions.need[dailyPulse.need][language];
    const prompt =
      language === "ar"
        ? `تسجيل يومي: مزاجي ${moodLabel}، طاقتي ${energyLabel}، واحتياجي الآن ${needLabel}. ساعدني أفهم حالتي بدون تشخيص، ثم أعطني خطوة واحدة صغيرة لهذا اليوم.`
        : `Daily check-in: my mood is ${moodLabel}, my energy is ${energyLabel}, and what I need now is ${needLabel}. Help me understand my state without diagnosis, then give me one small step for today.`;

    setWorld(nextWorld);
    trackInteraction("starter_tap", { type: "daily_pulse", world: nextWorld, language, streak: nextStats.streak });
    scrollToSection("chat");
    void submitMessage(undefined, prompt, nextWorld);
  }

  function focusInput() {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openStoryShelf() {
    if (!avatarsEnabled) return;
    setVisitorShowcaseOpen(false);
    setToolsOpen(false);
    setPersonaDrawerMode("stories");
    setPersonaOpen(true);
    setStoryShelfSignal((current) => current + 1);
    void trackInteraction("starter_tap", { type: "child_stories_open", language });
  }

  function openAvatarDrawer() {
    if (!avatarsEnabled) return;
    setVisitorShowcaseOpen(false);
    setToolsOpen(false);
    setPersonaDrawerMode("avatars");
    setPersonaOpen(true);
  }

  function focusVisitorChallengeChat() {
    const target = pendingVisitorChallengeFocusRef.current;
    if (!target) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });

        if (target === "composer") {
          inputRef.current?.focus({ preventScroll: true });
        } else {
          nameInputRef.current?.focus({ preventScroll: true });
        }

        pendingVisitorChallengeFocusRef.current = null;
      });
    });
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    void submitMessage();
  }

  async function stageSecretCommand(command: string) {
    setToolsOpen(false);
    await runSecretCommand(command);
    trackInteraction("starter_tap", { type: "secret_command_hint", command, language });
  }

  function updateInput(value: string) {
    setInput(value);
    if (typeof window === "undefined") return;
    if (isOffline && value.trim()) {
      localStorage.setItem(offlineDraftStorageKey, value);
      setOfflineDraftSaved(true);
      return;
    }
    if (!value.trim()) {
      localStorage.removeItem(offlineDraftStorageKey);
      setOfflineDraftSaved(false);
    }
  }

  function registerVisitorName(cleanedName: string) {
    localStorage.setItem(visitorNameStorageKey, cleanedName);
    setVisitorName(cleanedName);
    setVisitorNameDraft(cleanedName);
    setVisitorNameStatus("saved");
    setNameGateMessage(false);
    void trackInteraction("visitor_name_register", {
      name: cleanedName,
      language,
      device: getClientDeviceType(),
      browser: getClientBrowserName(),
    });
  }

  function saveVisitorName() {
    const cleanedName = normalizeGreetingName(visitorNameDraft);
    if (!cleanedName) {
      setVisitorNameStatus("error");
      setNameGateMessage(true);
      window.setTimeout(() => nameInputRef.current?.focus(), 40);
      return false;
    }

    registerVisitorName(cleanedName);
    if (avatarsEnabled) {
      window.setTimeout(() => setPersonaOpen(true), 120);
    } else {
      window.setTimeout(focusInput, 80);
    }
    return true;
  }

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0].id !== "opening") return current;
      return [buildCurrentOpeningChatMessage()];
    });
  }, [activeChildNickname, effectiveUserName, fallbackPersona.id, isChildWorkspace, language]);

  useEffect(() => {
    focusVisitorChallengeChat();
  }, [messages.length, nameGateMessage]);

  useEffect(() => {
    if (!pendingReplyFocusRef.current) return;

    focusConversationTail(isThinking ? "auto" : "smooth");
    if (isThinking) return;

    const timeout = window.setTimeout(() => {
      focusConversationTail("smooth");
      pendingReplyFocusRef.current = false;
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [isThinking, messages.length]);

  useEffect(() => {
    const storedName = normalizeGreetingName(localStorage.getItem(visitorNameStorageKey));
    if (!storedName) return;
    setVisitorName(storedName);
    setVisitorNameDraft(storedName);
  }, []);

  useEffect(() => {
    if (!conversationHydrated || hydratedConversationScope !== conversationScopeKey) return;

    localStorage.setItem(scopedPersonaStorageKey, activePersona.id);

    localStorage.setItem(
      scopedConversationStorageKey,
      JSON.stringify({
        messages: sanitizeStoredMessages(messages).slice(-maxStoredMessages),
        activePersonaId: activePersona.id,
        world,
        savedAt: new Date().toISOString(),
      })
    );
  }, [activePersona.id, conversationHydrated, conversationScopeKey, hydratedConversationScope, messages, scopedConversationStorageKey, scopedPersonaStorageKey, world]);

  useEffect(() => {
    if (!isChildWorkspace || !activeChildProfileId || !conversationHydrated || hydratedConversationScope !== conversationScopeKey || messages.length < 2) return;

    const syncedIds = new Set(JSON.parse(localStorage.getItem(childHistorySyncedStorageKey) || "[]") as string[]);
    const turns = messages.flatMap((message, index) => {
      if (message.role !== "user" || syncedIds.has(`${activeChildProfileId}:${message.id}`)) return [];
      const assistantReply = messages.slice(index + 1).find((candidate) => candidate.role === "assistant" && candidate.text.trim());
      if (!assistantReply) return [];
      return [{ userMessage: message, assistantReply }];
    }).slice(-4);

    if (turns.length === 0) return;

    turns.forEach(({ userMessage, assistantReply }) => {
      const syncId = `${activeChildProfileId}:${userMessage.id}`;
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "child_conversation_turn",
          metadata: {
            childText: userMessage.text,
            assistantText: assistantReply.text,
            personaId: assistantReply.personaId || activePersona.id,
            world: assistantReply.world || userMessage.world,
            language: assistantReply.language || userMessage.language || language,
          },
        }),
      }).then((response) => {
        if (!response.ok) return;
        const nextSyncedIds = new Set(JSON.parse(localStorage.getItem(childHistorySyncedStorageKey) || "[]") as string[]);
        nextSyncedIds.add(syncId);
        localStorage.setItem(childHistorySyncedStorageKey, JSON.stringify(Array.from(nextSyncedIds).slice(-160)));
      }).catch(() => undefined);
    });
  }, [activeChildProfileId, activePersona.id, conversationHydrated, conversationScopeKey, hydratedConversationScope, isChildWorkspace, language, messages]);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | null = null;

    const loadAssignments = (silent = false) => {
      if (!isChildWorkspace || !activeChildProfileId) {
        setChildHomeworkAssignments([]);
        setChildHomeworkStatus("idle");
        return;
      }

      if (!silent) {
        setChildHomeworkStatus("loading");
      }

      fetch("/api/child/homework", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((data: { assignments?: ChildHomeworkAssignment[] }) => {
          if (!active) return;
          setChildHomeworkAssignments(Array.isArray(data.assignments) ? data.assignments : []);
          setChildHomeworkStatus("idle");
        })
        .catch(() => {
          if (!active) return;
          if (!silent) {
            setChildHomeworkAssignments([]);
          }
          setChildHomeworkStatus("error");
        });
    };

    if (!isChildWorkspace || !activeChildProfileId) {
      setChildHomeworkAssignments([]);
      setChildHomeworkStatus("idle");
      return;
    }

    loadAssignments();

    const handleWindowFocus = () => {
      loadAssignments(true);
    };

    window.addEventListener("focus", handleWindowFocus);
    refreshTimer = window.setInterval(() => {
      loadAssignments(true);
    }, 30000);

    return () => {
      active = false;
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
      }
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [activeChildProfileId, isChildWorkspace]);

  useEffect(() => {
    if (authStatus === "loading") return;
    const storedSessionId = localStorage.getItem(scopedChatSessionIdStorageKey) || (conversationScopeKey === "parent" ? localStorage.getItem(chatSessionIdStorageKey) : null);
    const nextSessionId = storedSessionId || `session:${crypto.randomUUID()}`;
    localStorage.setItem(scopedChatSessionIdStorageKey, nextSessionId);
    setActiveChatSessionId(nextSessionId);
  }, [authStatus, conversationScopeKey, scopedChatSessionIdStorageKey]);

  useEffect(() => {
    if (sessionUser?.id) {
      setUserId(sessionUser.id);
    }
    setTrialCounter(getUsedCredits());
  }, [accessState, sessionUser?.id]);

  useEffect(() => {
    if (!sessionUser?.id) {
      setAccountTokenBalance(null);
      setAccountActiveTier(null);
      setGrantedPersonaIds([]);
      return;
    }

    let active = true;
    fetch("/api/profile")
      .then((response) => response.ok ? response.json() as Promise<{ profile?: { activeTier?: string | null; tokenBalance?: number; grantedPersonaIds?: PersonaId[] } }> : null)
      .then((data) => {
        if (!active) return;
        const tokenBalance = Number(data?.profile?.tokenBalance);
        setAccountTokenBalance(Number.isFinite(tokenBalance) ? tokenBalance : null);
        setAccountActiveTier(typeof data?.profile?.activeTier === "string" ? data.profile.activeTier : null);
        setGrantedPersonaIds(Array.isArray(data?.profile?.grantedPersonaIds) ? data.profile.grantedPersonaIds.filter((personaIdValue) => personas.some((persona) => persona.id === personaIdValue)) : []);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [sessionUser?.id]);

  useEffect(() => {
    if (isChildWorkspace) {
      setChatSessions([]);
      setSessionStatus("idle");
      return;
    }
    if (accessState === "anonymous") return;
    void loadChatSessions();
  }, [accessState, isChildWorkspace, sessionUser?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedDiscountCode = cleanClientDiscountCode(params.get("discount") || params.get("coupon") || params.get("promo"));
    const storedDiscountCode = cleanClientDiscountCode(localStorage.getItem(discountCodeStorageKey));
    const nextDiscountCode = sharedDiscountCode || storedDiscountCode;

    if (nextDiscountCode) {
      localStorage.setItem(discountCodeStorageKey, nextDiscountCode);
      setActiveDiscountCode(nextDiscountCode);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stagedCommand = cleanDemoCommand(params.get("demoCommand") || params.get("fadfadaCommand"));
    if (!stagedCommand) return;

    const stagedLanguage = params.get("lang") === "en" || params.get("lang") === "ar" ? params.get("lang") as Language : null;
    const stagedPersona = params.get("persona") as PersonaId | null;
    if (stagedLanguage) setLanguage(stagedLanguage);
    if (stagedPersona && globallyAvailablePersonas.some((persona) => persona.id === stagedPersona)) setPersonaId(stagedPersona);

    updateInput(stagedCommand);
    setToolsOpen(false);
    scrollToSection("chat");
    window.setTimeout(focusInput, 120);
    trackInteraction("starter_tap", { type: "demo_command_staged", command: stagedCommand, language });
    params.delete("demoCommand");
    params.delete("fadfadaCommand");
    params.delete("lang");
    params.delete("persona");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [language, setLanguage]);

  useEffect(() => {
    function refreshOnlineStatus() {
      setIsOffline(!navigator.onLine);
    }

    refreshOnlineStatus();
    window.addEventListener("online", refreshOnlineStatus);
    window.addEventListener("offline", refreshOnlineStatus);

    const storedDraft = localStorage.getItem(offlineDraftStorageKey);
    if (storedDraft && !input.trim()) {
      setInput(storedDraft);
      setOfflineDraftSaved(true);
    }

    return () => {
      window.removeEventListener("online", refreshOnlineStatus);
      window.removeEventListener("offline", refreshOnlineStatus);
    };
  }, [globallyAvailablePersonas, language]);

  useEffect(() => {
    let active = true;
    fetch("/api/version", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ version?: string; packageVersion?: string }> : null)
      .then((data) => {
        if (!active) return;
        setAppVersion(data?.version || data?.packageVersion || null);
      })
      .catch(() => undefined);

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/configuration")
      .then((response) => response.ok ? response.json() as Promise<{ configuration?: Partial<typeof defaultExperienceConfiguration> }> : null)
      .then((data) => {
        if (!active || !data?.configuration) return;
        setExperienceConfiguration((current) => ({
          anonymousReflectionLimit: cleanConfigurationNumber(data.configuration?.anonymousReflectionLimit, current.anonymousReflectionLimit),
          signedGiftReflectionLimit: cleanConfigurationNumber(data.configuration?.signedGiftReflectionLimit, current.signedGiftReflectionLimit),
          anonymousPersonaLimit: cleanConfigurationNumber(data.configuration?.anonymousPersonaLimit, current.anonymousPersonaLimit),
          signedPersonaLimit: cleanConfigurationNumber(data.configuration?.signedPersonaLimit, current.signedPersonaLimit),
          avatarsEnabled: data.configuration?.avatarsEnabled !== false,
          blockedPersonaIds: cleanPersonaIdList(data.configuration?.blockedPersonaIds),
          anonymousPersonaIds: cleanPersonaIdListOrDefault(data.configuration?.anonymousPersonaIds, personas.slice(0, cleanConfigurationNumber(data.configuration?.anonymousPersonaLimit, current.anonymousPersonaLimit)).map((persona) => persona.id)),
          signedPersonaIds: cleanPersonaIdListOrDefault(data.configuration?.signedPersonaIds, personas.slice(0, cleanConfigurationNumber(data.configuration?.signedPersonaLimit, current.signedPersonaLimit)).map((persona) => persona.id)),
          plusPersonaIds: cleanPersonaIdListOrDefault(data.configuration?.plusPersonaIds, personas.map((persona) => persona.id)),
        }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isChildWorkspace || accessState === "anonymous" || !conversationHydrated || hydratedConversationScope !== conversationScopeKey || !activeChatSessionId || messages.length < 2) return;

    const timeout = window.setTimeout(() => {
      void saveCurrentChatSession("silent");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [accessState, activeChatSessionId, conversationHydrated, conversationScopeKey, hydratedConversationScope, isChildWorkspace, messages, personaId, world, language]);

  async function loadChatSessions() {
    setSessionStatus("loading");
    try {
      const response = await fetch("/api/chat-sessions");
      if (!response.ok) throw new Error("sessions failed");
      const data = (await response.json()) as { sessions?: ChatSessionSummary[] };
      setChatSessions(sanitizeChatSessions(data.sessions || []));
      setSessionStatus("idle");
    } catch {
      setSessionStatus("error");
    }
  }

  async function saveCurrentChatSession(mode: "silent" | "manual" = "manual") {
    if (isChildWorkspace || accessState === "anonymous" || !activeChatSessionId || messages.length < 2) return false;
    if (mode === "manual") setSessionStatus("saving");

    const snapshot = buildChatSessionSnapshot(activeChatSessionId, messages, activePersona.id, world, language);

    try {
      const response = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      if (!response.ok) throw new Error("save failed");
      setChatSessions((current) => [snapshot, ...current.filter((sessionItem) => sessionItem.sessionId !== snapshot.sessionId)].slice(0, 24));
      setSessionStatus(mode === "manual" ? "saved" : "idle");
      return true;
    } catch {
      if (mode === "manual") setSessionStatus("error");
      return false;
    }
  }

  async function startNewChatSession() {
    if (!isChildWorkspace && accessState !== "anonymous" && messages.length >= 2) {
      setSessionStatus("saving");
      const saved = await saveCurrentChatSession("silent");
      if (!saved) {
        setSessionStatus("error");
        setActiveHomePanel("sessions");
        setToolsOpen(true);
        return;
      }
    }

    const nextSessionId = `session:${crypto.randomUUID()}`;
    localStorage.setItem(scopedChatSessionIdStorageKey, nextSessionId);
    setActiveChatSessionId(nextSessionId);
    setAnimatedAssistantMessageIds([]);
    const openingMessage = buildCurrentOpeningChatMessage();
    setMessages([openingMessage]);
    setWorld(openingMessage.world);
    if (openingMessage.personaId) setPersonaId(openingMessage.personaId);
    setToolsOpen(false);
    window.setTimeout(focusInput, 120);
  }

  async function openChatSession(sessionItem: ChatSessionSummary) {
    if (isChildWorkspace) return;
    setSessionStatus("loading");
    let sessionToOpen = sessionItem;

    if (sessionItem.messages.length === 0) {
      try {
        const response = await fetch(`/api/chat-sessions?sessionId=${encodeURIComponent(sessionItem.sessionId)}`);
        if (!response.ok) throw new Error("session failed");
        const data = (await response.json()) as { session?: ChatSessionSummary };
        sessionToOpen = sanitizeChatSessions(data.session ? [data.session] : [])[0] || sessionItem;
      } catch {
        setSessionStatus("error");
        return;
      }
    }

    localStorage.setItem(scopedChatSessionIdStorageKey, sessionItem.sessionId);
    setActiveChatSessionId(sessionToOpen.sessionId);
    const restoredMessages: ChatMessage[] = sessionToOpen.messages.length > 0 ? sessionToOpen.messages : [buildCurrentOpeningChatMessage()];
    setMessages(restoredMessages);
    setAnimatedAssistantMessageIds(getAssistantMessageIds(restoredMessages));
    if (sessionToOpen.activeWorld in worlds) setWorld(sessionToOpen.activeWorld as WorldId);
    const nextPersona = globallyAvailablePersonas.find((persona) => persona.id === sessionToOpen.activePersonaId);
    if (nextPersona) setPersonaId(nextPersona.id);
    setSessionStatus("idle");
    setToolsOpen(false);
    window.setTimeout(() => focusConversationTail("smooth"), 80);
  }

  function scrollToSection(section: "home" | "chat") {
    const target = section === "home" ? homeRef.current : chatRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToConversationEnd() {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function focusConversationTail(behavior: ScrollBehavior = "smooth") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior });
        chatEndRef.current?.scrollIntoView({ behavior, block: "end" });
      });
    });
  }

  function runHomeHeaderAction(action: HomeHeaderAction) {
    if (action === "start") {
      setPersonaOpen(false);
      setToolsOpen(false);
      scrollToSection("chat");
      window.setTimeout(focusInput, 120);
      void trackInteraction("starter_tap", { type: "top_menu_start", language });
      return;
    }

    if (action === "avatars") {
      if (!avatarsEnabled) return;
      openAvatarDrawer();
      void trackInteraction("starter_tap", { type: "top_menu_avatars", language });
      return;
    }

    if (action === "stories") {
      openStoryShelf();
      return;
    }

    if (action === "homework") {
      if (!isChildWorkspace) return;
      setPersonaOpen(false);
      setToolsOpen(false);
      setChildHomeworkDrawerOpen(true);
      return;
    }

    if (action === "newChat") {
      setPersonaOpen(false);
      setToolsOpen(false);
      void startNewChatSession();
      void trackInteraction("starter_tap", { type: "top_menu_new_chat", language });
      return;
    }

  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialAction = params.get("fadfadaAction");
    const checkoutSession = params.get("session");
    const checkoutProvider = params.get("provider");

    if (checkoutSession === "success") {
      setPlusWelcomeOpen(true);
      setPaywallOpen(false);
      void trackInteraction("starter_tap", { type: "plus_checkout_success", provider: checkoutProvider || "unknown", language });
      params.delete("session");
      params.delete("provider");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    if (initialAction === "start" || initialAction === "avatars" || initialAction === "stories" || initialAction === "homework" || initialAction === "newChat") {
      window.setTimeout(() => runHomeHeaderAction(initialAction), 180);
      params.delete("fadfadaAction");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    if (params.get("upgrade") === "plus") {
      window.setTimeout(() => setPaywallOpen(true), 180);
      params.delete("upgrade");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    const handleAction = (event: Event) => {
      const action = (event as CustomEvent<{ action?: HomeHeaderAction }>).detail?.action;
      if (action === "start" || action === "avatars" || action === "stories" || action === "newChat") {
        runHomeHeaderAction(action);
      }
    };

    window.addEventListener(fadfadaHomeActionEventName, handleAction);
    return () => window.removeEventListener(fadfadaHomeActionEventName, handleAction);
  }, [avatarsEnabled, language]);

  function showShareStatus(status: ShareStatus) {
    setShareStatus(status);
    if (status !== "idle") {
      window.setTimeout(() => setShareStatus("idle"), 5000);
    }
  }

  async function shareOrCopy(payload: { title: string; text: string; url: string }, eventType: InteractionEventType, metadata: Record<string, string | number | boolean | null>) {
    const fullShareText = `${payload.text}\n${payload.url}`;

    try {
      if (navigator.share) {
        let copiedForPaste = false;
        const copyForPaste = copyTextToClipboard(fullShareText)
          .then(() => {
            copiedForPaste = true;
          })
          .catch(() => undefined);

        await navigator.share(payload);
        await copyForPaste;
        trackInteraction(eventType, { ...metadata, native: true, clipboardPrepared: copiedForPaste });
        showShareStatus(copiedForPaste ? "copied" : "idle");
        return;
      }
    } catch {
      // Some mobile browsers expose Web Share but reject it. Fall through to copy.
    }

    try {
      await copyTextToClipboard(fullShareText);
      trackInteraction(eventType, { ...metadata, fallback: "clipboard" });
      showShareStatus("copied");
    } catch {
      trackInteraction(eventType, { ...metadata, fallback: "failed" });
      showShareStatus("error");
    }
  }

  async function shareFadFada() {
    setAppShareLoading(true);
    const title = language === "ar" ? "فضفضة" : "FadFada";
    const text =
      language === "ar"
        ? "جرب فضفضة: مساحة هادئة تكتب فيها ما بداخلك وتخرج بخطوة صغيرة واضحة."
        : "Try FadFada: a calm space to vent, reflect, and leave with one small next step.";
    const url = "https://fad-fada.vercel.app";

    try {
      await shareOrCopy({ title, text, url }, "app_share", { language });
    } finally {
      setAppShareLoading(false);
    }
  }

  async function shareMoment(message: ChatMessage) {
    const title = language === "ar" ? "لحظة من فضفضة" : "A FadFada moment";
    const text = `${message.text}\n\n${language === "ar" ? "جرب فضفضة" : "Try FadFada"}: https://fad-fada.vercel.app`;

    await shareOrCopy({ title, text, url: "https://fad-fada.vercel.app" }, "moment_share", { world: message.world, language: message.language || language });
  }

  async function shareProofCard(message: ChatMessage) {
    const messageLanguage = message.language || language;
    const lastUserMessage = [...messages].reverse().find((item) => item.role === "user");
    const title = messageLanguage === "ar" ? "بطاقة إثبات فضفضة" : "FadFada Proof Card";
    const text = buildProofCard(message, lastUserMessage, activePersonaDisplayName, messageLanguage);

    await shareOrCopy({ title, text, url: "https://fad-fada.vercel.app" }, "moment_share", { type: "proof_card", world: message.world, language: messageLanguage });
  }

  async function shareSafeReceipt(message: ChatMessage) {
    const messageLanguage = message.language || language;
    const lastUserMessage = [...messages].reverse().find((item) => item.role === "user");
    const title = messageLanguage === "ar" ? "خلاصة فضفضة" : "FadFada Reflection Summary";
    const text = buildSafeReceiptShareText(message, lastUserMessage, messageLanguage);

    await shareOrCopy({ title, text, url: "https://fad-fada.vercel.app" }, "moment_share", { type: "safe_receipt", world: message.world, language: messageLanguage });
  }

  async function shareJudgePitch() {
    const title = language === "ar" ? "عرض فضفضة للحكام" : "FadFada Judge Pitch";
    const text = buildJudgePitchCard(language);

    await shareOrCopy({ title, text, url: "https://fad-fada.vercel.app" }, "app_share", { type: "judge_pitch", language });
  }

  async function shareLaunchPost() {
    const title = language === "ar" ? "منشور إطلاق فضفضة" : "FadFada Launch Post";
    const text = buildLaunchPost(language);

    await shareOrCopy({ title, text, url: "https://fad-fada.vercel.app" }, "app_share", { type: "launch_post", language });
  }

  async function shareBelieverBadge() {
    const title = language === "ar" ? "شارة مؤمن مبكر بفضفضة" : "FadFada Early Believer Badge";
    const text = buildBelieverBadge(language, {
      companionName: activePersonaDisplayName,
      worldName: language === "ar" ? activeWorld.nameAr : activeWorld.nameEn,
      messageCount: messages.filter((message) => message.role === "user").length,
      savedCount: savedMomentIds.length,
      questCount: growthQuests.length,
    });

    await shareOrCopy({ title, text, url: "https://fad-fada.vercel.app" }, "app_share", { type: "early_believer_badge", language });
  }

  async function shareGrowthQuest(quest: GrowthQuest) {
    const title = language === "ar" ? "تحدي فضفضة" : "FadFada Quest";
    const text = buildQuestShareText(quest, language);
    const url = "https://fad-fada.vercel.app";

    await shareOrCopy({ title, text, url }, "app_share", { type: "growth_quest", world: quest.world, language });
  }

  async function inviteQuestBuddy(quest: GrowthQuest) {
    const title = language === "ar" ? "تحدي فضفضة مع صديق" : "FadFada Buddy Quest";
    const text = buildBuddyInviteText(quest, language);
    const url = "https://fad-fada.vercel.app";

    await shareOrCopy({ title, text, url }, "app_share", { type: "quest_buddy_invite", world: quest.world, language });
  }

  function saveMoment(message: ChatMessage) {
    const storedMoments = JSON.parse(localStorage.getItem("fadfada-saved-moments") || "[]") as Array<{
      id: string;
      text: string;
      world: WorldId;
      personaId?: PersonaId | "custom";
      personaName?: string;
      avatarPath?: string;
      language?: Language;
      savedAt: string;
    }>;
    const nextMoments = [
      {
        id: message.id,
        text: message.text,
        world: message.world,
        personaId: message.personaId,
        personaName: message.personaName || activePersonaDisplayName,
        avatarPath: message.avatarPath,
        language: message.language,
        savedAt: new Date().toISOString(),
      },
      ...storedMoments.filter((moment) => moment.id !== message.id),
    ].slice(0, 24);

    localStorage.setItem("fadfada-saved-moments", JSON.stringify(nextMoments));
    setSavedMomentIds((current) => Array.from(new Set([message.id, ...current])));
    trackInteraction("moment_save", { world: message.world, language: message.language || language });
  }

  function saveTinyPlan(message: ChatMessage) {
    const plan = buildTinyPlan(message, language);
    const storedPlans = JSON.parse(localStorage.getItem(tinyPlanStorageKey) || "[]") as TinyPlan[];
    const nextPlans = [plan, ...storedPlans.filter((storedPlan) => storedPlan.id !== plan.id)].slice(0, 12);

    localStorage.setItem(tinyPlanStorageKey, JSON.stringify(nextPlans));
    trackInteraction("tiny_plan", { world: message.world, language: message.language || language, stepCount: plan.steps.length });
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text:
          language === "ar"
            ? `حوّلت الرد لخطة صغيرة محفوظة في ملفك: ${plan.steps.join("، ")}`
            : `I turned this into a tiny plan saved in your profile: ${plan.steps.join(", ")}`,
        world: message.world,
        language,
        cadence: normalizeCadence("steady_calm", message.world),
        personaId: activePersona.id,
        personaName: language === "ar" ? activePersona.nameAr : activePersona.nameEn,
        avatarPath: activePersona.avatarPath,
      },
    ]);
  }

  function saveJourneySnapshot() {
    const snapshot = buildJourneySnapshot(messages, language);
    if (!snapshot) return;

    const storedSnapshots = JSON.parse(localStorage.getItem(journeySnapshotStorageKey) || "[]") as JourneySnapshot[];
    const nextSnapshots = [snapshot, ...storedSnapshots.filter((storedSnapshot) => storedSnapshot.id !== snapshot.id)].slice(0, 12);
    localStorage.setItem(journeySnapshotStorageKey, JSON.stringify(nextSnapshots));
    setJourneySnapshotStatus("saved");
    trackInteraction("starter_tap", { type: "journey_snapshot", world: snapshot.world, language, messageCount: snapshot.messageCount });
    window.setTimeout(() => setJourneySnapshotStatus("idle"), 1800);
  }

  function startGrowthQuest() {
    const quest = buildGrowthQuest(messages, language);
    if (!quest) return;

    const storedQuests = JSON.parse(localStorage.getItem(growthQuestStorageKey) || "[]") as GrowthQuest[];
    const nextQuests = [quest, ...storedQuests].slice(0, 8);
    localStorage.setItem(growthQuestStorageKey, JSON.stringify(nextQuests));
    setGrowthQuests(nextQuests);
    setGrowthQuestStatus("saved");
    trackInteraction("starter_tap", { type: "growth_quest", world: quest.world, language, dayCount: quest.days.length });
    window.setTimeout(() => setGrowthQuestStatus("idle"), 1800);
  }

  function completeNextQuestStep(questId: string) {
    const nextQuests = growthQuests.map((quest) => {
      if (quest.id !== questId) return quest;

      const nextOpenIndex = quest.days.findIndex((day) => !day.done);
      if (nextOpenIndex === -1) return quest;

      return {
        ...quest,
        days: quest.days.map((day, index) => index === nextOpenIndex ? { ...day, done: true } : day),
      };
    });

    localStorage.setItem(growthQuestStorageKey, JSON.stringify(nextQuests));
    setGrowthQuests(nextQuests);
    trackInteraction("starter_tap", { type: "growth_quest_step", language });
  }

  function downloadCapsule(message: ChatMessage) {
    const lastUserMessage = [...messages].reverse().find((item) => item.role === "user");
    const capsule = buildMomentCapsule(message, lastUserMessage, activePersonaDisplayName, language);
    const blob = new Blob([capsule], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fadfada-moment-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    trackInteraction("capsule_download", { world: message.world, language: message.language || language });
  }

  function sendFeedback(message: ChatMessage, eventType: "helpful_feedback" | "softer_feedback") {
    setFeedbackMomentIds((current) => Array.from(new Set([message.id, ...current])));
    if (eventType === "softer_feedback") {
      setSofterNext(true);
    }
    trackInteraction(eventType, { world: message.world, language: message.language || language });
  }

  function stopVoicePlayback() {
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
  }

  function speakTextWithPersona(text: string, speechLanguage: Language, persona: Persona, messageId: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const preferredVoiceConfig = getPreferredVoiceConfig(persona.voiceConfig);
    const utterance = new SpeechSynthesisUtterance(prepareArabicForSpeech(text, speechLanguage, getArabicSpeechDialect(preferredVoiceConfig)));
    utterance.lang = getSpeechLocale(speechLanguage, preferredVoiceConfig);
    utterance.rate = preferredVoiceConfig.rate;
    utterance.pitch = preferredVoiceConfig.pitch;
    utterance.voice = selectSpeechVoice(speechLanguage, preferredVoiceConfig) ?? null;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }

  function playBrowserSpeech(message: ChatMessage) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const speechLanguage = message.language || language;
    const messagePersona = resolveMessagePersona(message, customPersona);
    const homeworkActivities = message.childHomeworkActivities?.length ? message.childHomeworkActivities : parseLegacyChildHomeworkActivities(message);
    const speechText = homeworkActivities.length ? getLegacyHomeworkIntroText(message.text, speechLanguage) : message.text;
    speakTextWithPersona(speechText, speechLanguage, messagePersona, message.id);
  }

  function toggleVoicePlayback(message: ChatMessage) {
    if (typeof window === "undefined") return;

    if (speakingMessageId === message.id) {
      stopVoicePlayback();
      return;
    }

    stopVoicePlayback();
    playBrowserSpeech(message);
  }

  async function trackInteraction(eventType: InteractionEventType, metadata?: Record<string, string | number | boolean | null>) {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, metadata }),
      keepalive: true,
    });

    return response.ok;
  }

  async function rateAvatar(persona: Persona, rating: number) {
    const normalizedRating = Math.max(1, Math.min(5, Math.round(rating)));
    try {
      return await trackInteraction("avatar_rating", {
        personaId: persona.id,
        personaNameAr: persona.nameAr,
        personaNameEn: persona.nameEn,
        avatarPath: persona.avatarPath,
        rating: normalizedRating,
        language,
        device: getClientDeviceType(),
        browser: getClientBrowserName(),
      });
    } catch {
      return false;
    }
  }

  async function rateActiveAvatar(rating: number) {
    if (activeAvatarRatingStatus === "saving") return;

    setActiveAvatarRatingStatus("saving");
    const saved = await rateAvatar(activePersona, rating);
    if (saved) {
      setActiveAvatarRatings((current) => ({ ...current, [activePersona.id]: rating }));
      setActiveAvatarRatingStatus("saved");
      return;
    }

    setActiveAvatarRatingStatus("error");
  }

  async function submitVisitorComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const comment = visitorComment.trim();
    if (comment.length < 2 || visitorCommentStatus === "saving") return;

    setVisitorCommentStatus("saving");
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "visitor_comment",
          metadata: {
            comment: comment.slice(0, 500),
            language,
            device: getClientDeviceType(),
            browser: getClientBrowserName(),
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          },
        }),
        keepalive: true,
      });

      if (!response.ok) throw new Error("comment failed");
      setVisitorComment("");
      setVisitorCommentStatus("saved");
    } catch {
      setVisitorCommentStatus("error");
    }
  }

  async function runSecretCommand(text: string) {
    const command = text.trim().toLowerCase();
    const commandLanguage = /[ -]/.test(command) && !/[ -]*[ -]/.test("") ? language : language;
    const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant" && message.id !== "opening");
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

    if (["demo keys", "demokeys", "demo key", "secret commands", "secrets", "shortcuts", "مفاتيح العرض", "مفاتيح", "الأسرار", "اسرار", "اختصارات"].includes(command)) {
      setInput("");
      setActiveHomePanel("prompts");
      setToolsOpen(true);
      trackInteraction("starter_tap", { type: "open_demo_keys_from_text", language });
      return true;
    }

    if (["/judge", "/demo", "/wow", "/عرض", "/حكام"].includes(command)) {
      const scenario = judgeDemoScenarios[language][0];
      setInput("");
      submitJudgeScenario(scenario.text, scenario.world, scenario.targetLanguage, scenario.personaId);
      return true;
    }

    if (["/story", "/play", "/scene", "/حكاية", "/مشهد", "/لعب"].includes(command)) {
      const rawiPersona = personas.find((persona) => persona.id === "rawi") ?? activePersona;
      const seedText = latestUserMessage?.text || (language === "ar" ? "حوّلي إحساسي اليوم إلى مشهد رمزي قصير يساعدني أفهم نفسي بدون تهويل." : "Turn how I feel today into a short symbolic scene that helps me understand myself without overcomplicating it.");
      const storyPrompt =
        language === "ar"
          ? `استخدمي وضع راوية. حوّلي هذه المشاركة إلى بطاقة Story Mirror قصيرة: ${seedText}`
          : `Use Rawiya mode. Turn this share into a short Story Mirror card: ${seedText}`;
      setInput("");
      setPersonaId("rawi");
      setWorld("story");
      scrollToSection("chat");
      trackInteraction("starter_tap", { type: "secret_story_play", language });
      void submitMessage(undefined, storyPrompt, "story", rawiPersona);
      return true;
    }

    if (["/pitch", "/judge-pitch", "/deck", "/ملخص", "/عرض-سريع"].includes(command)) {
      setInput("");
      await shareJudgePitch();
      trackInteraction("starter_tap", { type: "secret_judge_pitch", language });
      return true;
    }

    if (["/launch", "/follow", "/thread", "/منشور", "/تابع"].includes(command)) {
      setInput("");
      await shareLaunchPost();
      trackInteraction("starter_tap", { type: "secret_launch_post", language });
      return true;
    }

    if (["/badge", "/believer", "/early", "/شارة", "/مؤمن"].includes(command)) {
      setInput("");
      await shareBelieverBadge();
      trackInteraction("starter_tap", { type: "secret_believer_badge", language });
      return true;
    }

    if (["/proof", "/card", "/viral", "/اثبات", "/بطاقة"].includes(command)) {
      setInput("");
      if (latestAssistantMessage) {
        await shareProofCard(latestAssistantMessage);
        trackInteraction("starter_tap", { type: "secret_proof_card", world: latestAssistantMessage.world, language });
      } else {
        setActiveHomePanel("prompts");
        setToolsOpen(true);
        trackInteraction("starter_tap", { type: "secret_proof_card_empty", language });
      }
      return true;
    }

    if (["/capsule", "/memory", "/كبسولة", "/ذكرى"].includes(command)) {
      setInput("");
      if (latestAssistantMessage) {
        downloadCapsule(latestAssistantMessage);
        trackInteraction("starter_tap", { type: "secret_capsule", world: latestAssistantMessage.world, language });
      } else {
        setActiveHomePanel("prompts");
        setToolsOpen(true);
        trackInteraction("starter_tap", { type: "secret_capsule_empty", language });
      }
      return true;
    }

    if (["/quest", "/3days", "/تحدي", "/رحلة"].includes(command)) {
      setInput("");
      startGrowthQuest();
      trackInteraction("starter_tap", { type: "secret_quest", language });
      return true;
    }

    return false;
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>, overrideText?: string, overrideWorld?: WorldId, overridePersona?: Persona) {
    event?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || isThinking) return;
    const draftDisplayName = normalizeGreetingName(visitorNameDraft);
    const requestUserDisplayName = effectiveUserName ?? draftDisplayName;

    if (!requestUserDisplayName) {
      setNameGateMessage(true);
      setVisitorNameStatus("idle");
      scrollToSection("chat");
      window.setTimeout(() => nameInputRef.current?.focus(), 80);
      return;
    }

    if (!effectiveUserName && draftDisplayName) {
      registerVisitorName(draftDisplayName);
    }

    pendingReplyFocusRef.current = true;
    focusConversationTail("smooth");

    if (isOffline && !overrideText) {
      localStorage.setItem(offlineDraftStorageKey, text);
      setOfflineDraftSaved(true);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: language === "ar" ? "أنت غير متصل الآن. حفظت النص كمسودة محلية؛ عندما يعود الاتصال اضغط إرسال مرة أخرى." : "You are offline right now. I saved this as a local draft; when connection returns, press Send again.",
          world,
          language,
          cadence: normalizeCadence("steady_calm", world),
          personaId: activePersona.id,
          personaName: language === "ar" ? activePersona.nameAr : activePersona.nameEn,
          avatarPath: activePersona.avatarPath,
        },
      ]);
      return;
    }

    if (!overrideText && await runSecretCommand(text)) return;

    if (accessState !== "plus" && getUsedCredits() >= reflectionLimit) {
      if (!overrideText) setInput("");
      showAccessLimitMessage();
      return;
    }

    const nextLanguage = inferRequestedLanguage(text, language);
    const clientDetectedMediaKind = detectGeneratedMediaKind(text);
    const autoRoutedPersona = overridePersona ? null : getAutoRoutedPersona(text, messages, unlockedPersonaIds, globallyAvailablePersonas);
    const requestWorld = overrideWorld ?? (autoRoutedPersona?.primaryWorldId === "celebration" ? "celebration" : world);
    const candidatePersona = overridePersona ?? autoRoutedPersona ?? activePersona;
    const requestPersona = candidatePersona.id === "custom" || unlockedPersonaIds.includes(candidatePersona.id)
      ? candidatePersona
      : globallyAvailablePersonas.find((persona) => persona.id === unlockedPersonaIds[0]) ?? fallbackPersona;
    const personaResponseContract = buildPersonaResponseContract(requestPersona);
    const personaContinuityPrompt = buildCompanionContinuityPrompt(requestPersona, messages, nextLanguage);
    updateInput("");
    localStorage.removeItem(offlineDraftStorageKey);
    setOfflineDraftSaved(false);
    setIsThinking(true);
    setPaywallOpen(false);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      world: requestWorld,
      language: nextLanguage,
      personaName: accountName,
      avatarPath: accountImage || undefined,
    };
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          childProfileId: isChildWorkspace && typeof sessionUser?.childProfileId === "string" ? sessionUser.childProfileId : undefined,
          messageText: text,
          personaId: requestPersona.id,
          currentWorld: requestWorld,
          currentLanguage: nextLanguage,
          userDisplayName: requestUserDisplayName,
          personaSystemPrompt: [requestPersona.coreSystemPrompt, personaResponseContract, personaContinuityPrompt].filter(Boolean).join("\n\n"),
          behaviorStyle,
          softerMode: softerNext,
          recentMessages: buildRecentMessages(messages),
        }),
      });
      setSofterNext(false);
      const data = (await response.json()) as ReflectResponse;

      if (data.error === "PAYWALL_TRIGGERED" || data.promptUpsell) {
        setPaywallOpen(true);
      }

      const responseWorld = data.world && data.world in worlds ? data.world : requestWorld;
      const cadence = normalizeCadence(data.emotionalCadence?.speed, responseWorld);
      const generatedMediaKind = data.mediaIntent?.kind === "image" || data.mediaIntent?.kind === "video" ? data.mediaIntent.kind : clientDetectedMediaKind;
      const rawResponseText = data.text || (nextLanguage === "ar" ? "أنا معاك. خلينا نكمل بخطوة صغيرة." : "I am with you. Let's continue with one small step.");
      const responseText = generatedMediaKind ? buildGeneratedMediaReply(generatedMediaKind, nextLanguage) : rawResponseText;
      const generatedMedia = generatedMediaKind ? buildGeneratedMediaAsset(generatedMediaKind, text, rawResponseText, nextLanguage, data.mediaIntent?.prompt) : undefined;
      if (accessState !== "plus") {
        useOneCredit();
      }
      setWorld(responseWorld);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: responseText,
        world: responseWorld,
        language: nextLanguage,
        cadence,
        resources: generatedMedia ? undefined : data.resources,
        generatedMedia,
        challenge: generatedMedia ? undefined : data.challenge,
        suggestions: generatedMedia ? undefined : data.suggestions?.slice(0, 3),
        personaId: requestPersona.id,
        personaName: nextLanguage === "ar" ? requestPersona.nameAr : requestPersona.nameEn,
        avatarPath: requestPersona.avatarPath,
      };
      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
      if (data.triggerAudioPlayback) {
        window.setTimeout(() => playBrowserSpeech(assistantMessage), 160);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: nextLanguage === "ar" ? "حصل انقطاع بسيط. جرّب تكتبها تاني بهدوء." : "Something briefly disconnected. Try writing it again calmly.",
          world: requestWorld,
          language: nextLanguage,
          cadence: normalizeCadence(undefined, requestWorld),
          personaId: requestPersona.id,
          personaName: nextLanguage === "ar" ? requestPersona.nameAr : requestPersona.nameEn,
          avatarPath: requestPersona.avatarPath,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  function submitChildSuggestion(suggestion: string) {
    const cleanedSuggestion = suggestion.trim();
    if (!cleanedSuggestion || isThinking || !activePersonaIsChild) return;

    const reward = latestChildAssistantMessage?.challenge?.pointsReward;
    if (reward && reward > 0) {
      const toastId = crypto.randomUUID();
      setChildRewardToast({ id: toastId, text: language === "ar" ? `+${reward} نقطة! ✨` : `+${reward} points! ✨` });
      window.setTimeout(() => {
        setChildRewardToast((currentToast) => currentToast?.id === toastId ? null : currentToast);
      }, 1500);
    }

    void submitMessage(undefined, cleanedSuggestion, latestChildAssistantMessage?.world ?? world, activePersona);
  }

  function startChildTapGame() {
    if (!isChildWorkspace || isThinking) return;

    const gameWorld: WorldId = activePersona.primaryWorldId in worlds ? activePersona.primaryWorldId as WorldId : "learning";
    const guideName = language === "ar" ? activePersona.nameAr : activePersona.nameEn;
    const isZainKgPersona = activePersona.id === "zain_kg_explorer";
    const suggestions = isZainKgPersona
      ? language === "ar"
        ? ["🦁 أصوات", "🏃 حركة", "🎨 ألوان"]
        : ["🦁 Sounds", "🏃 Move", "🎨 Colors"]
      : language === "ar"
      ? ["لعبة حروف", "لغز أرقام", "قصة قصيرة"]
      : ["Letter game", "Number puzzle", "Short story"];
    const assistantText = isZainKgPersona
      ? language === "ar"
        ? "واو يا بطل! اختر لعبة بالصورة."
        : "Yay, friend! Tap a picture game."
      : language === "ar"
      ? `جاهز يا ${activeChildNickname || "بطل"}. اختر لعبة من الأزرار وسأبدأ معك فوراً.`
      : `Ready ${activeChildNickname || "friend"}. Pick a game button and I will start right away.`;
    const challengeQuestion = isZainKgPersona
      ? language === "ar" ? "ماذا نلعب؟" : "What game?"
      : language === "ar" ? `${guideName} جاهز. ماذا نلعب الآن؟` : `${guideName} is ready. What shall we play?`;

    setWorld(gameWorld);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: assistantText,
        world: gameWorld,
        language,
        cadence: normalizeCadence("rapid_energetic", gameWorld),
        challenge: {
          type: "quiz",
          question: challengeQuestion,
          pointsReward: 2,
        },
        suggestions,
        personaId: activePersona.id,
        personaName: guideName,
        avatarPath: activePersona.avatarPath,
      },
    ]);
    scrollToSection("chat");
    window.setTimeout(() => focusConversationTail("smooth"), 120);
    void trackInteraction("starter_tap", { type: "child_start_play", language, personaId: activePersona.id });
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "child_conversation_turn",
        metadata: {
          childText: language === "ar" ? "ضغط زر ابدأ اللعب" : "Tapped Start playing",
          assistantText: `${assistantText}\n${challengeQuestion}`,
          personaId: activePersona.id,
          world: gameWorld,
          language,
        },
      }),
    }).catch(() => undefined);
  }

  function startDailyChildMoment(moment: DailyChildMoment["learn"], kind: "learn" | "feel" | "connect") {
    if (!isChildWorkspace || isThinking || !activePersonaIsChild) return;

    void trackInteraction("starter_tap", { type: "child_daily_moment", kind, language, personaId: activePersona.id, dateKey: dailyChildMoment.dateKey });
    void submitMessage(undefined, moment.text, moment.world, activePersona);
  }

  function startChildHomework(assignment: ChildHomeworkAssignment) {
    if (!isChildWorkspace || isThinking || !activePersonaIsChild) return;

    const firstActivities = assignment.activities.slice(0, 3);
    const suggestions = firstActivities.map((activity) => activity.title || activity.prompt.slice(0, 28));
    const assistantText = assignment.childIntro;

    setWorld("learning");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: assistantText,
        world: "learning",
        language,
        cadence: normalizeCadence("rapid_energetic", "learning"),
        challenge: {
          type: "quiz",
          question: assignment.detectedTask,
          pointsReward: 3,
        },
        childHomeworkActivities: firstActivities,
        suggestions: suggestions.length ? suggestions : [assignment.detectedTask],
        personaId: activePersona.id,
        personaName: language === "ar" ? activePersona.nameAr : activePersona.nameEn,
        avatarPath: activePersona.avatarPath,
      },
    ]);
    scrollToSection("chat");
    window.setTimeout(() => focusConversationTail("smooth"), 120);
    void trackInteraction("starter_tap", { type: "child_homework_start", language, personaId: activePersona.id, assignmentId: assignment.id, subject: assignment.subject });
  }

  function toggleVoiceCapture() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition as (new () => ISpeechRecognition) | undefined;
    if (!SpeechRecognitionAPI) {
      setVoiceCaptureStatus("unsupported");
      return;
    }

    if (isRecording) {
      keepRecordingRef.current = false;
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setVoiceCaptureStatus("idle");
    const recognition = new SpeechRecognitionAPI() as ISpeechRecognition;
    recognition.lang = getSpeechLocale(language, getPreferredVoiceConfig(activePersona.voiceConfig));
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recorderRef.current = recognition;
    keepRecordingRef.current = true;
    recordingRestartCountRef.current = 0;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceCaptureStatus("idle");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const items = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript);
      setInput(items.join(""));
      setVoiceCaptureStatus("idle");
    };

    recognition.onend = () => {
      if (keepRecordingRef.current && recordingRestartCountRef.current < 4) {
        recordingRestartCountRef.current += 1;
        try {
          recognition.start();
          return;
        } catch {
          keepRecordingRef.current = false;
          setVoiceCaptureStatus("error");
        }
      }

      keepRecordingRef.current = false;
      setIsRecording(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      keepRecordingRef.current = false;
      setIsRecording(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceCaptureStatus("permission");
        return;
      }
      if (event.error === "no-speech" || event.error === "audio-capture") {
        setVoiceCaptureStatus("no-speech");
        return;
      }
      setVoiceCaptureStatus("error");
    };

    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      keepRecordingRef.current = false;
      setIsRecording(false);
      setVoiceCaptureStatus("error");
    }
  }

  useEffect(() => {
    if (authStatus === "loading") return;
    setConversationHydrated(false);

    const storedUserId = localStorage.getItem(visitorUserIdKey);
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const nextUserId = `visitor:${crypto.randomUUID()}`;
      localStorage.setItem(visitorUserIdKey, nextUserId);
      setUserId(nextUserId);
    }

    setVisitorShowcaseOpen(!isChildWorkspace && localStorage.getItem("fadfada-visitor-showcase-seen") !== "true");

    try {
      const storedPersonaId = localStorage.getItem(scopedPersonaStorageKey) as PersonaId | null;
      let nextPersona = visiblePersonas.find((persona) => persona.id === storedPersonaId && (isChildWorkspace || !childPersonaIdSet.has(persona.id))) ?? fallbackPersona;
      let nextWorld: WorldId = nextPersona.primaryWorldId in worlds ? nextPersona.primaryWorldId as WorldId : "calm";
      let nextMessages: ChatMessage[] = [];
      const rawStoredConversation = localStorage.getItem(scopedConversationStorageKey) || (conversationScopeKey === "parent" ? localStorage.getItem(conversationStorageKey) : null);
      const storedConversation = JSON.parse(rawStoredConversation || "null") as { messages?: ChatMessage[]; world?: WorldId; activePersonaId?: PersonaId } | null;
      const restoredMessages = sanitizeStoredMessages(storedConversation?.messages).slice(-maxStoredMessages);
      const hasParentAssistantMessage = isChildWorkspace && restoredMessages.some((message) => message.role === "assistant" && (!message.personaId || !childPersonaIdSet.has(message.personaId)));
      const hasChildAssistantMessage = !isChildWorkspace && restoredMessages.some((message) => message.role === "assistant" && message.personaId && childPersonaIdSet.has(message.personaId));

      if (!hasParentAssistantMessage && !hasChildAssistantMessage && restoredMessages.length > 0) {
        nextMessages = restoredMessages;
        if (storedConversation?.world && storedConversation.world in worlds) nextWorld = storedConversation.world;

        const restoredPersonaId = storedConversation?.activePersonaId ?? [...restoredMessages].reverse().find((message) => message.personaId)?.personaId;
        const restoredPersona = visiblePersonas.find((persona) => persona.id === restoredPersonaId && (isChildWorkspace || !childPersonaIdSet.has(persona.id)));
        if (restoredPersona) nextPersona = restoredPersona;
      }

      if (isChildWorkspace && !childPersonaIdSet.has(nextPersona.id)) {
        nextPersona = childAvailablePersonas[0] ?? fallbackPersona;
        nextWorld = nextPersona.primaryWorldId in worlds ? nextPersona.primaryWorldId as WorldId : "calm";
        nextMessages = [];
      }

      if (!isChildWorkspace && childPersonaIdSet.has(nextPersona.id)) {
        nextPersona = personas.find((persona) => persona.id === "omar") ?? fallbackPersona;
        nextWorld = "calm";
        nextMessages = [];
      }

      if (nextMessages.length === 0) nextMessages = [buildOpeningChatMessageForPersona(nextPersona)];

      setPersonaId(nextPersona.id);
      setWorld(nextWorld);
      setMessages(nextMessages);
      setAnimatedAssistantMessageIds(getAssistantMessageIds(nextMessages));
    } catch {
      localStorage.removeItem(scopedConversationStorageKey);
    } finally {
      setHydratedConversationScope(conversationScopeKey);
      setConversationHydrated(true);
    }

    setSavedMomentIds(
      (JSON.parse(localStorage.getItem("fadfada-saved-moments") || "[]") as Array<{ id: string }>).map((moment) => moment.id)
    );

    try {
      const storedPulse = JSON.parse(localStorage.getItem(dailyPulseStorageKey) || "null") as DailyPulseStats | null;
      if (storedPulse && typeof storedPulse.count === "number" && typeof storedPulse.streak === "number") {
        setDailyPulseStats({ count: storedPulse.count, streak: storedPulse.streak, lastDate: storedPulse.lastDate || null });
      }
    } catch {
      localStorage.removeItem(dailyPulseStorageKey);
    }

    try {
      setGrowthQuests(sanitizeStoredGrowthQuests(JSON.parse(localStorage.getItem(growthQuestStorageKey) || "[]")));
    } catch {
      localStorage.removeItem(growthQuestStorageKey);
    }

    window.speechSynthesis?.getVoices();

    const storedPersona = localStorage.getItem(customPersonaStorageKey);
    if (storedPersona) {
      try {
        const parsed = JSON.parse(storedPersona) as CustomPersonaDraft;
        if (parsed.name?.trim() && parsed.description?.trim()) {
          setCustomPersonaDraft({ name: parsed.name, description: parsed.description, avatarPath: isAllowedCustomAvatarPath(parsed.avatarPath) ? parsed.avatarPath : undefined });
        }
      } catch {
        localStorage.removeItem(customPersonaStorageKey);
      }
    }

    return () => {
      recorderRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, [authStatus, activeChildNickname, childAvailablePersonas, conversationScopeKey, effectiveUserName, fallbackPersona, isChildWorkspace, language, scopedConversationStorageKey, scopedPersonaStorageKey, visiblePersonas]);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
  }, [personaId]);

  async function startCheckout() {
    setCheckoutLoading(true);
    setCheckoutStatus("idle");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        currentLanguage: language,
        product: "plus_access",
        discountCode: activeDiscountCode || undefined,
      }),
    }).catch(() => null);
    const data = response ? ((await response.json()) as { url?: string; error?: string; message?: string }) : null;

    if (data?.url) {
      window.location.assign(data.url);
      return;
    }

    setCheckoutLoading(false);
  setCheckoutStatus(data?.error === "PREMIUM_PAUSED" ? "paused" : "error");
    setPaywallOpen(false);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text:
          language === "ar"
            ? "لم يفتح الدفع الآن. تأكد أن إعدادات الدفع مفعلة، ثم جرّب الترقية مرة أخرى."
            : "Checkout did not open. Check that payment settings are configured, then try upgrading again.",
        world,
        language,
        cadence: normalizeCadence(undefined, world),
        personaId: activePersona.id,
        personaName: language === "ar" ? activePersona.nameAr : activePersona.nameEn,
        avatarPath: activePersona.avatarPath,
      },
    ]);
  }

  async function runMomentAction(messageId: string, action: MomentActionKey, handler: () => void | Promise<void>) {
    const key = `${messageId}:${action}`;
    setActionLoadingKey(key);
    try {
      await handler();
    } finally {
      window.setTimeout(() => setActionLoadingKey(null), 220);
    }
  }

  async function startPersonaUnlockCheckout(personaIdToUnlock: PersonaId) {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        priceId: process.env.NEXT_PUBLIC_PERSONA_UNLOCK_PRICE_ID,
        currentLanguage: language,
        product: "persona_unlock",
        personaId: personaIdToUnlock,
      }),
    });
    const data = (await response.json()) as { url?: string };

    if (data.url) {
      window.location.assign(data.url);
    }
  }

  function openSignInGift() {
    window.location.assign(`/auth/signin?callbackUrl=${encodeURIComponent("/")}`);
  }

  function handleLockedPersonaSelect(personaIdToUnlock: PersonaId) {
    if (accessState === "anonymous") {
      setPersonaOpen(false);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text:
            language === "ar"
              ? `هذه الشخصية ضمن هدية تسجيل الدخول. لديك ${anonymousPersonaLimit} رفقاء بدون حساب، وسنفتح ${signedPersonaLimit} بعد تسجيل الدخول.`
              : `This companion is part of the sign-in gift. You get ${anonymousPersonaLimit} companions without an account, and ${signedPersonaLimit} after signing in.`,
          world,
          language,
          cadence: normalizeCadence("steady_calm", world),
          personaId: activePersona.id,
          personaName: language === "ar" ? activePersona.nameAr : activePersona.nameEn,
          avatarPath: activePersona.avatarPath,
        },
      ]);
      setPaywallOpen(true);
      return;
    }

    void startPersonaUnlockCheckout(personaIdToUnlock);
  }

  function showAccessLimitMessage() {
    const text =
      accessState === "anonymous"
        ? language === "ar"
          ? `استخدمت جلسة الزائر المجانية (${anonymousReflectionLimit} ردود). سجّل دخولك لتحصل على هدية ${signedGiftReflectionLimit} ردًا و${signedPersonaLimit} رفقاء بدون دفع.`
          : `You used the anonymous free session (${anonymousReflectionLimit} replies). Sign in to claim ${signedGiftReflectionLimit} gift replies and ${signedPersonaLimit} companions before paying.`
        : language === "ar"
          ? `انتهت هدية الحساب المجانية (${signedGiftReflectionLimit} ردًا). بلس يحفظ رحلتك ويفتح كل الرفقاء والمتابعة الأعمق.`
          : `Your signed-in gift is used (${signedGiftReflectionLimit} replies). Plus saves your journey and unlocks all companions with deeper continuity.`;

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text,
        world,
        language,
        cadence: normalizeCadence("steady_calm", world),
        personaId: activePersona.id,
        personaName: language === "ar" ? activePersona.nameAr : activePersona.nameEn,
        avatarPath: activePersona.avatarPath,
      },
    ]);
    setPaywallOpen(true);
  }

  function saveCustomPersona(draft: CustomPersonaDraft) {
    const nextDraft = { name: draft.name.trim(), description: draft.description.trim(), avatarPath: isAllowedCustomAvatarPath(draft.avatarPath) ? draft.avatarPath : inferCustomAvatarPath(draft.description) };
    if (!nextDraft.name || !nextDraft.description) return;
    const nextPersona = buildCustomPersona(nextDraft);
    if (!nextPersona) return;
    const welcomeText = language === "ar"
      ? `أهلاً، أنا ${nextDraft.name}. أصبحت جاهزاً أتكلم مع الزوار وأرد بصوتي داخل فضفضة.`
      : `Hi, I am ${nextDraft.name}. I am ready to speak with visitors in my own voice inside FadFada.`;
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: welcomeText,
      world,
      language,
      cadence: normalizeCadence("steady_calm", world),
      personaId: "custom",
      personaName: nextPersona.nameAr,
      avatarPath: nextPersona.avatarPath,
    };

    localStorage.setItem(customPersonaStorageKey, JSON.stringify(nextDraft));
    setCustomPersonaDraft(nextDraft);
    setPersonaId("custom");
    setMessages((current) => [...current, welcomeMessage]);
    stopVoicePlayback();
    window.setTimeout(() => speakTextWithPersona(welcomeText, language, nextPersona, welcomeMessage.id), 140);
    trackInteraction("starter_tap", { type: "custom_persona", language });
    window.setTimeout(focusInput, 80);
  }

  function selectPersona(nextPersonaId: PersonaId) {
    setPersonaId(nextPersonaId);
    window.setTimeout(focusInput, 80);
  }

  function startStoryGuide(story: ChildStory) {
    const storyPersona = globallyAvailablePersonas.find((persona) => persona.id === story.personaId) ?? personas.find((persona) => persona.id === story.personaId);
    if (!storyPersona) return;

    const storyWorld = storyPersona.primaryWorldId in worlds ? storyPersona.primaryWorldId as WorldId : "story";
    const guideName = language === "ar" ? storyPersona.nameAr : storyPersona.nameEn;
    const storyTitle = language === "ar" ? story.titleAr : story.titleEn;
    const starterText = language === "ar"
      ? `جاهز! اخترت ${guideName} ليقود قصة "${storyTitle}". اكتب اختياراً قصيراً أو اضغط أحد أزرار القصة، وسنحولها إلى لعبة تفاعلية.`
      : `Ready. ${guideName} will guide "${storyTitle}". Type a short choice or tap one of the story buttons, and we will turn it into an interactive game.`;

    setPersonaId(storyPersona.id);
    setWorld(storyWorld);
    setPersonaOpen(false);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: starterText,
        world: storyWorld,
        language,
        cadence: normalizeCadence("rapid_energetic", storyWorld),
        suggestions: (language === "ar" ? story.tapChoicesAr : story.tapChoicesEn).slice(0, 3),
        personaId: storyPersona.id,
        personaName: guideName,
        avatarPath: storyPersona.avatarPath,
        childStoryId: story.id,
      },
    ]);
    window.setTimeout(() => {
      scrollToSection("chat");
      focusConversationTail("smooth");
    }, 120);
    void trackInteraction("starter_tap", { type: "story_guide_start", storyId: story.id, personaId: story.personaId, language });
  }

  function closeVisitorShowcase() {
    localStorage.setItem("fadfada-visitor-showcase-seen", "true");
    setVisitorShowcaseOpen(false);
  }

  function runStoryboardDemo() {
    const storyPersona = personas.find((persona) => persona.id === "rawi") ?? activePersona;
    closeVisitorShowcase();
    submitJudgeScenario(
      language === "ar"
        ? "اصنعي مثالاً بصرياً إبداعياً: شخص يدخل غرفة هادئة مليئة بضوء ذهبي وظلال زرقاء، يحمل شعور أن أحداً قلل من ألمه. حوّليها إلى لوحة مشاهد بثلاث صور رمزية: اللحظة كما دخلت، المرآة الهادئة، والخطوة الصغيرة نحو ضوء واضح. اجعلي البرومبتات صالحة لتوليد صور سينمائية آمنة بدون نص داخل الصورة."
        : "Create a creative visual demo: a person enters a quiet room filled with golden light and blue shadows, carrying the feeling that someone minimized their pain. Turn it into a three-image symbolic storyboard: the moment as it arrived, the calm mirror, and one small step toward clear light. Make the prompts ready for safe cinematic image generation with no text inside the image.",
      "story",
      language,
      storyPersona.id
    );
  }

  function openFeatureStudio() {
    setVisitorShowcaseOpen(true);
    void trackInteraction("starter_tap", { type: "floating_studio_open", language });
  }

  function openStoryboardGallery() {
    setToolsOpen(false);
    setStoryboardGalleryOpen(true);
    void trackInteraction("starter_tap", { type: "floating_storyboard_gallery", language });
  }

  function openSecretShortcuts() {
    setActiveHomePanel("prompts");
    setToolsOpen(true);
    void trackInteraction("starter_tap", { type: "floating_secret_shortcuts", language });
  }

  const visitorShowcaseDialog = visitorShowcaseOpen && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-[#050607]/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-8" role="dialog" aria-modal="true" aria-label={language === "ar" ? "استكشاف فضفضة" : "Explore FadFada"} dir={language === "ar" ? "rtl" : "ltr"}>
      <button type="button" className="absolute inset-0" onClick={closeVisitorShowcase} aria-label={language === "ar" ? "إغلاق المقدمة" : "Close intro"} />
      <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#0E0D10]/96 p-4 shadow-[0_32px_120px_rgba(0,0,0,0.58)] sm:p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-start">
            <p className="ui-kicker text-[#C9A86A]/85">{language === "ar" ? "مقدمة سريعة" : "Quick intro"}</p>
            <h2 className="mt-2 max-w-2xl font-arui text-2xl font-semibold leading-8 text-[#F7F3EC]/95 sm:text-3xl sm:leading-10">
              {language === "ar" ? "كل الميزات هنا عند الحاجة، والمحادثة تبقى هادئة" : "All features live here on demand, while chat stays calm"}
            </h2>
            <p className="mt-2 max-w-2xl font-arsans text-sm leading-6 text-[#F7F3EC]/58">
              {language === "ar" ? "اكتب مباشرة في المحادثة. افتح هذه الشاشة فقط عندما تريد ديمو، رفيقاً، لوحة مشاهد، أو أدوات Gemini." : "Write directly in chat. Open this screen only when you want the demo, companions, storyboard, or Gemini tools."}
            </p>
            <TrustChipRow language={language} />
          </div>
          <button type="button" onClick={closeVisitorShowcase} className="ui-action h-10 w-10 shrink-0 rounded-full border border-white/12 bg-black/22 text-lg text-[#F7F3EC]/70 transition-colors hover:border-[#F7F3EC]/35 hover:text-[#F7F3EC]" aria-label={language === "ar" ? "إغلاق" : "Close"}>×</button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto pb-2 pt-4 [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
          <SmartFeatureShowcase
            language={language}
            userId={userId}
            accessState={accessState}
            currentWorld={world}
            avatarsEnabled={avatarsEnabled}
            availablePersonas={visiblePersonas}
            unlockedPersonaIds={unlockedPersonaIds}
            onRequirePlus={() => setPaywallOpen(true)}
            onContent={() => {
              closeVisitorShowcase();
              submitClientGeminiContentPack();
            }}
            onPersona={() => {
              closeVisitorShowcase();
              if (avatarsEnabled) setPersonaOpen(true);
            }}
            onStory={() => {
              closeVisitorShowcase();
              submitClientGeminiStoryDemo();
            }}
            onVisitorChallenge={(text, nextWorld, nextPersonaId) => {
              closeVisitorShowcase();
              submitVisitorChallenge(text, nextWorld, nextPersonaId);
            }}
            onLifeProject={(text, nextWorld, nextPersonaId, projectBadge) => {
              closeVisitorShowcase();
              submitLifeProjectTemplate(text, nextWorld, nextPersonaId, projectBadge);
            }}
            onConsultant={(text, nextWorld, nextPersonaId, consultantBadge) => {
              closeVisitorShowcase();
              submitConsultantScenario(text, nextWorld, nextPersonaId, consultantBadge);
            }}
          />
          {plusWelcomeOpen ? (
            <PlusWelcomeCard
              language={language}
              onClose={() => setPlusWelcomeOpen(false)}
              onExplore={() => {
                setPlusWelcomeOpen(false);
                closeVisitorShowcase();
                setToolsOpen(true);
                setActiveHomePanel("plans");
              }}
            />
          ) : null}
          <FeatureAnnouncementCard language={language} onTry={runStoryboardDemo} />
          <JudgeDemoCallout language={language} onRun={() => {
            const scenario = judgeDemoScenarios[language][0];
            closeVisitorShowcase();
            submitJudgeScenario(scenario.text, scenario.world, scenario.targetLanguage, scenario.personaId);
          }} />
          <FirstMomentPanel language={language} onSelect={(text, nextWorld) => {
            closeVisitorShowcase();
            submitStarterMoment(text, nextWorld);
          }} onPersona={avatarsEnabled ? () => {
            closeVisitorShowcase();
            setPersonaOpen(true);
          } : undefined} onDemo={runStoryboardDemo} />
          <ReturnMemoryCard
            language={language}
            continuity={conversationContinuity}
            onContinue={() => {
              closeVisitorShowcase();
              scrollToSection("chat");
              window.setTimeout(focusInput, 120);
            }}
            onSaveSnapshot={saveJourneySnapshot}
          />
        </div>
      </section>
    </div>,
    document.body
  ) : null;

  const receiptDialog = receiptOpen && latestAssistantMessage && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[82] grid place-items-center bg-black/68 px-3 py-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={language === "ar" ? "خلاصة الفضفضة" : "Reflection summary"} dir={language === "ar" ? "rtl" : "ltr"}>
      <button type="button" className="absolute inset-0" onClick={() => setReceiptOpen(false)} aria-label={language === "ar" ? "إغلاق الخلاصة" : "Close summary"} />
      <section className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#0E0D10]/96 p-3 shadow-2xl backdrop-blur-2xl [scrollbar-color:rgba(201,168,106,0.45)_transparent] sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="ui-kicker text-[#C9A86A]/85">{language === "ar" ? "خلاصة عند الطلب" : "On-demand summary"}</p>
          <button type="button" onClick={() => setReceiptOpen(false)} className="ui-action rounded-full border border-white/10 px-3 py-2 text-xs text-[#F7F3EC]/60 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
            {language === "ar" ? "إغلاق" : "Close"}
          </button>
        </div>
        <ReflectionReceiptCard
          language={language}
          message={latestAssistantMessage}
          userMessage={latestUserMessage}
          personaName={latestAssistantMessage.personaName || activePersonaDisplayName}
          onSaveSnapshot={saveJourneySnapshot}
          onSafeShare={() => void shareSafeReceipt(latestAssistantMessage)}
          onProofShare={() => void shareProofCard(latestAssistantMessage)}
          onStartQuest={startGrowthQuest}
        />
      </section>
    </div>,
    document.body
  ) : null;

  const storyboardGalleryDialog = storyboardGalleryOpen && !isChildWorkspace && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[84] overflow-y-auto bg-[#050607]/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-8" role="dialog" aria-modal="true" aria-label={language === "ar" ? "معرض لوحة المشاهد" : "Storyboard gallery"} dir={language === "ar" ? "rtl" : "ltr"}>
      <button type="button" className="absolute inset-0" onClick={() => setStoryboardGalleryOpen(false)} aria-label={language === "ar" ? "إغلاق معرض لوحة المشاهد" : "Close storyboard gallery"} />
      <section className="relative mx-auto max-w-5xl rounded-[1.5rem] border border-blue-100/20 bg-[#0E0D10]/96 p-3 shadow-[0_32px_120px_rgba(0,0,0,0.58)] sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="text-start">
            <p className="ui-kicker text-blue-100/82">{language === "ar" ? "معرض الصور" : "Image gallery"}</p>
            <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/94">{language === "ar" ? "اصنع لوحة مشاهد بثلاث صور" : "Create a three-image storyboard"}</h2>
            <p className="mt-1 max-w-2xl font-arsans text-sm leading-6 text-[#F7F3EC]/55">
              {language === "ar" ? "هذه نفس ميزة لوحة المشاهد القديمة: صور، تبديل مشاهد، توليد صورة جديدة، نسخ البرومبتات، وتنزيل اللوحة." : "This restores the full storyboard flow: images, scene switching, new visual generation, prompt copy, and board download."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={submitClientGeminiStoryDemo} className="ui-action rounded-full border border-blue-100/30 px-3 py-2 text-xs text-blue-100 transition-colors hover:bg-blue-100 hover:text-[#0E0D10]">
              {language === "ar" ? "ابدأ من المحادثة" : "Start from chat"}
            </button>
            <button type="button" onClick={() => setStoryboardGalleryOpen(false)} className="ui-action h-10 w-10 rounded-full border border-white/12 bg-black/22 text-lg text-[#F7F3EC]/70 transition-colors hover:border-[#F7F3EC]/35 hover:text-[#F7F3EC]" aria-label={language === "ar" ? "إغلاق" : "Close"}>×</button>
          </div>
        </div>
        <div className="max-h-[78vh] overflow-y-auto pb-2 [scrollbar-color:rgba(147,197,253,0.45)_transparent]">
          <StoryMirrorBoard language={language} shots={storyboardGalleryShots} />
        </div>
      </section>
    </div>,
    document.body
  ) : null;

  const activeHomeworkList = childHomeworkTab === "pending" ? pendingChildHomeworkAssignments : completedChildHomeworkAssignments;

  const childHomeworkDialog = childHomeworkDrawerOpen && isChildWorkspace && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-[#050607]/84 px-3 py-4 backdrop-blur-xl sm:px-5" role="dialog" aria-modal="true" aria-label={language === "ar" ? "قائمة الواجب" : "Homework list"} dir={language === "ar" ? "rtl" : "ltr"}>
      <button type="button" className="absolute inset-0" onClick={() => setChildHomeworkDrawerOpen(false)} aria-label={language === "ar" ? "إغلاق قائمة الواجب" : "Close homework list"} />
      <section className="relative mx-auto max-w-3xl rounded-[1.5rem] border border-emerald-100/22 bg-[#0E0D10]/96 p-3 shadow-[0_32px_120px_rgba(0,0,0,0.58)] sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="text-start">
            <p className="ui-kicker text-emerald-100/84">{language === "ar" ? "لوحة الواجب" : "Homework board"}</p>
            <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/94">{language === "ar" ? "واجباتي" : "My homework"}</h2>
            <p className="mt-1 font-arsans text-xs text-[#F7F3EC]/62" dir="ltr">{pendingChildHomeworkAssignments.length}/{childHomeworkAssignments.length} {language === "ar" ? "غير مكتمل" : "pending"}</p>
          </div>
          <button type="button" onClick={() => setChildHomeworkDrawerOpen(false)} className="ui-action h-10 w-10 rounded-full border border-white/12 bg-black/22 text-lg text-[#F7F3EC]/70 transition-colors hover:border-[#F7F3EC]/35 hover:text-[#F7F3EC]" aria-label={language === "ar" ? "إغلاق" : "Close"}>×</button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => setChildHomeworkTab("pending")}
            className={`ui-action flex-1 rounded-lg px-3 py-2 font-arsans text-xs transition-colors ${childHomeworkTab === "pending" ? "bg-amber-100 text-[#0E0D10]" : "text-amber-100/78 hover:bg-amber-100/14"}`}
          >
            {language === "ar" ? "غير مكتمل" : "Pending"} ({pendingChildHomeworkAssignments.length})
          </button>
          <button
            type="button"
            onClick={() => setChildHomeworkTab("completed")}
            className={`ui-action flex-1 rounded-lg px-3 py-2 font-arsans text-xs transition-colors ${childHomeworkTab === "completed" ? "bg-emerald-100 text-[#0E0D10]" : "text-emerald-100/78 hover:bg-emerald-100/14"}`}
          >
            {language === "ar" ? "مكتمل" : "Completed"} ({completedChildHomeworkAssignments.length})
          </button>
        </div>

        <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(110,231,183,0.45)_transparent]">
          {activeHomeworkList.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/16 bg-black/25 p-3 font-arsans text-sm text-bone/70">
              {childHomeworkTab === "pending"
                ? (language === "ar" ? "ممتاز! لا يوجد واجب غير مكتمل الآن." : "Amazing! No pending homework right now.")
                : (language === "ar" ? "لا توجد واجبات مكتملة بعد." : "No completed homework yet.")}
            </p>
          ) : activeHomeworkList.map((assignment) => (
            <article key={assignment.id} className="rounded-xl border border-white/12 bg-[#050607] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-arsans text-sm font-semibold text-bone/90">{assignment.detectedTask}</p>
                  <p className="mt-1 font-arsans text-[11px] text-bone/52">{new Date(assignment.assignedAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}</p>
                </div>
                {assignment.missionCompleted ? (
                  <span className="rounded-full border border-emerald-100/28 bg-emerald-100/14 px-2 py-0.5 font-arsans text-[10px] text-emerald-100">{language === "ar" ? "مكتمل" : "Completed"}</span>
                ) : (
                  <span className="rounded-full border border-amber-100/28 bg-amber-100/12 px-2 py-0.5 font-arsans text-[10px] text-amber-100">{language === "ar" ? "قيد الحل" : "In progress"}</span>
                )}
              </div>

              <p className="mt-2 font-arsans text-xs text-bone/72 line-clamp-2">{assignment.childIntro}</p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-arsans text-[11px] text-bone/55" dir="ltr">{assignment.activities.length} {language === "ar" ? "أنشطة" : "activities"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setChildHomeworkDrawerOpen(false);
                    startChildHomework(assignment);
                  }}
                  className="ui-action rounded-lg border border-emerald-100/26 bg-emerald-100/14 px-3 py-1.5 font-arsans text-xs text-emerald-50 hover:bg-emerald-100 hover:text-[#0E0D10]"
                >
                  {assignment.missionCompleted
                    ? (language === "ar" ? "أعد اللعب" : "Replay")
                    : (language === "ar" ? "ابدأ الواجب" : "Start homework")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>,
    document.body
  ) : null;

  return (
    <main
      className={`relative mx-auto flex min-h-screen max-w-5xl flex-col overflow-hidden px-4 pb-40 pt-20 transition-all duration-700 ease-in-out sm:pb-48 md:pb-40 ${personaEnvironment.ambientClassName} ${personaEnvironment.textClassName} ${personaEnvironment.typographyClassName}`}
      style={{
        backgroundImage: activeWorld.gradient,
        "--persona-aura": personaAura,
        "--persona-aura-soft": hexToRgba(personaAura, 0.22),
        "--persona-aura-faint": hexToRgba(personaAura, 0.1),
      } as React.CSSProperties}
    >
      <div className={`persona-ambient-layer pointer-events-none absolute inset-0 ${personaEnvironment.animationClassName}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(247,243,236,0.08),transparent_22rem)]" />

      <header className="relative z-10 flex min-h-44 items-start justify-between sm:min-h-24">
        <button type="button" onClick={() => void startNewChatSession()} className="ui-action rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs text-[#F7F3EC]/70 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
          {language === "ar" ? "محادثة جديدة" : "New chat"}
        </button>
        {avatarsEnabled && sessionReady ? (
        <div className="absolute left-1/2 top-12 flex w-36 -translate-x-1/2 flex-col items-center gap-1.5 sm:top-0 sm:w-40">
          <button
            type="button"
            onClick={openAvatarDrawer}
            className="flex w-full flex-col items-center gap-1.5 rounded-[1.25rem] border border-white/10 bg-black/15 px-3 py-2 text-center outline-none backdrop-blur-sm transition-colors hover:border-[#C9A86A]/45"
            aria-label={language === "ar" ? `افتح اختيار الرفيق ${activePersona.nameAr}` : `Open persona drawer for ${activePersona.nameEn}`}
          >
            <span
              className={`h-16 w-16 sm:h-[4.75rem] sm:w-[4.75rem] ${headerAvatarFrameClass} rounded-[1.65rem] transition-all duration-500 ${isThinking ? "animate-pulse scale-105" : "animate-breathe scale-105 duration-[4000ms]"
                }`}
              style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.14), 0 0 44px ${activeHeaderPresentation.auraHex}C8, 0 26px 76px ${activeHeaderPresentation.auraHex}82` }}
            >
              {isGeneratedAvatarPath(activeHeaderPresentation.avatarPath) || isSvgAvatarPath(activeHeaderPresentation.avatarPath) ? (
                <img src={activeHeaderPresentation.avatarPath} alt={`${activePersonaDisplayName} avatar`} className="h-full w-full object-cover" />
              ) : (
                <Image
                  src={activeHeaderPresentation.avatarPath}
                  alt={`${activePersonaDisplayName} avatar`}
                  fill
                  sizes="76px"
                  priority
                  className="object-cover"
                />
              )}
            </span>
            <span className="flex min-w-0 flex-col items-center gap-0.5 text-bone/90">
              <span className={`max-w-28 truncate text-sm font-semibold ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{activePersonaDisplayName}</span>
              <span className={`max-w-32 truncate text-[10px] text-[#C9A86A]/75 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{language === "ar" ? activePersona.roleAr : activePersona.roleEn}</span>
            </span>
          </button>
          <div className="flex items-center justify-center gap-0.5 rounded-full border border-white/10 bg-black/20 px-1.5 py-1 backdrop-blur-sm" dir="ltr" aria-label={language === "ar" ? "تقييم صورة الرفيق" : "Rate avatar"}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => void rateActiveAvatar(rating)}
                disabled={activeAvatarRatingStatus === "saving"}
                className={`grid h-5 w-5 place-items-center rounded-full text-[13px] leading-none transition disabled:cursor-wait disabled:opacity-60 ${(activeAvatarRatings[activePersona.id] || 0) >= rating ? "text-[#C9A86A]" : "text-[#C9A86A]/38 hover:text-[#C9A86A]"}`}
                aria-label={language === "ar" ? `تقييم ${rating} من 5` : `Rate ${rating} out of 5`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        ) : null}
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="font-arserif text-2xl text-[#F7F3EC]/95 sm:text-3xl">فضفضة</span>
        </div>
      </header>

      <section ref={homeRef} className="relative z-10 mt-8 scroll-mt-24 flex flex-col items-center">
        <div className="hidden min-[360px]:block">
          <PresenceOrb world={world} color={activeWorld.orbHex} />
        </div>
        <h1 className="mt-3 text-center font-arui text-2xl font-semibold leading-tight text-[#F7F3EC]/95 min-[360px]:mt-4 min-[360px]:text-3xl">
          {isChildWorkspace
            ? language === "ar" ? `أهلاً ${activeChildNickname || "يا بطل"}` : `Hi ${activeChildNickname || "friend"}`
            : language === "ar" ? "فضفضة ليست شات عام" : "FadFada is not a generic chat"}
        </h1>
        <p className="mt-2 max-w-md text-center font-arsans text-base font-medium leading-7 text-[#F7F3EC]/76">
          {isChildWorkspace
            ? language === "ar"
              ? "هذه مساحة أطفال آمنة: قصص، ألغاز، تعلم، ورفاق أطفال فقط."
              : "This is a safe child space: stories, puzzles, learning, and children companions only."
            : language === "ar"
              ? "مساحة عربية/إنجليزية هادئة: اكتب ما بداخلك، واختر من القائمة عندما تحتاج رفيقًا أو خطوة أو حفظ لحظة."
              : "A calm Arabic/English space: write what is inside, then open the menu when you need a companion, a step, or a saved moment."}
        </p>
        {isChildWorkspace ? (
          <div className="mt-5 w-full max-w-2xl" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-1.5">
                <button type="button" onClick={startChildTapGame} className="ui-action h-10 min-w-[6.4rem] shrink-0 rounded-xl bg-[#E6C36A] px-3 text-xs text-[#0E0D10] shadow-[0_10px_24px_rgba(230,195,106,0.2)] transition-colors hover:bg-[#F7F3EC]">
                  {language === "ar" ? "ابدأ اللعب" : "Start playing"}
                </button>
                <button type="button" onClick={openStoryShelf} className="ui-action inline-flex h-10 min-w-[5.6rem] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-200/35 bg-sky-200/10 px-3 text-xs text-sky-100 transition-colors hover:bg-sky-200 hover:text-[#0E0D10]">
                  <StoryIcon />
                  <span>{language === "ar" ? "القصص" : "Stories"}</span>
                </button>
                <button type="button" onClick={() => avatarsEnabled ? openAvatarDrawer() : setToolsOpen(true)} className="ui-action h-10 min-w-[6.9rem] shrink-0 rounded-xl border border-white/18 bg-white/[0.055] px-3 text-xs text-[#F7F3EC]/84 transition-colors hover:border-[#F7F3EC]/45 hover:text-[#F7F3EC]">
                  {language === "ar" ? "اختر رفيقك" : "Choose your friend"}
                </button>
                <button
                  type="button"
                  onClick={() => setChildHomeworkDrawerOpen(true)}
                  className="ui-action h-10 min-w-[6.4rem] shrink-0 rounded-xl border border-emerald-100/24 bg-emerald-100/12 px-3 text-xs text-emerald-50 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]"
                >
                  {language === "ar" ? "الواجب" : "Homework"}
                </button>
                <button
                  type="button"
                  onClick={() => startDailyChildMoment(activeChildMomentSlide.item, activeChildMomentSlide.id)}
                  disabled={isThinking || !activePersonaIsChild}
                  className="ui-action h-10 min-w-[6.4rem] shrink-0 rounded-xl border border-sky-100/24 bg-sky-100/[0.11] px-3 text-xs text-sky-50 transition-colors hover:bg-sky-100 hover:text-[#0E0D10] disabled:cursor-wait disabled:opacity-60"
                >
                  {language === "ar" ? "لحظة اليوم" : "Today moment"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-3" dir={language === "ar" ? "rtl" : "ltr"}>
            <button type="button" onClick={focusInput} className="ui-action rounded-xl bg-[#E6C36A] px-4 py-3 text-[#0E0D10] shadow-[0_14px_34px_rgba(230,195,106,0.22)] transition-colors hover:bg-[#F7F3EC]">
              {language === "ar" ? "ابدأ الفضفضة" : "Start venting"}
            </button>
            <button type="button" onClick={() => setVisitorShowcaseOpen(true)} className="ui-action rounded-xl border border-[#E6C36A]/45 bg-black/24 px-4 py-3 text-[#E6C36A] transition-colors hover:bg-[#E6C36A] hover:text-[#0E0D10]">
              {language === "ar" ? "استكشف الميزات" : "Explore features"}
            </button>
            <button type="button" onClick={() => avatarsEnabled ? openAvatarDrawer() : setToolsOpen(true)} className="ui-action rounded-xl border border-white/18 bg-white/[0.055] px-4 py-3 text-[#F7F3EC]/84 transition-colors hover:border-[#F7F3EC]/45 hover:text-[#F7F3EC]">
              {language === "ar" ? "اختر رفيق" : "Choose persona"}
            </button>
          </div>
        )}
        {!isChildWorkspace ? (
          <div className="mt-4 w-full max-w-2xl rounded-3xl border border-[#E6C36A]/18 bg-black/18 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.2)]" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-start">
              <p className="font-arsans text-xs font-semibold text-[#E6C36A]/82">{language === "ar" ? "الأدوات السريعة" : "Quick creation tools"}</p>
              <button type="button" onClick={() => setToolsOpen(true)} className="font-arsans text-xs font-semibold text-[#F7F3EC]/62 transition-colors hover:text-[#E6C36A]">
                {language === "ar" ? "كل الأدوات" : "All tools"}
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              {[
                {
                  id: "storyboard",
                  icon: "movie",
                  ar: "لوحة مشاهد",
                  en: "Storyboard",
                  helperAr: "حوّل الشعور لمشاهد",
                  helperEn: "turn a feeling into scenes",
                  onClick: openStoryboardGallery,
                },
                {
                  id: "checkin",
                  icon: "monitor_heart",
                  ar: "نبض اليوم",
                  en: "Check-in",
                  helperAr: "مزاج وطاقة وخطوة",
                  helperEn: "mood, energy, next step",
                  onClick: () => {
                    setActiveHomePanel("checkin");
                    setToolsOpen(true);
                  },
                },
                {
                  id: "progress",
                  icon: "route",
                  ar: "التقدم",
                  en: "Progress",
                  helperAr: "استمر أو ابدأ تحدي",
                  helperEn: "continue or start a quest",
                  onClick: () => {
                    setActiveHomePanel("progress");
                    setToolsOpen(true);
                  },
                },
                {
                  id: "sessions",
                  icon: "history",
                  ar: "الجلسات",
                  en: "Sessions",
                  helperAr: "حفظ وفتح المحادثات",
                  helperEn: "save and reopen chats",
                  onClick: () => {
                    setActiveHomePanel("sessions");
                    setToolsOpen(true);
                  },
                },
                {
                  id: "secrets",
                  icon: "auto_awesome",
                  ar: "الأسرار",
                  en: "Secrets",
                  helperAr: "اختصارات العرض بلمسة",
                  helperEn: "tap-ready demo shortcuts",
                  onClick: () => {
                    setActiveHomePanel("prompts");
                    setToolsOpen(true);
                  },
                },
              ].map((tool) => (
                <button key={tool.id} type="button" onClick={tool.onClick} className="group min-h-24 rounded-2xl border border-white/12 bg-white/[0.045] p-3 text-start transition duration-300 hover:-translate-y-0.5 hover:border-[#E6C36A]/42 hover:bg-[#E6C36A]/10">
                  <SymbolIcon name={tool.icon} className="h-5 w-5 text-[#E6C36A]/82" />
                  <span className="mt-2 block font-arsans text-sm font-bold text-[#F7F3EC]/90">{language === "ar" ? tool.ar : tool.en}</span>
                  <span className="mt-1 block font-arsans text-[11px] leading-4 text-[#F7F3EC]/54 group-hover:text-[#F7F3EC]/72">{language === "ar" ? tool.helperAr : tool.helperEn}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {isChildWorkspace ? (
          <div className="mt-4 w-full max-w-2xl rounded-3xl border border-sky-100/20 bg-gradient-to-b from-sky-100/[0.08] to-emerald-100/[0.06] p-2.5 shadow-[0_20px_56px_rgba(56,189,248,0.1)]" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-2xl border border-sky-100/20 bg-black/16 p-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5 text-start">
                  <p className="font-arsans text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100/72">{language === "ar" ? "لحظة اليوم" : "Today"}</p>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChildMomentSlideIndex((current) => (current - 1 + childMomentSlides.length) % childMomentSlides.length)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-sky-100/24 bg-black/22 text-sky-100/72 transition-colors hover:bg-sky-100/15"
                    aria-label={language === "ar" ? "السابق" : "Previous"}
                  >
                    <span className="font-arsans text-sm">{language === "ar" ? "→" : "←"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startDailyChildMoment(activeChildMomentSlide.item, activeChildMomentSlide.id)}
                    disabled={isThinking || !activePersonaIsChild}
                    className={`group relative min-h-24 flex-1 overflow-hidden rounded-xl border p-3 text-start shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition duration-300 hover:-translate-y-0.5 hover:border-[#F7F3EC]/35 disabled:cursor-wait disabled:opacity-60 ${activeChildMomentSlide.cardClassName}`}
                  >
                    <span className="absolute -right-2 -top-2 text-3xl opacity-25">{activeChildMomentSlide.emoji}</span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-arsans text-sm font-bold text-[#F7F3EC] line-clamp-1">{activeChildMomentSlide.item.label}</span>
                      <SymbolIcon name={activeChildMomentSlide.icon} className="h-5 w-5 text-current/60" />
                    </span>
                    <span className="mt-2.5 inline-flex rounded-full border border-white/20 bg-black/18 px-2.5 py-0.5 font-arsans text-[11px] font-semibold text-[#F7F3EC]/86">
                      {language === "ar" ? "ابدأ" : "Start"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChildMomentSlideIndex((current) => (current + 1) % childMomentSlides.length)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-sky-100/24 bg-black/22 text-sky-100/72 transition-colors hover:bg-sky-100/15"
                    aria-label={language === "ar" ? "التالي" : "Next"}
                  >
                    <span className="font-arsans text-sm">{language === "ar" ? "←" : "→"}</span>
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-center gap-1" aria-hidden="true">
                  {childMomentSlides.map((slide, index) => (
                    <span
                      key={slide.id}
                      className={`h-1 rounded-full transition-all ${index === childMomentSlideIndex ? "w-4 bg-sky-100/90" : "w-1 bg-sky-100/35"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100/20 bg-black/16 p-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5 text-start">
                  <p className="font-arsans text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-100/72">{language === "ar" ? "واجباتي" : "My homework"}</p>
                  <span className="rounded-full border border-emerald-100/16 bg-black/20 px-2 py-0.5 font-mono text-[9px] text-emerald-100/60" dir="ltr">{pendingChildHomeworkAssignments.length}/{childHomeworkAssignments.length}</span>
                </div>
                <div className="mt-2">
                  {childHomeworkSlides.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setChildHomeworkSlideIndex((current) => (current - 1 + childHomeworkSlides.length) % childHomeworkSlides.length)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-emerald-100/24 bg-black/22 text-emerald-100/72 transition-colors hover:bg-emerald-100/15"
                        aria-label={language === "ar" ? "السابق" : "Previous"}
                      >
                        <span className="font-arsans text-sm">{language === "ar" ? "→" : "←"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => activeChildHomeworkSlide && startChildHomework(activeChildHomeworkSlide)}
                        disabled={isThinking || !activePersonaIsChild || !activeChildHomeworkSlide}
                        className="group relative min-h-24 flex-1 overflow-hidden rounded-xl border border-emerald-100/24 bg-gradient-to-br from-black/18 to-emerald-100/10 p-3 text-start transition duration-300 hover:-translate-y-0.5 hover:border-emerald-100/42 disabled:cursor-wait disabled:opacity-60"
                      >
                        <span className="absolute -right-2 -top-2 text-3xl opacity-25">🎒</span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-arsans text-sm font-bold leading-5 text-[#F7F3EC]/94 line-clamp-1">{activeChildHomeworkSlide?.detectedTask || (language === "ar" ? "واجب" : "Homework")}</span>
                          <SymbolIcon name="school" className="h-5 w-5 shrink-0 text-emerald-100/58" />
                        </span>
                        <span className="mt-2.5 inline-flex rounded-full border border-emerald-100/25 px-2.5 py-0.5 font-arsans text-[11px] font-semibold text-emerald-100/82">
                          {activeChildHomeworkSlide?.missionCompleted
                            ? (language === "ar" ? "مكتمل" : "Completed")
                            : (language === "ar" ? "ابدأ" : "Start")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChildHomeworkSlideIndex((current) => (current + 1) % childHomeworkSlides.length)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-emerald-100/24 bg-black/22 text-emerald-100/72 transition-colors hover:bg-emerald-100/15"
                        aria-label={language === "ar" ? "التالي" : "Next"}
                      >
                        <span className="font-arsans text-sm">{language === "ar" ? "←" : "→"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-emerald-100/18 bg-black/12 p-3 text-start">
                      <p className="font-arsans text-xs font-semibold text-[#F7F3EC]/78">{childHomeworkStatus === "loading" ? (language === "ar" ? "جار التحميل..." : "Loading...") : language === "ar" ? "لا يوجد واجب بعد" : "No homework yet"}</p>
                    </div>
                  )}
                  {childHomeworkSlides.length > 1 ? (
                    <div className="mt-1.5 flex items-center justify-center gap-1" aria-hidden="true">
                      {childHomeworkSlides.map((assignment, index) => (
                        <span
                          key={assignment.id}
                          className={`h-1 rounded-full transition-all ${index === childHomeworkSlideIndex ? "w-4 bg-emerald-100/90" : "w-1 bg-emerald-100/35"}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {conversationContinuity && conversationContinuity.count > 0 ? (
          <button type="button" onClick={() => {
            scrollToSection("chat");
            window.setTimeout(focusInput, 120);
          }} className="mt-3 max-w-md rounded-full border border-emerald-100/20 bg-emerald-100/10 px-4 py-2 font-arsans text-xs text-emerald-100/78 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]" dir={language === "ar" ? "rtl" : "ltr"}>
            {language === "ar" ? `كمّل آخر خيط: ${conversationContinuity.topic}` : `Continue last thread: ${conversationContinuity.topic}`}
          </button>
        ) : null}
        <p className="mt-3 font-arsans text-sm font-medium text-[#F7F3EC]/62">{language === "ar" ? activeWorld.nameAr : activeWorld.nameEn}</p>
        {shareStatus !== "idle" ? (
          <p className="mt-3 rounded-full border border-cyan-100/20 bg-black/25 px-4 py-2 text-center font-arsans text-xs text-cyan-100" aria-live="polite">
            {shareStatus === "copied" ? (language === "ar" ? "تم نسخ نص المشاركة. إذا لم يظهر في لينكدإن، الصقه يدويًا." : "Share text copied. If LinkedIn leaves the post empty, paste it manually.") : language === "ar" ? "تعذر فتح المشاركة. انسخ الرابط يدويًا." : "Could not share. Copy the link manually."}
          </p>
        ) : null}
      </section>

      {visitorShowcaseDialog}

      <section
        ref={chatRef}
        className={`relative z-10 mx-auto mt-8 flex w-full max-w-[42rem] flex-1 flex-col gap-8 overflow-y-auto pb-20 text-right transition-opacity duration-500 ${paywallOpen ? "opacity-20" : "opacity-100"
          }`}
      >
        {messages.map((message) => {
          const messageLanguage = message.language || language;
          const messageDirection = messageLanguage === "ar" ? "rtl" : "ltr";
          const messageAlignment = messageLanguage === "ar" ? "text-right" : "text-left";
          const messagePersona = message.role === "assistant" ? resolveMessagePersona(message, customPersona) : activePersona;
          const messagePersonaPresentation = getHeaderAvatarPresentation(messagePersona);
          const messagePersonaEnvironment = getPersonaEnvironmentProfile(messagePersona.id);
          const messageAvatarPath = message.role === "assistant" ? message.avatarPath || messagePersonaPresentation.avatarPath : message.avatarPath || accountImage || undefined;
          const messageDisplayName = message.role === "assistant" ? message.personaName || getHeaderDisplayName(messagePersona, messageLanguage) : message.personaName || accountName;
          const userInitial = messageDisplayName.trim().slice(0, 1).toUpperCase() || (messageLanguage === "ar" ? "أ" : "U");
          const messageChildStory = message.childStoryId ? childStories.find((story) => story.id === message.childStoryId) : undefined;
          const messageHomeworkActivities = message.childHomeworkActivities?.length ? message.childHomeworkActivities : parseLegacyChildHomeworkActivities(message);
          const messageText = messageHomeworkActivities.length && !message.childHomeworkActivities?.length ? getLegacyHomeworkIntroText(message.text, messageLanguage) : message.text;

          return (
          <article key={message.id} className={`animate-rise-in ${messageAlignment}`} dir={messageDirection}>
            {message.role === "user" ? (
              <div className={`flex items-start gap-3 ${messageDirection === "rtl" ? "flex-row" : "flex-row-reverse"}`}>
                <span className="relative mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-2xl border border-[#C9A86A]/20 bg-[#0E0D10] shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                  {messageAvatarPath ? (
                    <Image src={messageAvatarPath} alt={messageDisplayName} fill sizes="32px" className="object-cover" unoptimized />
                  ) : (
                    <span className="grid h-full w-full place-items-center font-arsans text-xs font-semibold text-[#C9A86A]">{userInitial}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 font-arsans text-[11px] text-[#C9A86A]/58">{messageDisplayName}</p>
                  <p className={`font-arsans leading-[1.85] text-[#F7F3EC]/95 ${messageLanguage === "ar" ? "text-[15px]" : "text-base"}`}>{message.text}</p>
                  <span className="mt-3 block h-px w-7 bg-[#C9A86A]/70" />
                </div>
              </div>
            ) : (
              <div className={`flex items-start gap-3 ${messageDirection === "rtl" ? "flex-row-reverse" : "flex-row"}`}>
                <span className="relative mt-1 h-9 w-9 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0E0D10] shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                  {isGeneratedAvatarPath(messageAvatarPath) || isSvgAvatarPath(messageAvatarPath) ? (
                    <img src={messageAvatarPath} alt={messageDisplayName} className="h-full w-full object-cover" />
                  ) : (
                    <Image src={messageAvatarPath || messagePersonaPresentation.avatarPath} alt={messageDisplayName} fill sizes="36px" className="object-cover" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-2 font-arsans text-[11px] text-[#C9A86A]/70">{messageDisplayName}</p>
                  {message.generatedMedia ? <GeneratedMediaCard language={messageLanguage} asset={message.generatedMedia} /> : null}
                  {messageChildStory ? <ChildStorySceneCard story={messageChildStory} language={messageLanguage} /> : null}
                  {messageHomeworkActivities.length ? (
                    <ChildHomeworkActivityCards
                      activities={messageHomeworkActivities}
                      language={messageLanguage}
                      onPlayAction={startChildTapGame}
                      childProfileId={activeChildProfileId}
                      childNickname={activeChildNickname}
                    />
                  ) : null}
                  <TypewriterSync
                    text={messagePersonaEnvironment.formatAssistantText?.(messageText) ?? messageText}
                    language={messageLanguage}
                    cadence={resolvePersonaCadence(message.cadence, message.world, messagePersonaEnvironment)}
                    accentHex={messagePersona.glowColorHex}
                    className={messagePersonaEnvironment.typewriterClassName}
                    instant={animatedAssistantMessageIds.includes(message.id)}
                    onComplete={() => setAnimatedAssistantMessageIds((current) => current.includes(message.id) ? current : [...current, message.id])}
                  />
                  {message.resources?.length ? <LearningResourcePreview language={messageLanguage} resources={message.resources} /> : null}
                <MomentActions
                  language={language}
                  saved={savedMomentIds.includes(message.id)}
                  feedbackSent={feedbackMomentIds.includes(message.id)}
                  speaking={speakingMessageId === message.id}
                  pendingAction={actionLoadingKey?.startsWith(`${message.id}:`) ? actionLoadingKey.split(":")[1] as MomentActionKey : null}
                  onSpeak={() => void runMomentAction(message.id, "speak", () => toggleVoicePlayback(message))}
                  onSave={() => void runMomentAction(message.id, "save", () => saveMoment(message))}
                  onPlan={() => void runMomentAction(message.id, "plan", () => saveTinyPlan(message))}
                  onShare={() => void runMomentAction(message.id, "share", () => shareMoment(message))}
                  onProof={() => void runMomentAction(message.id, "proof", () => shareProofCard(message))}
                  onDownload={() => void runMomentAction(message.id, "download", () => downloadCapsule(message))}
                  onPersona={avatarsEnabled ? openAvatarDrawer : undefined}
                  onHelpful={() => void runMomentAction(message.id, "helpful", () => sendFeedback(message, "helpful_feedback"))}
                  onSofter={() => void runMomentAction(message.id, "softer", () => sendFeedback(message, "softer_feedback"))}
                />
                </div>
              </div>
            )}
          </article>
          );
        })}
        {isThinking ? (
          <ThinkingShimmer language={language} personaName={language === "ar" ? activePersona.nameAr : activePersona.nameEn} />
        ) : null}
        {!isChildWorkspace ? <ChatLegalLinks language={language} version={appVersion} /> : null}
        <div ref={chatEndRef} className="h-14 sm:h-20" aria-hidden="true" />
      </section>

      {paywallOpen ? <PaywallCard language={language} accessState={accessState} remainingReflections={remainingReflections} configuration={experienceConfiguration} loading={checkoutLoading} onCheckout={startCheckout} onSignIn={openSignInGift} onClose={() => setPaywallOpen(false)} /> : null}

      {receiptDialog}

      {storyboardGalleryDialog}

      {childHomeworkDialog}

      {toolsOpen ? (
        <HomeToolsDialog
          language={language}
          activePanel={activeHomePanel}
          onSelect={setActiveHomePanel}
          onClose={() => setToolsOpen(false)}
        >
          {activeHomePanel === "checkin" ? (
            <DailyPulseCheckIn
              language={language}
              value={dailyPulse}
              stats={dailyPulseStats}
              onChange={setDailyPulse}
              onSubmit={submitDailyPulse}
              disabled={isThinking}
            />
          ) : null}
          {activeHomePanel === "sessions" ? (
            <SessionHistoryPanel
              language={language}
              accessState={accessState}
              sessions={chatSessions}
              status={sessionStatus}
              onNewSession={startNewChatSession}
              onSaveSession={() => void saveCurrentChatSession("manual")}
              onRefresh={() => void loadChatSessions()}
              onOpenSession={(sessionItem) => void openChatSession(sessionItem)}
              onSignIn={openSignInGift}
            />
          ) : null}
          {activeHomePanel === "progress" ? (
            <>
              <ContinueThreadCard
                language={language}
                continuity={conversationContinuity}
                snapshotStatus={journeySnapshotStatus}
                questStatus={growthQuestStatus}
                onContinue={() => {
                  setToolsOpen(false);
                  scrollToSection("chat");
                  window.setTimeout(focusInput, 120);
                }}
                onSaveSnapshot={saveJourneySnapshot}
                onStartQuest={startGrowthQuest}
              />
              <ActiveQuestCard language={language} quests={growthQuests} onCompleteNext={completeNextQuestStep} onShareQuest={(quest) => void shareGrowthQuest(quest)} onInviteBuddy={(quest) => void inviteQuestBuddy(quest)} shareStatus={shareStatus} />
            </>
          ) : null}
          {activeHomePanel === "tone" ? (
            <>
              <WorldShiftRow language={language} world={world} onWorldChange={setWorld} />
              <BehaviorLab
                language={language}
                activeStyle={behaviorStyle}
                softerNext={softerNext}
                onSelect={setBehaviorStyle}
              />
            </>
          ) : null}
          {activeHomePanel === "prompts" ? (
            <>
              <SecretCommandGuide language={language} onSelect={stageSecretCommand} />
              <StarterMomentRail language={language} onSelect={submitStarterMoment} />
              <JudgeDemoRail language={language} onSelect={submitJudgeScenario} />
            </>
          ) : null}
          {activeHomePanel === "plans" ? (
            <PlanComparisonCard language={language} loading={checkoutLoading} status={checkoutStatus} onUpgrade={() => void startCheckout()} />
          ) : null}
          {activeHomePanel === "about" ? (
            <>
              <UserFlowGuide language={language} />
              <ProductPositioning language={language} open={storyOpen} onToggle={() => setStoryOpen((open) => !open)} />
              <FeatureStrip language={language} />
              <VisitorCommentBox
                language={language}
                value={visitorComment}
                status={visitorCommentStatus}
                onChange={(value) => {
                  setVisitorComment(value);
                  if (visitorCommentStatus !== "idle") setVisitorCommentStatus("idle");
                }}
                onSubmit={submitVisitorComment}
              />
            </>
          ) : null}
        </HomeToolsDialog>
      ) : null}

      <form onSubmit={submitMessage} className="fixed inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-h-[46dvh] max-w-[42rem] flex-col gap-2 overflow-y-auto rounded-[1.1rem] border border-white/10 bg-[#111014]/92 p-2.5 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl [scrollbar-width:thin] sm:max-h-none sm:rounded-[1.35rem] sm:p-3 md:bottom-6">
        <BottomNav
          language={language}
          onHome={() => scrollToSection("home")}
          onChat={() => {
            scrollToConversationEnd();
            window.setTimeout(() => {
              scrollToConversationEnd();
              focusInput();
            }, 120);
          }}
          onBreathe={() => setBreathingOpen(true)}
          onPersona={avatarsEnabled ? openAvatarDrawer : undefined}
          onStories={isChildWorkspace && avatarsEnabled ? openStoryShelf : undefined}
          onMenu={() => setToolsOpen(true)}
        />
        {!effectiveUserName ? (
          <div className="rounded-2xl border border-[#C9A86A]/25 bg-[#0E0D10]/90 p-2.5 shadow-xl sm:p-3" dir={language === "ar" ? "rtl" : "ltr"}>
            <p className="hidden font-arsans text-xs leading-5 text-[#F7F3EC]/68 min-[360px]:block">
              {language === "ar" ? "قبل ما نبدأ، اكتب اسمك أو الاسم الذي تحب أن نناديك به." : "Before we start, enter your name or what you would like to be called."}
            </p>
            <div className="flex items-center gap-2 min-[360px]:mt-2">
              <input
                ref={nameInputRef}
                value={visitorNameDraft}
                onChange={(event) => {
                  setVisitorNameDraft(event.target.value);
                  if (visitorNameStatus !== "idle") setVisitorNameStatus("idle");
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  saveVisitorName();
                }}
                maxLength={32}
                dir="auto"
                placeholder={language === "ar" ? "اسمك" : "Your name"}
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 font-arsans text-sm text-[#F7F3EC]/90 outline-none placeholder:text-[#F7F3EC]/28 focus:border-[#C9A86A]/55"
              />
              <button type="button" onClick={saveVisitorName} className="ui-action shrink-0 rounded-xl bg-[#C9A86A] px-3 py-2 font-arsans text-xs text-[#0E0D10] transition-colors hover:bg-[#F7F3EC] min-[360px]:px-4">
                {language === "ar" ? "حفظ" : "Save"}
              </button>
            </div>
            {nameGateMessage || visitorNameStatus === "error" ? (
              <p className="mt-2 font-arsans text-xs text-red-100/80">{language === "ar" ? "الاسم مطلوب قبل إرسال أي رسالة." : "A name is required before sending any message."}</p>
            ) : null}
          </div>
        ) : null}
        {accessState !== "plus" ? (
          <>
            <div className="hidden items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0E0D10]/82 px-3 py-2 shadow-xl min-[360px]:flex sm:rounded-full" dir={language === "ar" ? "rtl" : "ltr"}>
              <p className="min-w-0 truncate font-arsans text-[11px] text-[#F7F3EC]/58">
                {accessState === "anonymous"
                  ? language === "ar"
                    ? `زائر: ${remainingReflections} من ${anonymousReflectionLimit} ردود متبقية · سجّل لهدية ${signedGiftReflectionLimit}`
                    : `Visitor: ${remainingReflections} of ${anonymousReflectionLimit} replies left · sign in for ${signedGiftReflectionLimit}`
                  : language === "ar"
                    ? `هدية الحساب: ${remainingReflections} ردود متبقية · بلس يحفظ الرحلة`
                    : `Account gift: ${remainingReflections} replies left · Plus saves the journey`}
              </p>
              <button type="button" onClick={accessState === "anonymous" ? openSignInGift : () => setPaywallOpen(true)} className="ui-action shrink-0 rounded-full border border-[#C9A86A]/35 px-3 py-1.5 text-[11px] text-[#C9A86A] transition-colors hover:bg-[#C9A86A] hover:text-[#0E0D10]">
                {accessState === "anonymous" ? (language === "ar" ? "الهدية" : "Gift") : language === "ar" ? "بلس" : "Plus"}
              </button>
            </div>
            {activeDiscountCode ? (
              <p className="rounded-full border border-sky-200/20 bg-sky-200/10 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-sky-100" dir="ltr">
                Lemon discount {activeDiscountCode} ready for checkout
              </p>
            ) : null}
          </>
        ) : null}
        {voiceCaptureStatus !== "idle" ? (
          <p className="w-full rounded-lg border border-red-300/20 bg-red-300/10 px-3 py-2 font-arsans text-xs text-red-100" dir={language === "ar" ? "rtl" : "ltr"}>
            {voiceCaptureStatus === "unsupported"
              ? language === "ar"
                ? "التسجيل الصوتي غير مدعوم في هذا المتصفح. جرّب كروم أو إيدج."
                : "Voice recording is not supported in this browser. Try Chrome or Edge."
              : voiceCaptureStatus === "permission"
                ? language === "ar"
                  ? "الميكروفون غير مسموح. افتح إعدادات المتصفح واسمح للميكروفون لهذا الموقع."
                  : "Microphone permission is blocked. Open browser settings and allow microphone access for this site."
                : voiceCaptureStatus === "no-speech"
                  ? language === "ar"
                    ? "لم أسمع صوتًا واضحًا. قرّب الهاتف وتكلم مرة أخرى أو اكتب الرسالة."
                    : "I could not hear a clear voice. Bring the phone closer and try again, or type instead."
              : language === "ar"
                ? "لم يبدأ التسجيل. تأكد من السماح للميكروفون ثم جرّب مرة أخرى."
                : "Recording did not start. Allow microphone access, then try again."}
          </p>
        ) : null}
        {isOffline || offlineDraftSaved ? (
          <p className="w-full rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 font-arsans text-xs text-cyan-100" dir={language === "ar" ? "rtl" : "ltr"}>
            {isOffline
              ? language === "ar" ? "وضع بدون اتصال: اكتب الآن وسنحفظ المسودة محليًا حتى يعود الاتصال." : "Offline mode: write now and the draft stays local until connection returns."
              : language === "ar" ? "مسودة بدون اتصال جاهزة للإرسال." : "Offline draft is ready to send."}
          </p>
        ) : null}
        <div className="flex w-full items-end gap-2 sm:gap-3">
        {!isChildWorkspace ? (
          <div className="flex shrink-0 items-center gap-1.5" dir="ltr" aria-label={language === "ar" ? "أدوات الإدخال السريعة" : "Quick input tools"}>
            <button
              type="button"
              onClick={openFeatureStudio}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#E6C36A]/14 bg-black/36 text-[#E6C36A]/82 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-colors hover:border-[#E6C36A]/45 hover:bg-[#E6C36A]/12 hover:text-[#E6C36A] sm:h-11 sm:w-11"
              aria-label={language === "ar" ? "افتح استوديو الميزات" : "Open feature studio"}
              title={language === "ar" ? "استوديو" : "Studio"}
            >
              <SymbolIcon name="photo_camera" className="h-[1.15rem] w-[1.15rem]" />
            </button>
            <button
              type="button"
              onClick={openStoryboardGallery}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#E6C36A]/14 bg-black/36 text-[#E6C36A]/82 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-colors hover:border-[#E6C36A]/45 hover:bg-[#E6C36A]/12 hover:text-[#E6C36A] sm:h-11 sm:w-11"
              aria-label={language === "ar" ? "افتح معرض لوحة المشاهد" : "Open storyboard image gallery"}
              title={language === "ar" ? "معرض الصور" : "Storyboard gallery"}
            >
              <SymbolIcon name="photo_library" className="h-[1.15rem] w-[1.15rem]" />
            </button>
            <button
              type="button"
              onClick={toggleVoiceCapture}
              className={`relative grid h-10 w-10 place-items-center rounded-full border bg-black/36 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-colors sm:h-11 sm:w-11 ${isRecording ? "border-red-200/40 text-red-100 shadow-[0_0_0_6px_rgba(248,113,113,0.12)]" : "border-[#E6C36A]/14 text-[#E6C36A]/82 hover:border-[#E6C36A]/45 hover:bg-[#E6C36A]/12 hover:text-[#E6C36A]"}`}
              aria-pressed={isRecording}
              aria-label={isRecording ? (language === "ar" ? "إيقاف التسجيل الصوتي" : "Stop voice recording") : language === "ar" ? "تشغيل التسجيل الصوتي" : "Start voice recording"}
              title={isRecording ? (language === "ar" ? "إيقاف" : "Stop") : language === "ar" ? "صوت" : "Voice"}
            >
              <span className={isRecording ? "absolute inset-0 rounded-full border border-red-100/60 animate-ping" : "hidden"} />
              <SymbolIcon name="mic" className="h-[1.15rem] w-[1.15rem]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleVoiceCapture}
            className={`relative flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-2 py-2 font-arsans text-[11px] transition-colors min-[360px]:px-2.5 sm:min-h-11 sm:gap-2 sm:px-3 sm:text-xs ${isRecording ? "border-red-200/35 bg-red-200/10 text-red-100 shadow-[0_0_0_6px_rgba(248,113,113,0.12)]" : "border-[#F7F3EC]/10 bg-[#F7F3EC]/[0.03] text-[#C9A86A] hover:border-[#C9A86A]/45"
              }`}
            aria-pressed={isRecording}
            aria-label={isRecording ? (language === "ar" ? "إيقاف التسجيل الصوتي" : "Stop voice recording") : language === "ar" ? "تشغيل التسجيل الصوتي" : "Start voice recording"}
          >
            <span className={isRecording ? "absolute inset-0 rounded-full border border-[#C9A86A]/60 animate-ping" : "hidden"} />
            <span className="h-2.5 w-2.5 rounded-full bg-[#C9A86A]" aria-hidden="true" />
            <span className="hidden min-[360px]:inline">{isRecording ? (language === "ar" ? "إيقاف" : "Stop") : language === "ar" ? "صوت" : "Voice"}</span>
          </button>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => updateInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          rows={1}
          dir={language === "ar" ? "rtl" : "ltr"}
          placeholder={isChildWorkspace && activePersonaIsChild ? (language === "ar" ? "أو اكتب كلمة قصيرة..." : "Or type one short word...") : language === "ar" ? "فضفض هنا..." : "Write freely..."}
          className={`${isChildWorkspace && activePersonaIsChild ? "min-h-8 text-sm leading-6 opacity-78 sm:min-h-9 sm:text-sm" : "min-h-10 text-base leading-[1.75] sm:min-h-12 sm:text-lg sm:leading-[1.9]"} flex-1 border-0 bg-transparent font-arsans text-[#F7F3EC]/95 outline-none placeholder:text-[#F7F3EC]/25 ${language === "ar" ? "text-right" : "text-left"}`}
        />
        <button type="submit" disabled={isThinking} className={`ui-action pb-2 text-sm text-[#C9A86A] transition-colors hover:text-[#F7F3EC] disabled:opacity-60 sm:pb-3 ${isThinking ? "animate-pulse" : ""}`}>
          {isThinking ? (language === "ar" ? "ينتظر" : "Waiting") : language === "ar" ? "إرسال" : "Send"}
        </button>
        </div>
      </form>

      <PersonaDrawer
        open={personaOpen}
        activePersona={personaId}
        language={language}
        unlockedPersonaIds={unlockedPersonaIds}
        blockedPersonaIds={blockedPersonaIds}
        childrenOnly={isChildWorkspace}
        mode={personaDrawerMode}
        storyShelfSignal={storyShelfSignal}
        customPersona={customPersona}
        onClose={() => setPersonaOpen(false)}
        onSelect={selectPersona}
        onStoryGuideStart={startStoryGuide}
        onLockedPersonaSelect={handleLockedPersonaSelect}
        onCustomPersonaSave={saveCustomPersona}
        onAvatarRate={rateAvatar}
      />

      {breathingOpen ? (
        <BreathingExercise language={language} onClose={() => setBreathingOpen(false)} />
      ) : null}
    </main>
  );
}

const footballRoutingPattern = /football|soccer|world cup|fifa|match|score|fixture|fixtures|كورة|كرة|قدم|كأس العالم|كاس العالم|فيفا|مباراة|مباريات|منتخب|الدوري|الأهلي|الاهلي|الزمالك|ليفربول|ريال|برشلونة/i;
const liveNewsFollowUpRoutingPattern = /latest|news|updates|score|scores|fixture|fixtures|search|look up|find|browse|google|أخبار|اخبار|الأخبار|الاخبار|آخر|اخر|أخر|نتيجة|نتائج|جدول|ترتيب|ابحث|تبحث|البحث|دور|دوّر|جوجل|هاتلي|زودني|تزويدي|زوّدني/i;
const helperRoutingPattern = /who can help|which avatar|which companion|who should i ask|من يمكن|مين يساعد|مين ممكن يساعد|أي رفيق|اي رفيق|اختار مين|اكلم مين/i;

function getAutoRoutedPersona(text: string, messages: ChatMessage[], unlockedPersonaIds: PersonaId[], availablePersonas: Persona[]) {
  const isFootballRequest = footballRoutingPattern.test(text);
  const asksHelperAfterFootball = helperRoutingPattern.test(text) && messages.some((message) => message.role === "user" && footballRoutingPattern.test(message.text));
  const asksLiveNewsAfterFootball = liveNewsFollowUpRoutingPattern.test(text) && messages.some((message) => message.role === "user" && footballRoutingPattern.test(message.text));
  if (!isFootballRequest && !asksHelperAfterFootball && !asksLiveNewsAfterFootball) return null;

  const kareem = availablePersonas.find((persona) => persona.id === "kareem");
  if (!kareem || !unlockedPersonaIds.includes(kareem.id)) return null;
  return kareem;
}

function ChatLegalLinks({ language, version }: { language: Language; version: string | null }) {
  const isArabic = language === "ar";
  const links = [
    { href: "/pricing", label: isArabic ? "الأسعار" : "Pricing" },
    { href: "/terms", label: isArabic ? "الشروط" : "Terms" },
    { href: "/privacy", label: isArabic ? "الخصوصية" : "Privacy" },
    { href: "/refund", label: isArabic ? "الاسترداد" : "Refunds" },
  ];

  return (
    <nav className="mx-auto mt-3 flex w-full max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/10 bg-[#0E0D10]/64 px-3 py-2 text-center font-arsans text-[11px] text-[#F7F3EC]/42 shadow-xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"} aria-label={isArabic ? "روابط قانونية وإصدار التطبيق" : "Legal links and app version"}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="transition-colors hover:text-[#C9A86A]">
          {link.label}
        </Link>
      ))}
      {version ? <span className="font-mono text-[10px] text-[#C9A86A]/64" dir="ltr">v{version}</span> : null}
    </nav>
  );
}

function buildRecentMessages(messages: ChatMessage[]) {
  return messages.slice(-8).map((message) => ({
    role: message.role,
    text: message.text,
    world: message.world,
    language: message.language,
  }));
}

function buildChatSessionSnapshot(sessionId: string, messages: ChatMessage[], activePersonaId: PersonaId, activeWorld: WorldId, language: Language): ChatSessionSummary {
  const sanitizedMessages = sanitizeStoredMessages(messages).slice(-maxStoredMessages);
  const firstUserMessage = sanitizedMessages.find((message) => message.role === "user");
  const title = firstUserMessage?.text.slice(0, 64) || (language === "ar" ? "جلسة فضفضة جديدة" : "New FadFada session");

  return {
    sessionId: sessionId || `session:${crypto.randomUUID()}`,
    title,
    activePersonaId,
    activeWorld,
    language,
    messages: sanitizedMessages,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeChatSessions(value: unknown): ChatSessionSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((sessionItem): ChatSessionSummary | null => {
      const candidate = sessionItem as Partial<ChatSessionSummary>;
      const sessionId = typeof candidate.sessionId === "string" && candidate.sessionId ? candidate.sessionId.slice(0, 120) : "";
      const activeWorld = candidate.activeWorld && candidate.activeWorld in worlds ? candidate.activeWorld : "calm";
      const language = candidate.language === "ar" || candidate.language === "en" ? candidate.language : "ar";
      if (!sessionId) return null;

      return {
        sessionId,
        title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title.trim().slice(0, 90) : language === "ar" ? "جلسة فضفضة" : "FadFada session",
        activePersonaId: typeof candidate.activePersonaId === "string" && candidate.activePersonaId ? candidate.activePersonaId.slice(0, 80) : "omar",
        activeWorld,
        language,
        messages: sanitizeStoredMessages(candidate.messages),
        messageCount: typeof candidate.messageCount === "number" && Number.isFinite(candidate.messageCount) ? Math.max(0, Math.round(candidate.messageCount)) : undefined,
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined,
      };
    })
    .filter((sessionItem): sessionItem is ChatSessionSummary => Boolean(sessionItem))
    .slice(0, 24);
}

function sanitizeStoredMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message): ChatMessage | null => {
      const candidate = message as Partial<ChatMessage>;
      const role = candidate.role === "user" || candidate.role === "assistant" ? candidate.role : null;
      const text = typeof candidate.text === "string" ? candidate.text.trim().slice(0, 6000) : "";
      const world = candidate.world && candidate.world in worlds ? candidate.world : "calm";
      const language = candidate.language === "ar" || candidate.language === "en" ? candidate.language : undefined;
      const cadence = normalizeCadence(candidate.cadence, world);
      const personaId = typeof candidate.personaId === "string" ? candidate.personaId.slice(0, 80) : undefined;
      const personaName = typeof candidate.personaName === "string" ? candidate.personaName.slice(0, 120) : undefined;
      const avatarPath = typeof candidate.avatarPath === "string" && candidate.avatarPath.length < 2_600_000 ? candidate.avatarPath : undefined;
      const resources = Array.isArray(candidate.resources)
        ? candidate.resources
            .filter((resource) => resource && typeof resource.title === "string" && typeof resource.url === "string" && typeof resource.summary === "string" && (resource.type === "video" || resource.type === "article" || resource.type === "document"))
            .slice(0, 3)
            .map((resource) => ({
              title: resource.title.slice(0, 90),
              type: resource.type,
              url: resource.url.slice(0, 500),
              summary: resource.summary.slice(0, 220),
            }))
        : undefined;
      const generatedMediaCandidate = candidate.generatedMedia as Partial<GeneratedMediaAsset> | undefined;
      const generatedMedia = generatedMediaCandidate
        && (generatedMediaCandidate.kind === "image" || generatedMediaCandidate.kind === "video")
        && typeof generatedMediaCandidate.title === "string"
        && typeof generatedMediaCandidate.prompt === "string"
        && typeof generatedMediaCandidate.sourceText === "string"
          ? {
              id: typeof generatedMediaCandidate.id === "string" && generatedMediaCandidate.id ? generatedMediaCandidate.id.slice(0, 120) : `media:${crypto.randomUUID()}`,
              kind: generatedMediaCandidate.kind,
              title: generatedMediaCandidate.title.slice(0, 120),
              prompt: generatedMediaCandidate.prompt.slice(0, 3000),
              sourceText: generatedMediaCandidate.sourceText.slice(0, 900),
              createdAt: typeof generatedMediaCandidate.createdAt === "string" ? generatedMediaCandidate.createdAt : new Date().toISOString(),
            }
          : undefined;

      if (!role || !text) return null;

      return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : crypto.randomUUID(),
        role,
        text,
        world,
        language,
        cadence,
        resources,
        generatedMedia,
        personaId,
        personaName,
        avatarPath,
      };
    })
    .filter((message): message is ChatMessage => Boolean(message))
    .slice(-maxStoredMessages);
}

function getAssistantMessageIds(messages: ChatMessage[]) {
  return messages.filter((message) => message.role === "assistant").map((message) => message.id);
}

function sanitizeStoredGrowthQuests(value: unknown): GrowthQuest[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((quest): GrowthQuest | null => {
      const candidate = quest as Partial<GrowthQuest>;
      const days = Array.isArray(candidate.days)
        ? candidate.days
            .filter((day) => day && typeof day.label === "string")
            .slice(0, 3)
            .map((day) => ({ label: day.label.slice(0, 160), done: day.done === true }))
        : [];

      if (!candidate.id || !candidate.title || days.length === 0) return null;

      return {
        id: String(candidate.id).slice(0, 80),
        title: String(candidate.title).slice(0, 90),
        reason: typeof candidate.reason === "string" ? candidate.reason.slice(0, 160) : "",
        days,
        world: candidate.world && candidate.world in worlds ? candidate.world : "calm",
        language: candidate.language === "ar" || candidate.language === "en" ? candidate.language : "en",
        createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
      };
    })
    .filter((quest): quest is GrowthQuest => Boolean(quest))
    .slice(0, 8);
}

function cleanConfigurationNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(1, Math.min(200, Math.round(numberValue))) : fallback;
}

function cleanDiscountCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32) : "";
}

function buildNextDailyPulseStats(current: DailyPulseStats, today: string): DailyPulseStats {
  if (current.lastDate === today) {
    return current;
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const streak = current.lastDate === yesterday ? current.streak + 1 : 1;

  return {
    count: current.count + 1,
    streak,
    lastDate: today,
  };
}

function normalizeCadence(value: EmotionalCadence | undefined, world: WorldId): EmotionalCadence {
  if (value === "slow_reflective" || value === "rapid_energetic" || value === "steady_calm") {
    return value;
  }

  if (world === "faith" || world === "grief" || world === "story") {
    return "slow_reflective";
  }

  if (world === "build" || world === "celebration") {
    return "rapid_energetic";
  }

  return "steady_calm";
}

function inferRequestedLanguage(text: string, fallbackLanguage: Language): Language {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/\b(arabic|arabiyyah|عربي|العربية|بالعربي|arabic story|arabic poem)\b/i.test(text)) return "ar";
  if (/[A-Za-z]/.test(text)) return "en";
  return fallbackLanguage;
}

function detectGeneratedMediaKind(text: string): GeneratedMediaAsset["kind"] | null {
  const normalizedText = text.toLowerCase();
  const asksToCreate = /(create|generate|make|draw|design|render|produce|build|want|need|request|ask for|can we make|could you make|اصنع|ولّد|ولد|انشئ|أنشئ|اعمل|اعملي|اعمللي|نعمل|نصنع|ننشئ|نسوي|سوي|ممكن|عايز|عاوز|عايزة|أريد|اريد|بدي|بدّي|ابغى|أبغى|اطلب|أطلب|طلبت|طلب|محتاج|لازم|صمم|ارسم|حوّل|حول)/i.test(normalizedText);
  if (!asksToCreate) return null;
  if (/(video|reel|short|clip|animation|animated|movie|فيديو|فديو|فيدو|ڤيديو|قيديو|قديو|قيدو|ريل|مقطع|أنيميشن|انيميشن|حركة|متحرك|مشاهد)/i.test(normalizedText)) return "video";
  if (/(image|picture|poster|visual|storyboard|scene|photo|صورة|صور|بوستر|مشهد|لوحة|تصميم|كارت|بطاقة)/i.test(normalizedText)) return "image";
  return null;
}

function buildGeneratedMediaReply(kind: GeneratedMediaAsset["kind"], language: Language) {
  if (language === "ar") {
    return kind === "video"
      ? "تمام. سأحوّل طلبك إلى فيديو بصري قصير داخل المحادثة الآن، بدون فتح يوتيوب أو إخراجك من فضفضة."
      : "تمام. سأولّد الصورة داخل المحادثة الآن، وأحفظ البرومبت معها حتى تقدر ترجع لها.";
  }

  return kind === "video"
    ? "Done. I will generate a short visual video reel inside the conversation now, without opening YouTube or taking you out of FadFada."
    : "Done. I will generate the image inside the conversation now and keep the prompt with it.";
}

function buildGeneratedMediaAsset(kind: GeneratedMediaAsset["kind"], userText: string, assistantText: string, language: Language, promptOverride?: string): GeneratedMediaAsset {
  const isArabic = language === "ar";
  const title = kind === "video"
    ? isArabic ? "فيديو مولّد داخل المحادثة" : "Generated in-chat video reel"
    : isArabic ? "صورة مولّدة داخل المحادثة" : "Generated in-chat image";
  const prompt = promptOverride?.trim()
    ? promptOverride.trim().slice(0, 3000)
    : [
        isArabic
          ? "حوّل الطلب التالي إلى أصل بصري آمن داخل فضفضة، بدون نص داخل الصورة، وبأسلوب سينمائي واضح."
          : "Turn the following request into a safe FadFada visual asset, with no text inside the image and a clear cinematic style.",
        userText,
        assistantText.slice(0, 900),
      ].join("\n\n");

  return {
    id: `media:${crypto.randomUUID()}`,
    kind,
    title,
    prompt,
    sourceText: userText.slice(0, 900),
    createdAt: new Date().toISOString(),
  };
}

function archiveGeneratedMedia(asset: GeneratedMediaAsset, payload: { frames?: string[]; imageDataUrl?: string; model?: string; source?: string }) {
  try {
    const stored = JSON.parse(localStorage.getItem(generatedMediaStorageKey) || "[]") as Array<GeneratedMediaAsset & typeof payload>;
    const next = [{ ...asset, ...payload }, ...stored.filter((item) => item.id !== asset.id)].slice(0, 16);
    localStorage.setItem(generatedMediaStorageKey, JSON.stringify(next));
  } catch {
    // Local media archive is a convenience; chat rendering should continue if storage is full.
  }
}

function buildMomentCapsule(message: ChatMessage, userMessage: ChatMessage | undefined, personaName: string, language: Language) {
  const isArabic = language === "ar";
  const createdAt = new Date().toLocaleString(isArabic ? "ar-EG" : "en-US");
  const worldName = isArabic ? worlds[message.world].nameAr : worlds[message.world].nameEn;

  return [
    `# ${isArabic ? "كبسولة فضفضة" : "FadFada Moment Capsule"}`,
    "",
    `${isArabic ? "التاريخ" : "Date"}: ${createdAt}`,
    `${isArabic ? "الرفيق" : "Companion"}: ${personaName}`,
    `${isArabic ? "المساحة" : "World"}: ${worldName}`,
    "",
    `## ${isArabic ? "ما قلته" : "What I shared"}`,
    userMessage?.text || (isArabic ? "لم يتم تسجيل رسالة سابقة." : "No previous message captured."),
    "",
    `## ${isArabic ? "رد فضفضة" : "FadFada response"}`,
    message.text,
    "",
    `## ${isArabic ? "خطوة صغيرة" : "One small next step"}`,
    isArabic ? "اختر شيئًا واحدًا بسيطًا يمكنك فعله خلال عشر دقائق، ثم عد لهذه اللحظة لاحقًا." : "Choose one small thing you can do in ten minutes, then return to this moment later.",
    "",
    isArabic ? "فضفضة ليست بديلًا عن العلاج أو الطوارئ." : "FadFada is not a substitute for therapy or emergency care.",
  ].join("\n");
}

function buildProofCard(message: ChatMessage, userMessage: ChatMessage | undefined, personaName: string, language: Language) {
  const isArabic = language === "ar";
  const worldName = isArabic ? worlds[message.world].nameAr : worlds[message.world].nameEn;
  const beforeText = summarizeText(userMessage?.text || (isArabic ? "مشاركة شخصية داخل فضفضة" : "A personal share inside FadFada"), language, 130);
  const afterText = summarizeText(message.text, language, 180);
  const nextStep = extractSmallStep(message.text, language) || (isArabic ? "اختر خطوة واحدة صغيرة خلال عشر دقائق." : "Choose one small step you can do in ten minutes.");

  if (isArabic) {
    return [
      "بطاقة إثبات من فضفضة",
      "",
      `قبل: ${beforeText}`,
      `الرفيق: ${personaName}`,
      `المساحة: ${worldName}`,
      `بعد: ${afterText}`,
      `الخطوة التالية: ${nextStep}`,
      "",
      "فضفضة لا تعطي ردًا فقط؛ تحول الكلام إلى لحظة قابلة للحفظ والمشاركة والخطوة.",
      "#فضفضة #ذكاء_اصطناعي #صحة_نفسية #تطوير_ذاتي #BuildInPublic",
    ].join("\n");
  }

  return [
    "FadFada Proof Card",
    "",
    `Before: ${beforeText}`,
    `Companion: ${personaName}`,
    `World: ${worldName}`,
    `After: ${afterText}`,
    `Next step: ${nextStep}`,
    "",
    "FadFada does not just answer. It turns a conversation into a saved, shareable, actionable moment.",
    "#FadFada #AICompanion #MentalWellbeing #PersonalGrowth #BuildInPublic",
  ].join("\n");
}

function buildReflectionReceipt(message: ChatMessage, userMessage: ChatMessage | undefined, language: Language) {
  const isArabic = language === "ar";
  const worldName = isArabic ? worlds[message.world].nameAr : worlds[message.world].nameEn;
  const cameInWith = summarizeText(userMessage?.text || (isArabic ? "لحظة شخصية" : "a personal moment"), language, 90);
  const named = summarizeText(message.text, language, 100);
  const nextStep = extractSmallStep(message.text, language) || (isArabic ? "اختر خطوة صغيرة لا تتجاوز عشر دقائق." : "Choose one small step that takes under ten minutes.");

  return { cameInWith, named, nextStep, worldName };
}

function buildSafeReceiptShareText(message: ChatMessage, userMessage: ChatMessage | undefined, language: Language) {
  const receipt = buildReflectionReceipt(message, userMessage, language);

  if (language === "ar") {
    return [
      "حوّلت لحظة ثقيلة إلى خطوة صغيرة على فضفضة.",
      "",
      `المساحة: ${receipt.worldName}`,
      `الخطوة التالية: ${receipt.nextStep}`,
      "",
      "لا أشارك نصي الخاص، فقط النتيجة: شعور أوضح وخطوة قابلة للتنفيذ.",
      "#فضفضة #خطوة_صغيرة #ذكاء_اصطناعي_عربي",
    ].join("\n");
  }

  return [
    "I turned a heavy thought into one small step on FadFada.",
    "",
    `World: ${receipt.worldName}`,
    `Next step: ${receipt.nextStep}`,
    "",
    "I am not sharing my private text, only the outcome: a clearer feeling and one action I can take.",
    "#FadFada #TinyStep #ArabicAI",
  ].join("\n");
}

function buildStoryMirrorBoard(message: ChatMessage, userMessage: ChatMessage | undefined, personaName: string, language: Language): StoryMirrorShot[] {
  const isArabic = language === "ar";
  const explicitStoryShots = extractExplicitStoryShots(message.text, language);
  if (explicitStoryShots.length >= 2) {
    return explicitStoryShots;
  }

  const receipt = buildReflectionReceipt(message, userMessage, language);
  const worldName = receipt.worldName;
  const palette = isArabic ? "إضاءة ناعمة، تباين هادئ، ألوان دافئة غير صاخبة" : "soft light, quiet contrast, warm restrained colors";

  return [
    {
      sceneNumber: 1,
      title: isArabic ? "اللحظة كما دخلت" : "The moment as it arrived",
      shotType: isArabic ? "لقطة قريبة هادئة" : "Quiet close-up",
      duration: "6s",
      visualNotes: isArabic ? `شخص يجلس في مساحة هادئة، الشعور الأساسي: ${receipt.cameInWith}.` : `A person in a quiet space, carrying the feeling: ${receipt.cameInWith}.`,
      audioNotes: isArabic ? "صمت قصير ونَفَس واضح قبل الكلام." : "A short silence and one clear breath before words.",
      prompt: isArabic ? `مشهد رمزي آمن عن: ${receipt.cameInWith}. ${palette}. بدون نصوص على الصورة، بدون واقعية علاجية.` : `A safe symbolic scene about: ${receipt.cameInWith}. ${palette}. No text in image, no clinical realism.`,
    },
    {
      sceneNumber: 2,
      title: isArabic ? `عين ${personaName}` : `${personaName}'s mirror`,
      shotType: isArabic ? "لقطة متوسطة / انعكاس" : "Medium mirror shot",
      duration: "8s",
      visualNotes: isArabic ? `الرفيق يعكس المعنى الذي ظهر: ${receipt.named}.` : `The companion reflects the meaning that appeared: ${receipt.named}.`,
      audioNotes: isArabic ? "نبرة مطمئنة، كلمات قليلة، إيقاع بطيء." : "Reassuring tone, few words, slow pacing.",
      prompt: isArabic ? `انعكاس بصري شاعري لفكرة: ${receipt.named}. شخصية خيالية، ${worldName}، ${palette}.` : `A poetic visual reflection of: ${receipt.named}. Fictional companion, ${worldName}, ${palette}.`,
    },
    {
      sceneNumber: 3,
      title: isArabic ? "الخروج بخطوة" : "Leaving with one step",
      shotType: isArabic ? "لقطة واسعة باتجاه ضوء" : "Wide shot toward light",
      duration: "7s",
      visualNotes: isArabic ? `الحركة تصبح بسيطة وواضحة: ${receipt.nextStep}.` : `The movement becomes simple and clear: ${receipt.nextStep}.`,
      audioNotes: isArabic ? "إيقاع أهدأ، صوت خطوة واحدة، نهاية مفتوحة." : "Calmer rhythm, one footstep, open ending.",
      prompt: isArabic ? `شخصية خيالية تتحرك نحو خطوة صغيرة: ${receipt.nextStep}. ${palette}. لقطة أمل هادئ.` : `A fictional figure moving toward one small step: ${receipt.nextStep}. ${palette}. Quiet hopeful frame.`,
    },
  ];
}

function extractExplicitStoryShots(text: string, language: Language): StoryMirrorShot[] {
  const isArabic = language === "ar";
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const shots: StoryMirrorShot[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const title = extractStoryPanelTitle(lines[index], shots.length + 1, language);
    if (!title) continue;

    const prompt = findNearbyImagePrompt(lines, index);
    if (!prompt) continue;

    shots.push({
      sceneNumber: shots.length + 1,
      title,
      shotType: isArabic ? "صورة رمزية مولّدة" : "Generated symbolic image",
      duration: shots.length === 0 ? "6s" : shots.length === 1 ? "8s" : "7s",
      visualNotes: summarizeText(prompt, language, 180),
      audioNotes: isArabic ? "موسيقى هادئة تناسب المشهد دون كلمات." : "Quiet non-verbal ambience that matches the scene.",
      prompt: strengthenStoryboardPrompt(prompt, language),
    });

    if (shots.length === 3) break;
  }

  return shots;
}

function extractStoryPanelTitle(line: string, fallbackNumber: number, language: Language) {
  const cleanedLine = stripMarkdown(line);
  const arabicMatch = cleanedLine.match(/(?:اللوحة|المشهد)\s*(?:الأولى|الأول|الثانية|الثاني|الثالثة|الثالث|الرابعة|الرابع|\d+)\s*[:：-]\s*(.+)$/i);
  if (arabicMatch?.[1]) return arabicMatch[1].trim().slice(0, 80);

  const englishMatch = cleanedLine.match(/(?:panel|scene|shot)\s*(?:one|two|three|four|\d+)\s*[:：-]\s*(.+)$/i);
  if (englishMatch?.[1]) return englishMatch[1].trim().slice(0, 80);

  return "";
}

function findNearbyImagePrompt(lines: string[], titleIndex: number) {
  for (let offset = 1; offset <= 8; offset += 1) {
    const line = lines[titleIndex + offset];
    if (!line) continue;
    const promptMatch = line.match(/(?:برومبت\s*الصورة|image\s*prompt|prompt)\s*[:：-]\s*["“”']?(.+?)["“”']?\s*$/i);
    if (promptMatch?.[1]) return stripMarkdown(promptMatch[1]).replace(/^[:：-]\s*/, "").trim();
  }

  return "";
}

function strengthenStoryboardPrompt(prompt: string, language: Language) {
  const cleanedPrompt = prompt.replace(/^"|"$/g, "").trim();
  const safetyTail = language === "ar"
    ? "بدون كتابة أو شعارات داخل الصورة، أسلوب سينمائي آمن، تفاصيل مختلفة بوضوح عن بقية المشاهد."
    : "No text or logos inside the image, safe cinematic style, clearly distinct from the other scenes.";

  return /بدون كتابة|no text/i.test(cleanedPrompt) ? cleanedPrompt : `${cleanedPrompt}. ${safetyTail}`;
}

function stripMarkdown(value: string) {
  return value.replace(/^[>*\-\s]+/, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function buildJudgePitchCard(language: Language) {
  if (language === "ar") {
    return [
      "فضفضة في ٦٠ ثانية للحكام",
      "",
      "المشكلة: أغلب تطبيقات الذكاء الاصطناعي ترد، لكنها لا تراعي الحالة النفسية واللغة والثقافة والسياق.",
      "الحل: فضفضة مساحة عربية/إنجليزية تختار رفيقًا مناسبًا، تغيّر البيئة حسب الشخصية، وتحول الكلام إلى خطوة أو كبسولة أو تحدي.",
      "ما يميزها: ٢٣ رفيقًا، وضع حكام مخفي، بطاقات إثبات قابلة للمشاركة، كبسولات لحظات، وتحديات ٣ أيام.",
      "الدليل في العرض: اكتب /judge ثم جرّب /proof بعد الرد.",
      "لماذا الآن: الناس لا تحتاج محادثة أطول فقط؛ تحتاج لحظة مفهومة تتحول إلى فعل صغير.",
      "",
      "فضفضة: من كلام داخلي إلى خطوة واضحة.",
    ].join("\n");
  }

  return [
    "FadFada in 60 seconds for judges",
    "",
    "Problem: Most AI apps reply, but they do not adapt to emotional state, language, culture, and context.",
    "Solution: FadFada is an Arabic-first bilingual space that chooses the right companion, shifts the atmosphere by persona, and turns a conversation into a step, capsule, or quest.",
    "What stands out: 26 companions, hidden Judge Mode, shareable Proof Cards, Moment Capsules, and 3-day growth quests.",
    "Demo proof: type /judge, then type /proof after the reply.",
    "Why now: people do not only need a longer chat; they need a felt moment that becomes one clear action.",
    "",
    "FadFada: from inner noise to one clear next step.",
  ].join("\n");
}

function buildLaunchPost(language: Language) {
  if (language === "ar") {
    return [
      "بنيت فضفضة لأن الكلام الذي لا يجد مساحة يتحول إلى ضغط.",
      "",
      "فضفضة ليست روبوت محادثة عام. هي مساحة عربية/إنجليزية تختار رفيقًا يناسب حالتك: من مريم التي تسمعك، إلى سند في لحظات الفقد، إلى لغز ورادار عندما تحتاج تفكيرًا أوضح.",
      "",
      "جرّبها واكتب ما بداخلك. إذا أعجبك الرد، اضغط بطاقة إثبات وشارك اللحظة.",
      "",
      "أبحث عن أول ناس يؤمنون أن الذكاء الاصطناعي يمكن أن يكون أهدأ، أعمق، وأقرب للثقافة.",
      "#فضفضة #ذكاء_اصطناعي #صحة_نفسية #ريادة #BuildInPublic",
    ].join("\n");
  }

  return [
    "I built FadFada because thoughts that have no room become pressure.",
    "",
    "FadFada is not a generic chatbot. It is an Arabic-first bilingual space that matches you with the right companion: Maryam when you need to be heard, Sanad for grief, Logoz and Radar when you need clearer thinking.",
    "",
    "Try it, write what is inside, and turn a strong reply into a shareable Proof Card.",
    "",
    "I am looking for the first people who believe AI can feel calmer, deeper, and more culturally close.",
    "#FadFada #AICompanion #MentalWellbeing #ArabicAI #BuildInPublic",
  ].join("\n");
}

function buildBelieverBadge(language: Language, stats: { companionName: string; worldName: string; messageCount: number; savedCount: number; questCount: number }) {
  if (language === "ar") {
    return [
      "أنا من أوائل مؤمني فضفضة.",
      "",
      "جربت مساحة عربية/إنجليزية لا ترد عليك فقط، بل تسمعك وتحوّل الكلام إلى خطوة أو لحظة محفوظة.",
      `رفيقي الآن: ${stats.companionName}`,
      `المساحة: ${stats.worldName}`,
      `محادثاتي: ${stats.messageCount}`,
      `لحظاتي المحفوظة: ${stats.savedCount}`,
      `تحدياتي: ${stats.questCount}`,
      "",
      "لو تؤمن أن الذكاء الاصطناعي العربي يستحق تجربة أهدأ وأقرب للثقافة، جرّب فضفضة وشارك شارتك.",
      "#فضفضة #مؤمن_مبكر #ذكاء_اصطناعي #ArabicAI #BuildInPublic",
    ].join("\n");
  }

  return [
    "I am an early believer in FadFada.",
    "",
    "I tried an Arabic-first bilingual space that does not just answer. It listens, reflects, and turns a thread into a step or saved moment.",
    `My companion: ${stats.companionName}`,
    `Current world: ${stats.worldName}`,
    `My conversations: ${stats.messageCount}`,
    `Saved moments: ${stats.savedCount}`,
    `Quests started: ${stats.questCount}`,
    "",
    "If you believe Arabic AI deserves a calmer, more culturally close experience, try FadFada and share your badge.",
    "#FadFada #EarlyBeliever #ArabicAI #AICompanion #BuildInPublic",
  ].join("\n");
}

function buildTinyPlan(message: ChatMessage, language: Language): TinyPlan {
  const isArabic = language === "ar";
  const cleanedText = message.text.replace(/[#*_`>\-]+/g, " ").replace(/\s+/g, " ").trim();
  const sentenceCandidates = cleanedText
    .split(isArabic ? /[.!؟،؛\n]/ : /[.!?;\n]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18 && sentence.length <= 180);
  const fallbackSteps = isArabic
    ? ["خذ دقيقة تنفّس بهدوء.", "اختر خطوة واحدة لا تتجاوز عشر دقائق.", "ارجع لفضفضة بعد تنفيذها وسجّل ما تغيّر."]
    : ["Take one quiet minute to breathe.", "Choose one step that takes under ten minutes.", "Come back to FadFada after doing it and note what changed."];
  const steps = sentenceCandidates.slice(0, 3);
  const finalSteps = steps.length >= 2 ? steps : fallbackSteps;

  return {
    id: `tiny-plan-${message.id}`,
    title: isArabic ? "خطة صغيرة لهذا اليوم" : "Tiny plan for today",
    steps: finalSteps.slice(0, 3),
    world: message.world,
    language,
    createdAt: new Date().toISOString(),
  };
}

function buildConversationContinuity(messages: ChatMessage[], language: Language) {
  const userMessages = messages.filter((message) => message.role === "user");
  const assistantMessages = messages.filter((message) => message.role === "assistant" && message.id !== "opening");
  const lastUserMessage = userMessages.at(-1);
  const lastAssistantMessage = assistantMessages.at(-1);

  if (!lastUserMessage && !lastAssistantMessage) return null;

  const sourceText = lastAssistantMessage?.text || lastUserMessage?.text || "";
  const smallStep = extractSmallStep(sourceText, language);

  return {
    topic: summarizeText(lastUserMessage?.text || sourceText, language, 96),
    step: smallStep || summarizeText(sourceText, language, 118),
    world: lastAssistantMessage?.world || lastUserMessage?.world || "calm",
    count: userMessages.length,
  };
}

function buildJourneySnapshot(messages: ChatMessage[], language: Language): JourneySnapshot | null {
  const userMessages = messages.filter((message) => message.role === "user");
  const assistantMessages = messages.filter((message) => message.role === "assistant" && message.id !== "opening");
  const continuity = buildConversationContinuity(messages, language);

  if (!continuity || userMessages.length === 0) return null;

  const dominantWorld = findDominantWorld(messages) || continuity.world;
  const latestUserText = userMessages.at(-1)?.text || continuity.topic;
  const title = language === "ar" ? "لقطة رحلة" : "Journey snapshot";

  return {
    id: `journey-${Date.now()}`,
    title,
    theme: summarizeText(latestUserText, language, 120),
    nextStep: continuity.step || summarizeText(assistantMessages.at(-1)?.text || latestUserText, language, 140),
    messageCount: userMessages.length,
    world: dominantWorld,
    language,
    createdAt: new Date().toISOString(),
  };
}

function buildGrowthQuest(messages: ChatMessage[], language: Language): GrowthQuest | null {
  const continuity = buildConversationContinuity(messages, language);
  if (!continuity) return null;

  const isArabic = language === "ar";
  const title = isArabic ? "تحدي فضفضة لثلاثة أيام" : "3-Day FadFada Quest";
  const firstStep = continuity.step || (isArabic ? "اختر خطوة صغيرة لا تتجاوز عشر دقائق." : "Choose one small step that takes under ten minutes.");
  const reflectionStep = isArabic ? "ارجع لفضفضة واكتب ماذا تغيّر بعد الخطوة." : "Return to FadFada and write what changed after the step.";
  const repeatStep = isArabic ? "حوّل ما تعلمته إلى خطوة أصغر لليوم التالي." : "Turn what you learned into an even smaller step for the next day.";

  return {
    id: `quest-${Date.now()}`,
    title,
    reason: continuity.topic,
    days: [
      { label: firstStep, done: false },
      { label: reflectionStep, done: false },
      { label: repeatStep, done: false },
    ],
    world: continuity.world,
    language,
    createdAt: new Date().toISOString(),
  };
}

function formatQuestTitle(quest: GrowthQuest, language: Language) {
  if (quest.language !== language) {
    return language === "ar" ? "تحدي فضفضة لثلاثة أيام" : "3-Day FadFada Quest";
  }

  const cleanedTitle = quest.title
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/[ـ*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedTitle || (language === "ar" ? "تحدي فضفضة لثلاثة أيام" : "3-Day FadFada Quest");
}

function buildQuestShareText(quest: GrowthQuest, language: Language) {
  const doneCount = quest.days.filter((day) => day.done).length;
  const nextStep = quest.days.find((day) => !day.done)?.label || quest.days.at(-1)?.label || "";

  if (language === "ar") {
    return [
      "لسه مجربتش فضفضة؟",
      "أنا بدأت تحدي ٣ أيام من محادثة واحدة.",
      `التقدم: ${doneCount}/${quest.days.length}`,
      `خطوتي الآن: ${nextStep}`,
      "فضفضة لا تعطيك ردًا فقط؛ تحول الكلام إلى خطوة وتحدي قابل للإنجاز.",
      "#فضفضة #ذكاء_اصطناعي #صحة_نفسية #تطوير_ذاتي #BuildInPublic",
    ].join("\n");
  }

  return [
    "Still haven’t tried FadFada?",
    "I turned one conversation into a 3-day quest.",
    `Progress: ${doneCount}/${quest.days.length}`,
    `My next step: ${nextStep}`,
    "FadFada does not just answer. It turns your thread into a step, a snapshot, and a challenge you can finish.",
    "#FadFada #AICompanion #PersonalGrowth #MentalWellbeing #BuildInPublic",
  ].join("\n");
}

function buildBuddyInviteText(quest: GrowthQuest, language: Language) {
  const doneCount = quest.days.filter((day) => day.done).length;
  const nextStep = quest.days.find((day) => !day.done)?.label || quest.days.at(-1)?.label || "";

  if (language === "ar") {
    return [
      "تعال نعمل خطوة صغيرة مع بعض اليوم.",
      "أنا بدأت تحدي ٣ أيام على فضفضة ومحتاج صديق يشاركني خطوة واحدة فقط.",
      `التقدم الآن: ${doneCount}/${quest.days.length}`,
      `خطوتنا اليوم: ${nextStep}`,
      "لو خلصتها، ابعتلي: تم.",
      "ابدأ تحديك أنت كمان على فضفضة.",
      "#فضفضة #تحدي_٣_أيام #خطوة_صغيرة",
    ].join("\n");
  }

  return [
    "Do one tiny step with me today.",
    "I started a 3-day FadFada quest and I want one friend to join me for just one step.",
    `Current progress: ${doneCount}/${quest.days.length}`,
    `Today's step: ${nextStep}`,
    "When you finish it, reply: done.",
    "Start your own quest on FadFada too.",
    "#FadFada #3DayQuest #TinyStep",
  ].join("\n");
}

function findDominantWorld(messages: ChatMessage[]) {
  const counts = messages.reduce<Partial<Record<WorldId, number>>>((accumulator, message) => {
    accumulator[message.world] = (accumulator[message.world] || 0) + 1;
    return accumulator;
  }, {});

  return (Object.entries(counts).sort(([, left], [, right]) => right - left)[0]?.[0] as WorldId | undefined) || undefined;
}

function summarizeText(text: string, language: Language, maxLength: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;

  const slice = cleaned.slice(0, maxLength - 1).trim();
  const lastBreak = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("،"), slice.lastIndexOf(","));
  return `${slice.slice(0, lastBreak > 40 ? lastBreak : slice.length).trim()}${language === "ar" ? "…" : "..."}`;
}

function extractSmallStep(text: string, language: Language) {
  const sentences = text
    .split(language === "ar" ? /[.!؟\n]/ : /[.!?\n]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const stepPattern = language === "ar" ? /خطوة|ابدأ|اختر|جرّب|جرب|اكتب|افعل|راجع/i : /step|start|choose|try|write|list|next|begin/i;
  const matchedSentence = sentences.find((sentence) => stepPattern.test(sentence) && sentence.length > 18);
  return matchedSentence ? summarizeText(matchedSentence, language, 118) : null;
}

function PresenceOrb({ world, color }: { world: WorldId; color: string }) {
  return (
    <div className="relative grid h-20 w-20 place-items-center" style={{ ["--orb-glow" as string]: `${color}66` }}>
      <div className="absolute h-16 w-16 rounded-full blur-2xl" style={{ backgroundColor: color, opacity: 0.35 }} />
      <svg className="animate-breathe relative h-20 w-20" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="orb-fill" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.18" />
          </radialGradient>
        </defs>
        {world === "story" ? <path d="M50 14 C35 34 25 46 25 63 C25 81 38 91 50 91 C62 91 75 81 75 63 C75 46 65 34 50 14 Z" fill="url(#orb-fill)" /> : null}
        {world === "faith" ? <path d="M65 20 A35 35 0 1 0 65 80 A27 27 0 1 1 65 20 Z" fill={color} opacity="0.82" /> : null}
        {world === "build" ? <path d="M50 10 L58 42 L90 50 L58 58 L50 90 L42 58 L10 50 L42 42 Z" fill="url(#orb-fill)" /> : null}
        {world !== "story" && world !== "faith" && world !== "build" ? <circle cx="50" cy="50" r="28" fill="url(#orb-fill)" /> : null}
      </svg>
    </div>
  );
}

function ContinueThreadCard({
  language,
  continuity,
  snapshotStatus,
  questStatus,
  onContinue,
  onSaveSnapshot,
  onStartQuest,
}: {
  language: Language;
  continuity: ReturnType<typeof buildConversationContinuity>;
  snapshotStatus: "idle" | "saved";
  questStatus: "idle" | "saved";
  onContinue: () => void;
  onSaveSnapshot: () => void;
  onStartQuest: () => void;
}) {
  if (!continuity) return null;

  const isArabic = language === "ar";
  const worldName = worldLabels[continuity.world]?.[language] || continuity.world;

  return (
    <section className="mt-5 w-full max-w-md rounded-2xl border border-[#C9A86A]/25 bg-[#C9A86A]/[0.055] p-4 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "استمرار ذكي" : "Smart continuity"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/92">{isArabic ? "نكمل من آخر خيط؟" : "Continue your last thread?"}</h2>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-arsans text-xs text-[#F7F3EC]/55">{worldName}</span>
      </div>
      <div className="mt-3 grid gap-2">
        <p className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 font-arsans text-sm leading-6 text-[#F7F3EC]/72">
          <span className="text-[#C9A86A]">{isArabic ? "آخر موضوع: " : "Last thread: "}</span>{continuity.topic}
        </p>
        <p className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 font-arsans text-sm leading-6 text-[#F7F3EC]/62">
          <span className="text-emerald-200">{isArabic ? "الخطوة التالية: " : "Next step: "}</span>{continuity.step}
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={onContinue} className="ui-action rounded-lg bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
          {isArabic ? "العودة للمحادثة" : "Continue"}
        </button>
        <button type="button" onClick={onSaveSnapshot} className="ui-action rounded-lg border border-emerald-200/35 px-4 py-3 text-emerald-200 transition-colors hover:bg-emerald-200 hover:text-[#0E0D10]">
          {snapshotStatus === "saved" ? (isArabic ? "تم الحفظ" : "Saved") : isArabic ? "حفظ لقطة" : "Save snapshot"}
        </button>
        <button type="button" onClick={onStartQuest} className="ui-action rounded-lg border border-[#F7F3EC]/15 px-4 py-3 text-[#F7F3EC]/82 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
          {questStatus === "saved" ? (isArabic ? "بدأ التحدي" : "Quest saved") : isArabic ? "ابدأ تحدي" : "Start quest"}
        </button>
      </div>
      <p className="mt-2 text-center font-arsans text-xs text-[#F7F3EC]/38">
        {isArabic ? `${continuity.count} رسائل محفوظة. اللقطات والتحديات تظهر في الملف الشخصي.` : `${continuity.count} messages saved. Snapshots and quests appear in Profile.`}
      </p>
    </section>
  );
}

function ActiveQuestCard({ language, quests, onCompleteNext, onShareQuest, onInviteBuddy, shareStatus }: { language: Language; quests: GrowthQuest[]; onCompleteNext: (questId: string) => void; onShareQuest: (quest: GrowthQuest) => void; onInviteBuddy: (quest: GrowthQuest) => void; shareStatus: ShareStatus }) {
  const isArabic = language === "ar";
  const quest = quests.find((item) => item.days.some((day) => !day.done)) || quests[0];
  if (!quest) return null;

  const doneCount = quest.days.filter((day) => day.done).length;
  const nextStep = quest.days.find((day) => !day.done);
  const complete = doneCount === quest.days.length;
  const displayTitle = formatQuestTitle(quest, language);

  return (
    <section className="mt-4 w-full max-w-md rounded-2xl border border-cyan-200/20 bg-cyan-200/[0.045] p-4 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-cyan-100/80">{isArabic ? "تحدي نشط" : "Active quest"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/92">{displayTitle}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-cyan-200/10 px-3 py-1.5 font-mono text-xs text-cyan-100">{doneCount}/{quest.days.length}</span>
      </div>
      <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/55" dir="auto">{quest.reason}</p>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3">
        <p className="font-arsans text-xs text-[#F7F3EC]/38">{complete ? (isArabic ? "اكتمل التحدي" : "Quest complete") : isArabic ? "خطوتك الآن" : "Your next step"}</p>
        <p className={`mt-1 font-arsans text-sm leading-6 ${complete ? "text-emerald-200" : "text-[#F7F3EC]/78"}`} dir="auto">
          {complete ? (isArabic ? "رائع. احفظ لقطة جديدة أو ابدأ تحدياً آخر من محادثتك القادمة." : "Good. Save a new snapshot or start another quest from your next thread.") : nextStep?.label}
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {!complete ? (
          <button type="button" onClick={() => onCompleteNext(quest.id)} className="ui-action rounded-lg bg-cyan-100 px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
            {isArabic ? "تم تنفيذ خطوة اليوم" : "Mark step done"}
          </button>
        ) : null}
        <button type="button" onClick={() => onInviteBuddy(quest)} className={`ui-action rounded-lg border border-emerald-200/35 px-4 py-3 text-emerald-200 transition-colors hover:bg-emerald-200 hover:text-[#0E0D10] ${complete ? "sm:col-span-2" : ""}`}>
          {shareStatus === "copied" ? (isArabic ? "تم النسخ" : "Copied") : isArabic ? "ادع صديق" : "Invite friend"}
        </button>
        <button type="button" onClick={() => onShareQuest(quest)} className="ui-action rounded-lg border border-cyan-100/30 px-4 py-3 text-cyan-100 transition-colors hover:bg-cyan-100 hover:text-[#0E0D10]">
          {shareStatus === "copied" ? (isArabic ? "تم النسخ" : "Copied") : isArabic ? "شارك التحدي" : "Share quest"}
        </button>
      </div>
    </section>
  );
}

function SessionHistoryPanel({
  language,
  accessState,
  sessions,
  status,
  onNewSession,
  onSaveSession,
  onRefresh,
  onOpenSession,
  onSignIn,
}: {
  language: Language;
  accessState: AccessState;
  sessions: ChatSessionSummary[];
  status: "idle" | "saving" | "saved" | "loading" | "error";
  onNewSession: () => void;
  onSaveSession: () => void;
  onRefresh: () => void;
  onOpenSession: (session: ChatSessionSummary) => void;
  onSignIn: () => void;
}) {
  const isArabic = language === "ar";
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  if (accessState === "anonymous") {
    return (
      <section className="mt-5 rounded-2xl border border-[#C9A86A]/25 bg-[#C9A86A]/[0.055] p-4 text-start" dir={isArabic ? "rtl" : "ltr"}>
        <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "سجل الجلسات" : "Session history"}</p>
        <h3 className="mt-2 font-arui text-xl font-semibold text-[#F7F3EC]/92">{isArabic ? "سجّل دخولك لحفظ الجلسات" : "Sign in to keep sessions"}</h3>
        <p className="mt-2 font-arsans text-sm leading-7 text-[#F7F3EC]/58">
          {isArabic ? "جلسات الحساب تحفظ تاريخك وتسمح لك تبدأ جلسة جديدة بدون ضياع القديمة." : "Account sessions preserve history and let you start fresh without losing older conversations."}
        </p>
        <button type="button" onClick={onSignIn} className="ui-action mt-4 rounded-full bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition hover:bg-[#F7F3EC]">
          {isArabic ? "تسجيل الدخول" : "Sign in"}
        </button>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-start" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3 max-sm:flex-col">
        <div>
          <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "سجل الجلسات" : "Session history"}</p>
          <h3 className="mt-2 font-arui text-xl font-semibold text-[#F7F3EC]/92">{isArabic ? "ابدأ جلسة جديدة أو ارجع للقديمة" : "Start fresh or reopen history"}</h3>
          <p className="mt-2 font-arsans text-sm leading-7 text-[#F7F3EC]/55">
            {isArabic ? "كل جلسة تحفظ الرفيق، العالم، والرسائل. تغيير الرفيق لا يغيّر تاريخ الردود القديمة." : "Each session keeps companion, world, and messages. Switching companions will not repaint old replies."}
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1.5 font-arsans text-xs text-[#F7F3EC]/45">
          {status === "loading" ? (isArabic ? "تحميل" : "Loading") : status === "saving" ? (isArabic ? "حفظ" : "Saving") : status === "saved" ? (isArabic ? "تم الحفظ" : "Saved") : status === "error" ? (isArabic ? "تعذر" : "Error") : isArabic ? "جاهز" : "Ready"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={onNewSession} className="ui-action rounded-xl bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition hover:bg-[#F7F3EC]">
          {isArabic ? "جلسة جديدة" : "New session"}
        </button>
        <button type="button" onClick={onSaveSession} className="ui-action rounded-xl border border-emerald-200/30 px-4 py-3 text-emerald-200 transition hover:bg-emerald-200 hover:text-[#0E0D10]">
          {isArabic ? "حفظ الحالية" : "Save current"}
        </button>
        <button type="button" onClick={onRefresh} className="ui-action rounded-xl border border-white/10 px-4 py-3 text-[#F7F3EC]/70 transition hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
          {isArabic ? "تحديث السجل" : "Refresh history"}
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {sessions.length > 0 ? sessions.map((sessionItem) => {
          const expanded = expandedSessionId === sessionItem.sessionId;
          const previewMessages = sessionItem.messages.filter((message) => message.id !== "opening").slice(-3);

          return (
          <article key={sessionItem.sessionId} className={`overflow-hidden rounded-xl border bg-black/15 transition-colors ${expanded ? "border-[#C9A86A]/45 bg-[#C9A86A]/10" : "border-white/10 hover:border-[#C9A86A]/35"}`}>
            <button type="button" onClick={() => setExpandedSessionId(expanded ? null : sessionItem.sessionId)} aria-expanded={expanded} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 p-3 text-start">
              <span className="min-w-0">
                <span className="block truncate font-arsans text-sm text-[#F7F3EC]/84" dir="auto">{sessionItem.title}</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-[#F7F3EC]/35" dir="ltr">
                  {sessionItem.messageCount ?? sessionItem.messages.length} messages · {sessionItem.activePersonaId} · {sessionItem.updatedAt ? new Date(sessionItem.updatedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US") : "local"}
                </span>
              </span>
              <span className="rounded-full border border-white/10 px-2.5 py-1 font-arsans text-xs text-[#C9A86A]">
                {expanded ? (isArabic ? "إغلاق" : "Close") : isArabic ? "عرض" : "View"}
              </span>
            </button>

            {expanded ? (
              <div className="border-t border-white/10 px-3 pb-3 pt-2">
                <div className="grid gap-2">
                  {previewMessages.length > 0 ? previewMessages.map((message) => (
                    <p key={message.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-arsans text-xs leading-5 text-[#F7F3EC]/58" dir="auto">
                      <span className="text-[#C9A86A]/75">{message.role === "assistant" ? (isArabic ? "الرفيق" : "Companion") : isArabic ? "أنت" : "You"}: </span>{message.text.slice(0, 180)}
                    </p>
                  )) : (
                    <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 font-arsans text-xs text-[#F7F3EC]/42">
                      {isArabic ? "افتح الجلسة لعرض الرسائل الكاملة." : "Open the session to view the full messages."}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => onOpenSession(sessionItem)} className="ui-action mt-3 w-full rounded-xl bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition hover:bg-[#F7F3EC]">
                  {isArabic ? "فتح هذه الجلسة" : "Open this session"}
                </button>
              </div>
            ) : null}
          </article>
          );
        }) : (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 font-arsans text-sm text-[#F7F3EC]/42">
            {isArabic ? "لا توجد جلسات محفوظة بعد. احفظ الجلسة الحالية أو ابدأ جلسة جديدة." : "No saved sessions yet. Save the current session or start a new one."}
          </p>
        )}
      </div>
    </section>
  );
}

function HomeToolTabs({ language, activePanel, onSelect }: { language: Language; activePanel: HomeToolPanel; onSelect: (panel: HomeToolPanel) => void }) {
  const isArabic = language === "ar";
  const panels: Array<{ id: HomeToolPanel; ar: string; en: string }> = [
    { id: "checkin", ar: "نبض اليوم", en: "Check-in" },
    { id: "sessions", ar: "الجلسات", en: "Sessions" },
    { id: "progress", ar: "تقدمك", en: "Progress" },
    { id: "tone", ar: "النبرة", en: "Tone" },
    { id: "prompts", ar: "بدايات", en: "Prompts" },
    { id: "plans", ar: "الخطط", en: "Plans" },
    { id: "about", ar: "عن التطبيق", en: "About" },
  ];

  return (
    <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.025] p-1.5" dir={isArabic ? "rtl" : "ltr"}>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-7">
        {panels.map((panel) => {
          const active = panel.id === activePanel;
          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => onSelect(panel.id)}
              className={`min-h-10 rounded-xl px-2 py-2 text-center text-xs transition-colors ${isArabic ? "font-arsans" : "font-ensans"} ${active ? "bg-[#C9A86A] text-[#0E0D10]" : "text-[#F7F3EC]/55 hover:bg-white/[0.045] hover:text-[#F7F3EC]/88"}`}
            >
              {panel[language]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeToolsDialog({
  language,
  activePanel,
  onSelect,
  onClose,
  children,
}: {
  language: Language;
  activePanel: HomeToolPanel;
  onSelect: (panel: HomeToolPanel) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const isArabic = language === "ar";

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 px-3 py-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isArabic ? "أدوات فضفضة" : "FadFada tools"}>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label={isArabic ? "إغلاق الأدوات" : "Close tools"} />
      <section className="relative max-h-[calc(100dvh-2rem)] w-full max-w-3xl overscroll-contain overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#0E0D10]/96 p-4 shadow-2xl backdrop-blur-2xl [scrollbar-color:rgba(201,168,106,0.45)_transparent] sm:p-5" dir={isArabic ? "rtl" : "ltr"}>
        <div className="flex items-start justify-between gap-3">
          <div className="text-start">
            <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "القائمة" : "Menu"}</p>
            <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/92">{isArabic ? "اختر ما تحتاجه الآن" : "Choose what you need now"}</h2>
          </div>
          <button type="button" onClick={onClose} className="ui-action rounded-full border border-white/10 px-3 py-2 text-xs text-[#F7F3EC]/60 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <HomeToolTabs language={language} activePanel={activePanel} onSelect={onSelect} />
        <div className="grid w-full gap-4 pb-2">{children}</div>
      </section>
    </div>
  );
}

function PlanComparisonCard({ language, loading, status, onUpgrade }: { language: Language; loading: boolean; status: "idle" | "error" | "paused"; onUpgrade: () => void }) {
  const isArabic = language === "ar";
  const freeFeatures = isArabic
    ? ["فضفضة أساسية مع رفيق", "نبض اليوم والبدايات", "حفظ لحظات محدود", "تحديات ٣ أيام محلية"]
    : ["Core venting companion", "Daily check-in and starters", "Limited saved moments", "Local 3-day quests"];
  const plusFeatures = isArabic
    ? ["متابعة أطول للتقدم", "ردود أعمق ومزايا أوسع", "رفيق مخصص وصور أفاتار أكثر", "حفظ أوسع للخطط واللحظات والكبسولات"]
    : ["Longer progress continuity", "Deeper answers and expanded tools", "Custom companion and more avatar generation", "Expanded plans, moments, and capsules"];
  const premiumPreview = personas.filter((persona) => persona.isPremium).slice(0, 4);

  return (
    <section className="mt-5 w-full rounded-2xl border border-[#C9A86A]/25 bg-[#C9A86A]/[0.055] p-4 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "خطط فضفضة" : "FadFada plans"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/92">{isArabic ? "ابدأ مجاناً، وادفع عندما تحتاج عمقاً أكثر" : "Start free, upgrade when you need more depth"}</h2>
        </div>
        <span className="shrink-0 rounded-full border border-[#C9A86A]/35 bg-black/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]">Plus</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="font-arsans text-sm font-semibold text-[#F7F3EC]/88">{isArabic ? "مجاني" : "Free"}</p>
          <p className="mt-1 font-mono text-xl text-[#F7F3EC]/90">$0</p>
          <div className="mt-3 grid gap-2">
            {freeFeatures.map((feature) => (
              <p key={feature} className="font-arsans text-xs leading-5 text-[#F7F3EC]/58">{feature}</p>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#C9A86A]/35 bg-[#C9A86A]/10 p-3">
          <p className="font-arsans text-sm font-semibold text-[#F7F3EC]/92">{isArabic ? "بلس" : "Plus"}</p>
          <p className="mt-1 font-mono text-xl text-[#C9A86A]">$4.99<span className="text-xs text-[#F7F3EC]/45">/{isArabic ? "شهر" : "mo"}</span></p>
          <div className="mt-3 grid gap-2">
            {plusFeatures.map((feature) => (
              <p key={feature} className="font-arsans text-xs leading-5 text-[#F7F3EC]/70">{feature}</p>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 font-arsans text-xs leading-5 text-[#F7F3EC]/45">
        {isArabic ? "فضفضة ليست علاجاً أو طوارئ. الترقية تفتح مزايا رقمية داخل التطبيق فقط." : "FadFada is not therapy or emergency support. Upgrade unlocks digital in-app features only."}
      </p>
      <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-arsans text-xs leading-5 text-[#F7F3EC]/62">
        {isArabic ? "عند الضغط على الترقية سيتم فتح صفحة دفع آمنة لإكمال الاشتراك." : "When you press upgrade, secure checkout opens so the user can pay."}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {premiumPreview.map((persona) => (
          <div key={persona.id} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
            <p className="truncate font-arsans text-xs text-[#C9A86A]">{isArabic ? persona.nameAr : persona.nameEn}</p>
            <p className="mt-1 line-clamp-2 font-arsans text-[11px] leading-4 text-[#F7F3EC]/45">{isArabic ? persona.roleAr : persona.roleEn}</p>
          </div>
        ))}
      </div>
      {status !== "idle" ? (
        <p className="mt-3 rounded-lg border border-red-200/25 bg-red-200/10 px-3 py-2 font-arsans text-xs leading-5 text-red-100">
          {status === "paused"
            ? isArabic
              ? "الدفع لم يكتمل إعداده بعد. راجع متغيرات Stripe في Vercel."
              : "Payment is not fully configured yet. Check Stripe environment variables in Vercel."
            : isArabic
              ? "تعذر فتح الدفع. جرّب مرة أخرى أو راجع إعدادات الدفع."
              : "Could not open checkout. Try again or check payment settings."}
        </p>
      ) : null}
      <button type="button" onClick={onUpgrade} disabled={loading} className="ui-action mt-4 w-full rounded-lg bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC] disabled:animate-pulse disabled:opacity-70">
        {loading ? (isArabic ? "جار فتح الدفع" : "Opening checkout") : isArabic ? "افتح الدفع الآمن" : "Open secure checkout"}
      </button>
    </section>
  );
}

function WorldShiftRow({ language, world, onWorldChange }: { language: Language; world: WorldId; onWorldChange: (world: WorldId) => void }) {
  const isArabic = language === "ar";

  return (
    <div className="mt-4 flex w-full gap-2 overflow-x-auto px-2 [scrollbar-width:none]" dir={isArabic ? "rtl" : "ltr"}>
      {selectableWorlds.map((worldId) => {
        const active = worldId === world;
        return (
          <button
            key={worldId}
            type="button"
            onClick={() => onWorldChange(worldId)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${isArabic ? "font-arsans" : "font-ensans"} ${active ? "bg-[#C9A86A]/15 text-[#C9A86A]" : "text-[#F7F3EC]/55 hover:text-[#F7F3EC]/85"
              }`}
          >
            {worldLabels[worldId][language]}
          </button>
        );
      })}
    </div>
  );
}

function StarterMomentRail({ language, onSelect }: { language: Language; onSelect: (text: string, world: WorldId) => void }) {
  const isArabic = language === "ar";

  return (
    <div className="mt-6 w-full text-center">
      <p className="ui-kicker text-center">
        {isArabic ? "ابدأ من هنا" : "Start here"}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {starterMoments[language].map((moment) => (
          <button
            key={moment.label}
            type="button"
            onClick={() => onSelect(moment.text, moment.world)}
            className="min-h-12 border border-[#F7F3EC]/10 bg-[#F7F3EC]/[0.035] px-3 py-2 text-start transition-colors hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <span className={`${isArabic ? "font-arsans" : "font-ensans"} block text-sm text-[#F7F3EC]/85`}>{moment.label}</span>
            <span className="mt-1 block font-arsans text-xs text-[#C9A86A]/75">{isArabic ? worlds[moment.world].nameAr : worlds[moment.world].nameEn}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TrustChipRow({ language }: { language: Language }) {
  const isArabic = language === "ar";
  const chips = isArabic ? ["خاص", "ليس علاجاً", "عربي / English", "خطوة صغيرة"] : ["Private", "Not therapy", "Arabic / English", "One small step"];

  return (
    <div className="mt-4 flex max-w-md flex-wrap justify-center gap-2" dir={isArabic ? "rtl" : "ltr"}>
      {chips.map((chip) => (
        <span key={chip} className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5 font-arsans text-[11px] text-[#F7F3EC]/52 backdrop-blur">
          {chip}
        </span>
      ))}
    </div>
  );
}

type SmartFeatureSlide = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  chips: string[];
  proof: string;
  personaId: PersonaId;
  accent: string;
  actionLabel: string;
  onAction: () => void;
};

function SmartFeatureShowcase({
  accessState,
  availablePersonas,
  avatarsEnabled,
  currentWorld,
  language,
  onContent,
  onConsultant,
  onLifeProject,
  onPersona,
  onRequirePlus,
  onStory,
  onVisitorChallenge,
  unlockedPersonaIds,
  userId,
}: {
  accessState: AccessState;
  availablePersonas: Persona[];
  avatarsEnabled: boolean;
  currentWorld: WorldId;
  language: Language;
  onContent: () => void;
  onConsultant: (text: string, world: WorldId, personaId: PersonaId, consultantBadge: string) => void;
  onLifeProject: (text: string, world: WorldId, personaId: PersonaId, projectBadge: string) => void;
  onPersona: () => void;
  onRequirePlus: () => void;
  onStory: () => void;
  onVisitorChallenge: (text: string, world: WorldId, personaId: PersonaId) => void;
  unlockedPersonaIds: PersonaId[];
  userId: string;
}) {
  const isArabic = language === "ar";
  const [activeIndex, setActiveIndex] = useState(0);
  const [activePersonaIndex, setActivePersonaIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const visitorMoment = visitorChallengeMoments[language][0];
  const lifeProject = lifeProjectTemplates[language][0];
  const consultant = consultantScenarios[language].find((scenario) => scenario.badge === (isArabic ? "IT" : "IT")) ?? consultantScenarios[language][0];
  const slides: SmartFeatureSlide[] = [
    {
      key: "gemini-studio",
      eyebrow: isArabic ? "استوديو Gemini" : "Gemini studio",
      title: isArabic ? "اصنع صورة، ارفع فيديو، وشغّل شخصية تتكلم" : "Create images, upload media, and make a persona speak",
      description: isArabic ? "واجهة واحدة تعرض قدرات Gemini للزائر فوراً: صورة، صوت/فيديو، شخصية، ومحتوى جاهز." : "One visitor-facing surface for Gemini: image, audio/video, persona, voice, and ready content.",
      chips: isArabic ? ["Image", "Video", "Voice", "Persona"] : ["Image", "Video", "Voice", "Persona"],
      proof: isArabic ? "مناسب لعرض الحكام: نتيجة مرئية بدل شرح طويل." : "Built for judging: visible output instead of a long explanation.",
      personaId: "screenwriter",
      accent: "#6EE7B7",
      actionLabel: isArabic ? "افتح الاستوديو" : "Open studio",
      onAction: () => setIsExpanded(true),
    },
    {
      key: "visitor-challenge",
      eyebrow: isArabic ? "اختبار الرفيق السريع" : "Companion quiz",
      title: visitorMoment.title,
      description: visitorMoment.description,
      chips: isArabic ? ["٣ أسئلة", "رفيق مناسب", "خطوة واحدة"] : ["3 questions", "Matched companion", "One clear step"],
      proof: isArabic ? "اختبار سريع يربطك بالرفيق الأنسب لحالتك الآن." : "A quick quiz that finds the companion that fits your current state.",
      personaId: visitorMoment.personaId,
      accent: "#C9A86A",
      actionLabel: isArabic ? "ابدأ التحدي" : "Start challenge",
      onAction: () => onVisitorChallenge(visitorMoment.text, visitorMoment.world, visitorMoment.personaId),
    },
    {
      key: "life-projects",
      eyebrow: isArabic ? "مشاريع الحياة" : "Life projects",
      title: lifeProject.title,
      description: lifeProject.description,
      chips: lifeProject.artifacts,
      proof: lifeProject.bring,
      personaId: lifeProject.personaId,
      accent: "#D4724A",
      actionLabel: isArabic ? "ابدأ المشروع" : "Start project",
      onAction: () => onLifeProject(lifeProject.text, lifeProject.world, lifeProject.personaId, lifeProject.badge),
    },
    {
      key: "consultant-hub",
      eyebrow: isArabic ? "مركز الاستشارات" : "Consultant hub",
      title: consultant.title,
      description: consultant.description,
      chips: isArabic ? ["تشخيص", "أسئلة ذكية", "خطوات إصلاح"] : ["Diagnosis", "Smart intake", "Fix steps"],
      proof: consultant.intake,
      personaId: consultant.personaId,
      accent: "#67E8F9",
      actionLabel: isArabic ? "جرّب الاستشارة" : "Try consult",
      onAction: () => onConsultant(consultant.text, consultant.world, consultant.personaId, consultant.badge),
    },
  ];
  const activeSlide = slides[activeIndex] ?? slides[0];
  const permittedPersonaIds = new Set(unlockedPersonaIds);
  const permittedPersonas = avatarsEnabled ? availablePersonas.filter((persona) => permittedPersonaIds.has(persona.id)) : [];
  const personaAccessEnabled = avatarsEnabled && availablePersonas.length > 0;
  const personaCarousel = personaAccessEnabled ? availablePersonas : [];
  const activePersona = personaCarousel[activePersonaIndex % Math.max(1, personaCarousel.length)] ?? availablePersonas.find((persona) => persona.id === activeSlide.personaId) ?? permittedPersonas[0] ?? availablePersonas[0] ?? personas[0];
  const activePersonaPresentation = getHeaderAvatarPresentation(activePersona);
  const activePersonaName = language === "ar" ? activePersonaPresentation.nameAr : activePersonaPresentation.nameEn;
  const activePersonaRole = language === "ar" ? activePersona.roleAr : activePersona.roleEn;
  const activePersonaLocked = accessState !== "plus" && !permittedPersonaIds.has(activePersona.id);

  function runIfPersonaUnlocked(personaIdToRun: PersonaId, run: () => void) {
    if (accessState !== "plus" && !permittedPersonaIds.has(personaIdToRun)) {
      onRequirePlus();
      return;
    }

    run();
  }

  function runActiveSlideAction() {
    runIfPersonaUnlocked(activePersona.id, activeSlide.onAction);
  }

  function movePersonaCarousel(direction: 1 | -1) {
    if (personaCarousel.length === 0) return;
    setActivePersonaIndex((current) => (current + direction + personaCarousel.length) % personaCarousel.length);
  }

  useEffect(() => {
    if (activePersonaIndex < personaCarousel.length) return;
    setActivePersonaIndex(0);
  }, [activePersonaIndex, personaCarousel.length]);

  useEffect(() => {
    if (isExpanded) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
      if (personaCarousel.length > 1) {
        setActivePersonaIndex((current) => (current + 1) % personaCarousel.length);
      }
    }, 5600);

    return () => window.clearInterval(timer);
  }, [isExpanded, personaCarousel.length, slides.length]);

  useEffect(() => {
    if (!isExpanded) return;

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsExpanded(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isExpanded]);

  const dialog = isExpanded && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#050607]/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-8" dir={isArabic ? "rtl" : "ltr"} role="dialog" aria-modal="true" aria-label={isArabic ? "كل ميزات فضفضة" : "All FadFada features"}>
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.35rem] border border-white/14 bg-[#101012] shadow-[0_32px_120px_rgba(0,0,0,0.56)]">
        <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_12%,rgba(110,231,183,0.18),transparent_32%),radial-gradient(circle_at_82%_0%,rgba(201,168,106,0.18),transparent_30%),linear-gradient(135deg,rgba(17,24,22,0.98),rgba(12,13,18,0.96))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="ui-kicker text-emerald-100/85">{isArabic ? "عرض الميزات الكامل" : "Full feature view"}</p>
              <h2 className="mt-2 max-w-2xl font-arui text-2xl font-semibold leading-8 text-[#F7F3EC]/95 sm:text-3xl sm:leading-10">
                {isArabic ? "كل شيء يراه الزائر: إنشاء، فهم، شخصية، ومخرجات عملية" : "Everything a visitor can see: creation, understanding, persona, and practical outputs"}
              </h2>
              <p className="mt-2 max-w-2xl font-arsans text-sm leading-6 text-[#F7F3EC]/58">
                {isArabic ? "اختر أي بطاقة للتشغيل فوراً، أو استخدم استوديو Gemini لصورة، صوت/فيديو، وشخصية تتكلم." : "Run any card immediately, or use Gemini Studio for image, audio/video, and a speaking persona."}
              </p>
            </div>
            <button type="button" onClick={() => setIsExpanded(false)} className="ui-action h-10 w-10 shrink-0 rounded-full border border-white/12 bg-black/22 text-lg text-[#F7F3EC]/70 transition-colors hover:border-[#F7F3EC]/35 hover:text-[#F7F3EC]" aria-label={isArabic ? "إغلاق" : "Close"}>×</button>
          </div>
        </div>

        <div className="max-h-[82vh] overflow-y-auto p-3 sm:p-5">
          <PersonaPreviewCatalog
            accessState={accessState}
            activePersonaId={activePersona.id}
            availablePersonas={availablePersonas}
            language={language}
            unlockedPersonaIds={unlockedPersonaIds}
            onPreview={(personaIdToPreview) => {
              const nextIndex = personaCarousel.findIndex((persona) => persona.id === personaIdToPreview);
              if (nextIndex >= 0) setActivePersonaIndex(nextIndex);
            }}
            onRequirePlus={onRequirePlus}
          />
          <ClientGeminiStudio
            language={language}
            userId={userId}
            currentWorld={currentWorld}
            onContent={() => runIfPersonaUnlocked(lifeProjectTemplates[language].find((template) => template.badge === "Launch")?.personaId ?? lifeProjectTemplates[language][0].personaId, onContent)}
            onPersona={onPersona}
            onStory={onStory}
          />
          <VisitorChallengeDeck language={language} onRun={(text, world, personaId) => runIfPersonaUnlocked(personaId, () => onVisitorChallenge(text, world, personaId))} />
          <LifeProjectShowcase language={language} onRun={(text, world, personaId, projectBadge) => runIfPersonaUnlocked(personaId, () => onLifeProject(text, world, personaId, projectBadge))} />
          <ConsultantHub language={language} onRun={(text, world, personaId, consultantBadge) => runIfPersonaUnlocked(personaId, () => onConsultant(text, world, personaId, consultantBadge))} />
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <section className="mt-5 w-full overflow-hidden rounded-[1.35rem] border border-white/14 bg-[#F7F3EC]/[0.045] text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="relative grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 18% 12%, ${hexToRgba(activeSlide.accent, 0.2)}, transparent 28rem)` }} />
        <div className="relative min-h-[25rem] overflow-hidden border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-e">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="ui-kicker" style={{ color: activeSlide.accent }}>{isArabic ? "واجهة ذكية للزائر" : "Smart visitor showcase"}</p>
              <h2 className="mt-2 max-w-xl font-arui text-2xl font-semibold leading-8 text-[#F7F3EC]/95 sm:text-3xl sm:leading-10">
                {isArabic ? "كل ميزة في لقطة واضحة" : "One clear feature at a time"}
              </h2>
            </div>
            <button type="button" onClick={() => setIsExpanded(true)} className="ui-action shrink-0 rounded-full border border-white/12 bg-black/24 px-3 py-2 font-arsans text-xs text-[#F7F3EC]/72 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
              {isArabic ? "تكبير" : "Maximize"}
            </button>
          </div>

          <div key={activeSlide.key} className="mt-8 transition-all duration-500 ease-out">
            <span className="inline-flex rounded-full border border-white/12 bg-black/24 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: activeSlide.accent }} dir="ltr">
              {activeSlide.eyebrow}
            </span>
            <h3 className="mt-4 max-w-xl font-arui text-3xl font-semibold leading-10 text-[#F7F3EC]/95 sm:text-4xl sm:leading-[3rem]">
              {activeSlide.title}
            </h3>
            <p className="mt-3 max-w-lg font-arsans text-sm leading-7 text-[#F7F3EC]/58 sm:text-base">
              {activeSlide.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeSlide.chips.map((chip) => (
                <span key={chip} className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 font-arsans text-[11px] text-[#F7F3EC]/68">
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 px-3 py-3 font-arsans text-xs leading-5 text-[#F7F3EC]/62">
              {activeSlide.proof}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2" dir="ltr">
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-9" : "w-2.5 bg-white/18 hover:bg-white/34"}`}
                  style={index === activeIndex ? { backgroundColor: activeSlide.accent } : undefined}
                  aria-label={isArabic ? `اعرض ${slide.eyebrow}` : `Show ${slide.eyebrow}`}
                />
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-[auto_auto]">
              <button type="button" onClick={runActiveSlideAction} className="ui-action rounded-xl px-4 py-3 text-sm text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]" style={{ backgroundColor: activeSlide.accent }}>
                {activePersonaLocked ? (isArabic ? "افتح مع بلس" : "Unlock with Plus") : activeSlide.actionLabel}
              </button>
              <button type="button" onClick={() => setIsExpanded(true)} className="ui-action rounded-xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-[#F7F3EC]/72 transition-colors hover:border-[#F7F3EC]/35 hover:text-[#F7F3EC]">
                {isArabic ? "شاهد الكل" : "See all"}
              </button>
            </div>
          </div>
        </div>

        <div className="relative min-h-[22rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))] p-4 sm:p-5">
          <div className="flex h-full flex-col justify-between gap-5 rounded-[1.1rem] border border-white/10 bg-black/22 p-4">
            {personaAccessEnabled ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="ui-kicker" style={{ color: activeSlide.accent }}>{isArabic ? "كل شخصيات فضفضة" : "All FadFada personas"}</p>
                    <h3 className="mt-2 font-arui text-2xl font-semibold text-[#F7F3EC]/95">{activePersonaName}</h3>
                    <p className="mt-1 font-arsans text-sm leading-6 text-[#F7F3EC]/54">{activePersonaRole}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${activePersonaLocked ? "border-[#C9A86A]/30 bg-[#C9A86A]/10 text-[#C9A86A]" : "border-white/10 bg-white/[0.045] text-[#F7F3EC]/50"}`} dir="ltr">
                    {activePersonaLocked ? "PLUS PREVIEW" : activeSlide.key.replace("-", " ")}
                  </span>
                </div>

                <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-[2rem] border border-white/14 bg-black/28 shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:h-56 sm:w-56" style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 0 70px ${hexToRgba(activeSlide.accent, 0.34)}` }}>
                  <Image src={activePersonaPresentation.avatarPath} alt={activePersonaName} fill sizes="224px" className="object-cover" />
                </div>
                {activePersonaLocked ? (
                  <p className="rounded-xl border border-[#C9A86A]/24 bg-[#C9A86A]/10 px-3 py-2 text-center font-arsans text-xs leading-5 text-[#F7F3EC]/70">
                    {isArabic ? "يمكن للزائر رؤية الشخصية والنتيجة المتوقعة، لكن التشغيل الكامل يفتح مع بلس." : "Visitors can preview this persona and value, but running it unlocks with Plus."}
                  </p>
                ) : null}
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[#F7F3EC]/38" dir="ltr">
                  {personaCarousel.length > 0 ? `${activePersonaIndex + 1}/${personaCarousel.length}` : "0/0"}
                </p>
              </>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-[1rem] border border-white/10 bg-black/20 p-4 text-center">
                <div>
                  <p className="ui-kicker" style={{ color: activeSlide.accent }}>{isArabic ? "الشخصيات مقفلة" : "Personas disabled"}</p>
                  <h3 className="mt-3 font-arui text-2xl font-semibold leading-8 text-[#F7F3EC]/92">
                    {isArabic ? "ظهور الشخصيات يدار من لوحة الأدمن" : "Persona visibility is managed from admin"}
                  </h3>
                  <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/52">
                    {isArabic ? "عند إيقافها أو حجبها، لا نعرض أفاتاراً في واجهة الزائر." : "When disabled or blocked, no avatar is shown in the visitor UI."}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <button type="button" onClick={() => movePersonaCarousel(-1)} className="ui-action rounded-xl border border-white/12 bg-white/[0.045] px-3 py-2.5 text-xs text-[#F7F3EC]/68 transition-colors hover:border-white/28 hover:text-[#F7F3EC]">
                {isArabic ? "السابق" : "Previous"}
              </button>
              <button type="button" onClick={() => movePersonaCarousel(1)} className="ui-action rounded-xl border border-white/12 bg-white/[0.045] px-3 py-2.5 text-xs text-[#F7F3EC]/68 transition-colors hover:border-white/28 hover:text-[#F7F3EC]">
                {isArabic ? "التالي" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {dialog}
    </section>
  );
}

function PersonaPreviewCatalog({
  accessState,
  activePersonaId,
  availablePersonas,
  language,
  onPreview,
  onRequirePlus,
  unlockedPersonaIds,
}: {
  accessState: AccessState;
  activePersonaId: PersonaId;
  availablePersonas: Persona[];
  language: Language;
  onPreview: (personaId: PersonaId) => void;
  onRequirePlus: () => void;
  unlockedPersonaIds: PersonaId[];
}) {
  const isArabic = language === "ar";
  const unlockedPersonaIdSet = new Set(unlockedPersonaIds);

  return (
    <section className="w-full rounded-2xl border border-[#C9A86A]/24 bg-[#C9A86A]/[0.045] p-3 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="ui-kicker text-[#C9A86A]/90">{isArabic ? "معرض الرفاق" : "Persona gallery"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold leading-7 text-[#F7F3EC]/94">
            {isArabic ? "اعرض كل الشخصيات، وافتح التشغيل الكامل مع بلس" : "Preview every persona, unlock full use with Plus"}
          </h2>
          <p className="mt-1 max-w-2xl font-arsans text-sm leading-6 text-[#F7F3EC]/56">
            {isArabic ? "الزائر يرى الوجوه والأدوار بوضوح. الرفاق المقفلون يظهرون كمعاينة تسويقية ولا يبدأون المحادثة إلا بعد الترقية." : "Visitors see the faces and roles clearly. Locked personas appear as marketing previews and only run after upgrade."}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-[#C9A86A]/30 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]" dir="ltr">
          {availablePersonas.length} personas
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {availablePersonas.map((persona) => {
          const presentation = getHeaderAvatarPresentation(persona);
          const displayName = language === "ar" ? presentation.nameAr : presentation.nameEn;
          const role = language === "ar" ? persona.roleAr : persona.roleEn;
          const locked = accessState !== "plus" && !unlockedPersonaIdSet.has(persona.id);
          const active = activePersonaId === persona.id;

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => {
                onPreview(persona.id);
                if (locked) onRequirePlus();
              }}
              className={`group relative min-h-44 overflow-hidden rounded-xl border p-2 text-start transition-all hover:-translate-y-0.5 ${active ? "border-[#C9A86A]/70 bg-[#C9A86A]/10" : locked ? "border-[#C9A86A]/22 bg-black/24 hover:border-[#C9A86A]/48" : "border-white/10 bg-black/18 hover:border-white/28"}`}
              aria-label={locked ? (isArabic ? `معاينة مقفلة: ${displayName}` : `Locked preview: ${displayName}`) : (isArabic ? `معاينة ${displayName}` : `Preview ${displayName}`)}
            >
              <span className="relative block aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/35">
                <Image src={presentation.avatarPath} alt={displayName} fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                {locked ? <span className="absolute end-1.5 top-1.5 rounded-full border border-[#C9A86A]/45 bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#C9A86A]">Plus</span> : null}
              </span>
              <span className="mt-2 block truncate font-arsans text-sm font-semibold text-[#F7F3EC]/90">{displayName}</span>
              <span className="mt-1 line-clamp-2 block font-arsans text-[11px] leading-4 text-[#F7F3EC]/48">{role}</span>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-1 font-arsans text-[10px] ${locked ? "border-[#C9A86A]/30 bg-[#C9A86A]/10 text-[#C9A86A]" : "border-emerald-100/20 bg-emerald-100/10 text-emerald-100/72"}`}>
                {locked ? (isArabic ? "معاينة مقفلة" : "Locked preview") : isArabic ? "مفتوح" : "Unlocked"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function VisitorChallengeDeck({ language, onRun }: { language: Language; onRun: (text: string, world: WorldId, personaId: PersonaId) => void }) {
  const isArabic = language === "ar";

  return (
    <section className="mt-5 w-full rounded-2xl border border-[#C9A86A]/25 bg-[#C9A86A]/[0.055] p-3 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="ui-kicker text-[#C9A86A]/90">{isArabic ? "تحدي الزائر" : "Visitor challenge"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold leading-7 text-[#F7F3EC]/94">
            {isArabic ? "اختر تجربة تجذبك في أول دقيقة" : "Pick a one-minute experience"}
          </h2>
          <p className="mt-1 font-arsans text-sm leading-6 text-[#F7F3EC]/55">
            {isArabic ? "زر واحد يكشف للزائر قيمة فضفضة فوراً: رفيق، قصة، أو خطة." : "One tap shows the value fast: companion match, story card, or action plan."}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[#C9A86A]/30 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]" dir="ltr">
          Live
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {visitorChallengeMoments[language].map((challenge) => (
          <button
            key={challenge.title}
            type="button"
            onClick={() => onRun(challenge.text, challenge.world, challenge.personaId)}
            className="group min-h-36 rounded-xl border border-white/10 bg-black/18 p-3 text-start transition-all hover:-translate-y-0.5 hover:border-[#C9A86A]/50 hover:bg-[#C9A86A]/10"
          >
            <span className="inline-flex rounded-full border border-[#C9A86A]/25 bg-[#C9A86A]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]/85" dir="ltr">
              {challenge.badge}
            </span>
            <span className="mt-3 block font-arsans text-sm font-semibold leading-5 text-[#F7F3EC]/90">{challenge.title}</span>
            <span className="mt-2 block font-arsans text-xs leading-5 text-[#F7F3EC]/48">{challenge.description}</span>
            <span className="mt-3 inline-flex font-arsans text-[11px] text-[#C9A86A]/78 transition-colors group-hover:text-[#F7F3EC]">
              {isArabic ? "ابدأ الآن" : "Start now"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

type ClientVideoInsight = {
  detectedState?: {
    primaryEmotion?: string;
    environmentalStressors?: string[];
    intensityScore?: number;
  };
  responseContent?: {
    replyText?: string;
    microNextStep?: string;
  };
  error?: string;
  message?: string;
};

type GeminiStudioAsset = {
  imageDataUrl?: string;
  model?: string;
  source?: string;
  location?: string;
  error?: string;
  message?: string;
};

function ClientGeminiStudio({
  currentWorld,
  language,
  onContent,
  onPersona,
  onStory,
  userId,
}: {
  currentWorld: WorldId;
  language: Language;
  onContent: () => void;
  onPersona: () => void;
  onStory: () => void;
  userId: string;
}) {
  const isArabic = language === "ar";
  const [videoStatus, setVideoStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [videoInsight, setVideoInsight] = useState<ClientVideoInsight | null>(null);
  const [imagePrompt, setImagePrompt] = useState(
    isArabic
      ? "شخص يقف في غرفة هادئة بعد يوم ضغط، يرى الضوضاء كضباب خفيف، ثم يجد نافذة ذهبية وخطوة صغيرة للأمام."
      : "A person in a quiet room after a pressured day, seeing the noise as light fog, then finding a golden window and one small step forward."
  );
  const [imageStatus, setImageStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [imageAsset, setImageAsset] = useState<GeminiStudioAsset | null>(null);
  const [avatarName, setAvatarName] = useState(isArabic ? "رفيق فضفضة" : "FadFada companion");
  const [avatarDescription, setAvatarDescription] = useState(
    isArabic
      ? "رفيق دافئ، صوته هادئ، يشبه مرشد عربي عصري يساعدني أرتب أفكاري بدون حكم."
      : "A warm companion with a calm voice, like a modern guide who helps me organize my thoughts without judgment."
  );
  const [avatarStatus, setAvatarStatus] = useState<"idle" | "loading" | "ready" | "speaking" | "error">("idle");
  const [avatarAsset, setAvatarAsset] = useState<GeminiStudioAsset | null>(null);

  async function analyzeClientMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setVideoStatus("analyzing");
    setVideoInsight(null);
    const form = new FormData();
    form.append("userId", userId);
    form.append("currentWorld", currentWorld);
    form.append("currentLanguage", language);
    form.append("transcriptHint", isArabic ? "زائر يريد فهماً سريعاً للحظة صوت أو فيديو داخل فضفضة." : "Visitor wants a quick read of an audio or video moment inside FadFada.");
    form.append("video", file);

    const response = await fetch("/api/reflect/video", { method: "POST", body: form }).catch(() => null);
    if (!response?.ok) {
      setVideoStatus("error");
      return;
    }

    const data = (await response.json()) as ClientVideoInsight;
    setVideoInsight(data);
    setVideoStatus(data.error ? "error" : "done");
  }

  async function generateStudioImage() {
    const prompt = imagePrompt.trim();
    if (!prompt || imageStatus === "loading") return;

    setImageStatus("loading");
    setImageAsset(null);
    const response = await fetch("/api/storyboard/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        title: isArabic ? "مشهد Gemini من فضفضة" : "FadFada Gemini scene",
        sceneNumber: 1,
        variation: Date.now() % 10000,
        language,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setImageStatus("error");
      return;
    }

    const data = (await response.json()) as GeminiStudioAsset;
    setImageAsset(data);
    setImageStatus(data.imageDataUrl ? "ready" : "error");
  }

  async function generateStudioAvatar() {
    const name = avatarName.trim();
    const description = avatarDescription.trim();
    if (!name || !description || avatarStatus === "loading") return;

    window.speechSynthesis?.cancel();
    setAvatarStatus("loading");
    setAvatarAsset(null);
    const response = await fetch("/api/avatar/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, language }),
    }).catch(() => null);

    if (!response?.ok) {
      setAvatarStatus("error");
      return;
    }

    const data = (await response.json()) as GeminiStudioAsset;
    setAvatarAsset(data);
    setAvatarStatus(data.imageDataUrl ? "ready" : "error");
  }

  function speakStudioAvatar() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setAvatarStatus("error");
      return;
    }

    const script = isArabic
      ? `أهلاً، أنا ${avatarName.trim() || "رفيق فضفضة"}. أقدر أسمعك، أحلل اللحظة، وأحوّلها لصورة أو خطوة واضحة.`
      : `Hi, I am ${avatarName.trim() || "your FadFada companion"}. I can listen, understand the moment, and turn it into an image or a clear next step.`;
    const utterance = new SpeechSynthesisUtterance(prepareArabicForSpeech(script, language, "egyptian"));
    utterance.lang = language === "ar" ? "ar-EG" : "en-US";
    utterance.rate = language === "ar" ? 0.94 : 0.98;
    utterance.pitch = 0.92;
    utterance.onend = () => setAvatarStatus(avatarAsset?.imageDataUrl ? "ready" : "idle");
    utterance.onerror = () => setAvatarStatus(avatarAsset?.imageDataUrl ? "ready" : "error");
    window.speechSynthesis.cancel();
    setAvatarStatus("speaking");
    window.speechSynthesis.speak(utterance);
  }

  const videoMessage = videoInsight?.message || videoInsight?.responseContent?.replyText;
  const videoStep = videoInsight?.responseContent?.microNextStep;

  return (
    <section className="mt-5 w-full overflow-hidden rounded-2xl border border-emerald-100/20 bg-emerald-100/[0.045] text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.35fr]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_16%,rgba(110,231,183,0.18),transparent_34%),linear-gradient(135deg,rgba(9,22,19,0.96),rgba(17,41,35,0.72))] p-4 lg:border-b-0 lg:border-e">
          <p className="ui-kicker text-emerald-100/85">{isArabic ? "استوديو Gemini للزائر" : "Gemini studio for visitors"}</p>
          <h2 className="mt-2 max-w-sm font-arui text-2xl font-semibold leading-8 text-[#F7F3EC]/95">
            {isArabic ? "ليس شات فقط: اصنع، اسمع، ارفع، وجرّب" : "Not just chat: create, listen, upload, and try"}
          </h2>
          <p className="mt-3 max-w-md font-arsans text-sm leading-6 text-[#F7F3EC]/58">
            {isArabic ? "هذه أدوات حقيقية للعميل: توليد صور، تحليل صوت/فيديو، شخصية خاصة، ومخرجات جاهزة للاستخدام." : "These are real client tools: image generation, audio/video understanding, custom personas, and ready-to-use outputs."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["Text", "Image", "Video", "Voice", "Persona"] as const).map((item) => (
              <span key={item} className="rounded-full border border-emerald-100/20 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/70" dir="ltr">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 p-3 lg:grid-cols-2">
          <div className="flex min-h-64 flex-col rounded-xl border border-white/10 bg-black/18 p-3 text-start">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/75">Image</span>
            <span className="mt-2 font-arsans text-sm font-semibold leading-5 text-[#F7F3EC]/90">{isArabic ? "اكتب برومبت وشاهد صورة فوراً" : "Write a prompt and see an image"}</span>
            <textarea value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} rows={3} className="mt-3 min-h-20 rounded-lg border border-white/10 bg-black/24 px-3 py-2 font-arsans text-xs leading-5 text-[#F7F3EC]/84 outline-none transition-colors placeholder:text-[#F7F3EC]/35 focus:border-emerald-100/45" />
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <button type="button" onClick={generateStudioImage} disabled={imageStatus === "loading"} className="ui-action rounded-lg bg-emerald-100 px-3 py-2.5 text-xs text-[#0E0D10] transition-colors hover:bg-[#F7F3EC] disabled:animate-pulse disabled:opacity-70">
                {imageStatus === "loading" ? (isArabic ? "جاري التوليد" : "Generating") : isArabic ? "ولّد صورة" : "Generate image"}
              </button>
              <button type="button" onClick={onStory} className="ui-action rounded-lg border border-emerald-100/30 px-3 py-2.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]">
                {isArabic ? "قصة كاملة" : "Full story"}
              </button>
            </div>
            {imageStatus === "ready" && imageAsset?.imageDataUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-emerald-100/20 bg-black/20">
                <img src={imageAsset.imageDataUrl} alt={isArabic ? "صورة مولدة من Gemini" : "Generated Gemini image"} className="aspect-video w-full object-cover" />
                <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/58" dir="ltr">{imageAsset.source || "gemini_image"} · {imageAsset.model || "image model"}</p>
              </div>
            ) : null}
            {imageStatus === "error" ? <p className="mt-3 rounded-lg border border-red-200/25 bg-red-200/10 px-3 py-2 font-arsans text-xs text-red-100">{isArabic ? "تعذر توليد الصورة الآن. جرّب برومبت أقصر." : "Image generation failed. Try a shorter prompt."}</p> : null}
          </div>

          <label className="group flex min-h-40 cursor-pointer flex-col rounded-xl border border-white/10 bg-black/18 p-3 text-start transition-all hover:-translate-y-0.5 hover:border-emerald-100/45 hover:bg-emerald-100/10">
            <input type="file" accept="audio/*,video/*" className="sr-only" onChange={analyzeClientMedia} disabled={videoStatus === "analyzing"} />
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/75">Video</span>
            <span className="mt-3 font-arsans text-sm font-semibold leading-5 text-[#F7F3EC]/90">{isArabic ? "ارفع صوتاً أو فيديو" : "Upload audio or video"}</span>
            <span className="mt-2 font-arsans text-xs leading-5 text-[#F7F3EC]/50">{isArabic ? "Gemini يقرأ اللحظة ويقترح خطوة." : "Gemini reads the moment and suggests a step."}</span>
            <span className="mt-auto pt-4 font-arsans text-[11px] text-emerald-100/75 group-hover:text-[#F7F3EC]">
              {videoStatus === "analyzing" ? (isArabic ? "جاري التحليل..." : "Analyzing...") : isArabic ? "اختَر ملفاً" : "Choose file"}
            </span>
          </label>

          <div className="flex min-h-64 flex-col rounded-xl border border-white/10 bg-black/18 p-3 text-start">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/75">Persona</span>
            <span className="mt-2 font-arsans text-sm font-semibold leading-5 text-[#F7F3EC]/90">{isArabic ? "اصنع شخصية بصورة وصوت" : "Create a speaking persona"}</span>
            <input value={avatarName} onChange={(event) => setAvatarName(event.target.value)} className="mt-3 rounded-lg border border-white/10 bg-black/24 px-3 py-2 font-arsans text-xs text-[#F7F3EC]/84 outline-none transition-colors focus:border-emerald-100/45" aria-label={isArabic ? "اسم الشخصية" : "Persona name"} />
            <textarea value={avatarDescription} onChange={(event) => setAvatarDescription(event.target.value)} rows={3} className="mt-2 min-h-20 rounded-lg border border-white/10 bg-black/24 px-3 py-2 font-arsans text-xs leading-5 text-[#F7F3EC]/84 outline-none transition-colors focus:border-emerald-100/45" aria-label={isArabic ? "وصف الشخصية" : "Persona description"} />
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={generateStudioAvatar} disabled={avatarStatus === "loading"} className="ui-action rounded-lg bg-emerald-100 px-3 py-2.5 text-xs text-[#0E0D10] transition-colors hover:bg-[#F7F3EC] disabled:animate-pulse disabled:opacity-70">
                {avatarStatus === "loading" ? (isArabic ? "جاري" : "Creating") : isArabic ? "ولّد" : "Create"}
              </button>
              <button type="button" onClick={speakStudioAvatar} disabled={avatarStatus === "loading"} className="ui-action rounded-lg border border-emerald-100/30 px-3 py-2.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10] disabled:opacity-60">
                {avatarStatus === "speaking" ? (isArabic ? "يتكلم" : "Speaking") : isArabic ? "تكلم" : "Speak"}
              </button>
              <button type="button" onClick={onPersona} className="ui-action rounded-lg border border-white/10 px-3 py-2.5 text-xs text-[#F7F3EC]/62 transition-colors hover:border-emerald-100/35 hover:text-emerald-100">
                {isArabic ? "احفظ" : "Save"}
              </button>
            </div>
            {avatarStatus !== "idle" && avatarStatus !== "loading" && avatarAsset?.imageDataUrl ? (
              <div className="mt-3 grid grid-cols-[4.75rem_1fr] items-center gap-3 rounded-xl border border-emerald-100/20 bg-emerald-100/[0.055] p-2">
                <img src={avatarAsset.imageDataUrl} alt={avatarName} className="h-16 w-16 rounded-2xl object-cover" />
                <p className="font-arsans text-xs leading-5 text-[#F7F3EC]/62">{isArabic ? "تم إنشاء أفاتار. اضغط تكلم لتسمع الشخصية." : "Avatar created. Press Speak to hear the persona."}</p>
              </div>
            ) : null}
            {avatarStatus === "error" ? <p className="mt-3 rounded-lg border border-red-200/25 bg-red-200/10 px-3 py-2 font-arsans text-xs text-red-100">{isArabic ? "تعذر إنشاء الشخصية أو تشغيل الصوت الآن." : "Could not create the persona or play speech right now."}</p> : null}
          </div>

          <button type="button" onClick={onContent} className="group flex min-h-40 flex-col rounded-xl border border-white/10 bg-black/18 p-3 text-start transition-all hover:-translate-y-0.5 hover:border-emerald-100/45 hover:bg-emerald-100/10">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/75">Output</span>
            <span className="mt-3 font-arsans text-sm font-semibold leading-5 text-[#F7F3EC]/90">{isArabic ? "مخرجات جاهزة" : "Ready outputs"}</span>
            <span className="mt-2 font-arsans text-xs leading-5 text-[#F7F3EC]/50">{isArabic ? "بوست، برزنتيشن، CTA، وخطة نشر." : "Post, presentation, CTA, and launch plan."}</span>
            <span className="mt-auto pt-4 font-arsans text-[11px] text-emerald-100/75 group-hover:text-[#F7F3EC]">{isArabic ? "ابدأ المحتوى" : "Start content"}</span>
          </button>
        </div>
      </div>
      {videoStatus !== "idle" ? (
        <div className="border-t border-white/10 px-4 py-3 font-arsans text-xs leading-5 text-[#F7F3EC]/58">
          {videoStatus === "analyzing" ? (isArabic ? "نحلل الملف الآن داخل فضفضة..." : "Analyzing the file inside FadFada...") : null}
          {videoStatus === "error" ? (videoMessage || (isArabic ? "لم نستطع تحليل الملف الآن. جرّب ملفاً أصغر أو مقطعاً أقصر." : "We could not analyze this file now. Try a smaller file or shorter clip.")) : null}
          {videoStatus === "done" ? (
            <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr]">
              <p className="rounded-lg border border-emerald-100/15 bg-emerald-100/[0.055] px-3 py-2 text-emerald-100/75">
                {videoInsight?.detectedState?.primaryEmotion || (isArabic ? "تم فهم اللحظة" : "Moment understood")}
              </p>
              <p className="rounded-lg border border-white/10 bg-black/16 px-3 py-2">
                {videoStep || videoMessage || (isArabic ? "خذ خطوة صغيرة الآن بناءً على ما ظهر في الملف." : "Take one small next step based on what the file showed.")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function LifeProjectShowcase({ language, onRun }: { language: Language; onRun: (text: string, world: WorldId, personaId: PersonaId, projectBadge: string) => void }) {
  const isArabic = language === "ar";
  const templates = lifeProjectTemplates[language];
  const featured = templates[0];
  const supporting = templates.slice(1);

  return (
    <section className="mt-5 w-full overflow-hidden rounded-2xl border border-[#F7F3EC]/14 bg-[#F7F3EC]/[0.045] text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="grid gap-0 lg:grid-cols-[1.05fr_1.25fr]">
        <button
          type="button"
          onClick={() => onRun(featured.text, featured.world, featured.personaId, featured.badge)}
          className="group relative min-h-64 overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_18%_16%,rgba(201,168,106,0.22),transparent_34%),linear-gradient(135deg,rgba(22,18,13,0.96),rgba(50,36,18,0.72))] p-4 text-start transition-all hover:bg-[#C9A86A]/10 lg:border-b-0 lg:border-e"
        >
          <div className="absolute inset-x-5 top-5 h-px bg-gradient-to-r from-transparent via-[#C9A86A]/50 to-transparent" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ui-kicker text-[#C9A86A]/90">{isArabic ? "مشاريع الحياة" : "Life projects"}</p>
                  <h2 className="mt-2 max-w-sm font-arui text-2xl font-semibold leading-8 text-[#F7F3EC]/95">
                    {isArabic ? "ابدأ بقالب، واخرج بشيء تستخدمه" : "Start with a template, leave with something useful"}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full border border-[#C9A86A]/35 bg-black/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]" dir="ltr">
                  Director
                </span>
              </div>
              <p className="mt-3 max-w-md font-arsans text-sm leading-6 text-[#F7F3EC]/58">
                {isArabic ? "بدل سؤال مفتوح، اختر مشروعاً جاهزاً: مقابلة، ميزانية، رسالة، مذاكرة، مشروع، أو إطلاق محتوى." : "Instead of a blank chat, choose a ready project: interview, budget, message, study, business, or content launch."}
              </p>
            </div>
            <div className="rounded-xl border border-[#C9A86A]/20 bg-black/24 p-3 transition-all group-hover:border-[#C9A86A]/45">
              <span className="inline-flex rounded-full border border-[#C9A86A]/25 bg-[#C9A86A]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]/85" dir="ltr">
                {featured.badge}
              </span>
              <h3 className="mt-3 font-arui text-xl font-semibold leading-7 text-[#F7F3EC]/94">{featured.title}</h3>
              <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/58">{featured.description}</p>
              <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 font-arsans text-xs leading-5 text-[#F7F3EC]/62">{featured.bring}</p>
              <span className="mt-4 inline-flex font-arsans text-xs font-semibold text-[#C9A86A] transition-colors group-hover:text-[#F7F3EC]">
                {isArabic ? "ابدأ المشروع" : "Start project"}
              </span>
            </div>
          </div>
        </button>

        <div className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="font-arsans text-sm leading-6 text-[#F7F3EC]/58">
              {isArabic ? "كل مشروع يطلب منك المدخلات ثم يبني مخرجات واضحة." : "Each project asks for inputs, then builds clear artifacts."}
            </p>
            <span className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#F7F3EC]/52" dir="ltr">
              {templates.length} templates
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {supporting.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => onRun(template.text, template.world, template.personaId, template.badge)}
                className="group flex min-h-40 flex-col rounded-xl border border-white/10 bg-black/18 p-3 text-start transition-all hover:-translate-y-0.5 hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex rounded-full border border-[#C9A86A]/22 bg-[#C9A86A]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]/80" dir="ltr">
                    {template.badge}
                  </span>
                  <span className="font-arsans text-[11px] text-[#C9A86A]/72 transition-colors group-hover:text-[#F7F3EC]">
                    {isArabic ? "ابدأ" : "Start"}
                  </span>
                </div>
                <span className="mt-3 block font-arsans text-sm font-semibold leading-5 text-[#F7F3EC]/90">{template.title}</span>
                <span className="mt-2 block font-arsans text-xs leading-5 text-[#F7F3EC]/50">{template.description}</span>
                <span className="mt-3 block font-arsans text-[11px] leading-5 text-[#F7F3EC]/46">{template.bring}</span>
                <span className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  {template.artifacts.map((artifact) => (
                    <span key={artifact} className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 font-arsans text-[10px] text-[#F7F3EC]/58">
                      {artifact}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ConsultantHub({ language, onRun }: { language: Language; onRun: (text: string, world: WorldId, personaId: PersonaId, consultantBadge: string) => void }) {
  const isArabic = language === "ar";

  return (
    <section className="mt-5 w-full rounded-2xl border border-cyan-100/25 bg-cyan-100/[0.055] p-3 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="ui-kicker text-cyan-100/85">{isArabic ? "مركز الاستشارات" : "Consultant hub"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold leading-7 text-[#F7F3EC]/94">
            {isArabic ? "ادخل بالسؤال العملي الذي يحتاجه الناس" : "Start with the practical help people need"}
          </h2>
          <p className="mt-1 max-w-2xl font-arsans text-sm leading-6 text-[#F7F3EC]/56">
            {isArabic ? "استشارات عملية للحياة والعمل والدراسة والمال والعلاقات. كل اختيار يبدأ بسؤال ذكي ثم يخرج بخطوات قابلة للتنفيذ." : "Practical consults for life, work, study, money, and relationships. Each choice starts with the right question and ends with usable next steps."}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-cyan-100/25 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-cyan-100" dir="ltr">
          Useful
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {consultantScenarios[language].map((scenario) => (
          <button
            key={scenario.title}
            type="button"
            onClick={() => onRun(scenario.text, scenario.world, scenario.personaId, scenario.badge)}
            className="group flex min-h-36 flex-col rounded-xl border border-white/10 bg-black/18 p-3 text-start transition-all hover:-translate-y-0.5 hover:border-cyan-100/45 hover:bg-cyan-100/10"
          >
            <span className="inline-flex w-fit rounded-full border border-cyan-100/25 bg-cyan-100/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-cyan-100/85" dir="ltr">
              {scenario.badge}
            </span>
            <span className="mt-3 block font-arsans text-sm font-semibold leading-5 text-[#F7F3EC]/90">{scenario.title}</span>
            <span className="mt-2 block font-arsans text-xs leading-5 text-[#F7F3EC]/50">{scenario.description}</span>
            <span className="mt-3 block rounded-lg border border-cyan-100/15 bg-cyan-100/[0.055] px-2.5 py-2 font-arsans text-[11px] leading-5 text-cyan-100/72">
              {scenario.intake}
            </span>
            <span className="mt-auto pt-4 font-arsans text-[11px] text-cyan-100/75 transition-colors group-hover:text-[#F7F3EC]">
              {scenario.output}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 px-1 font-arsans text-[11px] leading-5 text-[#F7F3EC]/42">
        {isArabic ? "التخصصات الحساسة تقدم معلومات عامة وتنظيماً للأسئلة، وليست بديلاً عن محامٍ أو طبيب أو مستشار مالي مرخص." : "Sensitive domains provide general information and better questions, not a replacement for a licensed lawyer, clinician, or financial professional."}
      </p>
    </section>
  );
}

function FeatureAnnouncementCard({ language, onTry }: { language: Language; onTry: () => void }) {
  const isArabic = language === "ar";

  return (
    <section className="mt-4 w-full rounded-2xl border border-cyan-100/25 bg-cyan-100/[0.07] p-3 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ui-kicker text-cyan-100/85">{isArabic ? "ميزة جديدة" : "New feature"}</p>
          <h2 className="mt-1 font-arui text-lg font-semibold leading-7 text-[#F7F3EC]/92">
            {isArabic ? "جرّب لوحة المشاهد بخطوة واحدة" : "Try Storyboard in one tap"}
          </h2>
          <div className="mt-2 grid gap-1.5 font-arsans text-sm leading-6 text-[#F7F3EC]/58">
            {(isArabic
              ? ["اضغط الزر لتشغيل مثال بصري جاهز.", "بعد الرد، انزل إلى خلاصة الفضفضة.", "اضغط حوّلها للوحة مشاهد لترى صوراً وبرومبتات."]
              : ["Press the button to run a visual demo.", "After the reply, scroll to the Reflection summary.", "Press Turn into storyboard to see images and prompts."]
            ).map((step, index) => (
              <p key={step} className="grid grid-cols-[1.5rem_1fr] gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-100/12 font-mono text-[10px] text-cyan-100">{index + 1}</span>
                <span>{step}</span>
              </p>
            ))}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-100/25 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-cyan-100" dir="ltr">
          Story
        </span>
      </div>
      <button type="button" onClick={onTry} className="ui-action mt-3 w-full rounded-xl bg-cyan-100 px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
        {isArabic ? "شغّل مثال توليد الصور" : "Run image generation demo"}
      </button>
    </section>
  );
}

function PlusWelcomeCard({ language, onExplore, onClose }: { language: Language; onExplore: () => void; onClose: () => void }) {
  const isArabic = language === "ar";
  const items = isArabic
    ? ["كل الرفقاء والشخصيات", "حفظ الجلسات والعودة لها", "لوحات مشاهد وبطاقات إثبات", "استمرارية أعمق للرحلة"]
    : ["All companions and personas", "Saved sessions you can reopen", "Storyboards and proof cards", "Deeper journey continuity"];

  return (
    <section className="mt-4 w-full rounded-2xl border border-gold/35 bg-gold/[0.09] p-4 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-gold">{isArabic ? "أهلاً بك في بلس" : "Welcome to Plus"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/94">{isArabic ? "رحلتك أصبحت مفتوحة أكثر" : "Your journey is now more open"}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-xs text-[#F7F3EC]/45 transition hover:border-gold/45 hover:text-gold" aria-label={isArabic ? "إغلاق ترحيب بلس" : "Close Plus welcome"}>×</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <p key={item} className="rounded-xl border border-white/10 bg-black/16 px-3 py-2 font-arsans text-sm text-[#F7F3EC]/68">{item}</p>
        ))}
      </div>
      <button type="button" onClick={onExplore} className="ui-action mt-3 w-full rounded-xl bg-gold px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
        {isArabic ? "استكشف مزايا بلس" : "Explore Plus benefits"}
      </button>
    </section>
  );
}

function LearningResourcePreview({ language, resources }: { language: Language; resources: LearningResource[] }) {
  const isArabic = language === "ar";
  const visibleResources = resources.slice(0, 3);

  return (
    <section className="mt-4 grid gap-2" dir={isArabic ? "rtl" : "ltr"}>
      <p className="font-arsans text-[11px] font-semibold text-[#C9A86A]/72">{isArabic ? "مصادر ومشاهدة" : "Sources and preview"}</p>
      {visibleResources.map((resource) => {
        const playable = getPlayableVideoSource(resource.url);
        const canPreview = resource.type === "video" && playable;

        return (
          <article key={`${resource.url}-${resource.title}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] text-start">
            {canPreview && playable.kind === "youtube" ? (
              <iframe
                src={playable.src}
                title={resource.title}
                className="aspect-video w-full border-0 bg-black"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : null}
            {canPreview && playable.kind === "file" ? (
              <video src={playable.src} controls preload="metadata" className="aspect-video w-full bg-black" />
            ) : null}
            <div className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-arsans text-sm font-semibold text-[#F7F3EC]/88">{resource.title}</p>
                  <p className="mt-1 line-clamp-2 font-arsans text-xs leading-5 text-[#F7F3EC]/48">{resource.summary}</p>
                </div>
                <span className="rounded-full border border-[#C9A86A]/25 bg-[#C9A86A]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#C9A86A]" dir="ltr">
                  {resource.type}
                </span>
              </div>
              {!canPreview && resource.type === "video" ? (
                <p className="mt-2 rounded-xl border border-amber-200/20 bg-amber-200/10 px-3 py-2 font-arsans text-xs leading-5 text-amber-100/78">
                  {isArabic ? "هذا الرابط صفحة بحث أو تحويل، لذلك لا يمكن تشغيله داخل التطبيق مباشرة." : "This is a search or redirect page, so it cannot play inline."}
                </p>
              ) : null}
              <a href={resource.url} target="_blank" rel="noreferrer" className="ui-action mt-3 inline-flex rounded-xl border border-white/12 px-3 py-2 font-arsans text-xs text-[#F7F3EC]/72 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
                {resource.type === "video" ? (isArabic ? "فتح الفيديو أو البحث" : "Open video or search") : isArabic ? "فتح المصدر" : "Open source"}
              </a>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function getPlayableVideoSource(url: string): { kind: "youtube" | "file"; src: string } | null {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, "");
    let youtubeId = "";

    if (host === "youtu.be") {
      youtubeId = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      youtubeId = parsedUrl.searchParams.get("v") || "";
      if (!youtubeId && parsedUrl.pathname.startsWith("/shorts/")) youtubeId = parsedUrl.pathname.split("/")[2] || "";
      if (!youtubeId && parsedUrl.pathname.startsWith("/embed/")) youtubeId = parsedUrl.pathname.split("/")[2] || "";
    }

    if (/^[\w-]{11}$/.test(youtubeId)) {
      return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
    }

    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(parsedUrl.href)) {
      return { kind: "file", src: parsedUrl.href };
    }
  } catch {
    return null;
  }

  return null;
}

function JudgeDemoCallout({ language, onRun }: { language: Language; onRun: () => void }) {
  const isArabic = language === "ar";

  return (
    <section className="mt-4 w-full rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.055] p-3 text-start shadow-xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="ui-kicker text-emerald-100/80">{isArabic ? "عرض الحكام" : "Judge demo"}</p>
          <p className="mt-1 font-arsans text-sm leading-6 text-[#F7F3EC]/62">
            {isArabic ? "شغّل رحلة جاهزة تعرض: رفيق مناسب، رد عاطفي، إيصال، ولوحة مشاهد." : "Run a ready journey showing companion match, reflection, receipt, and storyboard."}
          </p>
        </div>
        <button type="button" onClick={onRun} className="ui-action shrink-0 rounded-full bg-emerald-100 px-3 py-2 text-xs text-[#0E0D10] transition hover:bg-[#F7F3EC]">
          {isArabic ? "تشغيل" : "Run"}
        </button>
      </div>
    </section>
  );
}

function FirstMomentPanel({ language, onSelect, onPersona, onDemo }: { language: Language; onSelect: (text: string, world: WorldId) => void; onPersona?: () => void; onDemo: () => void }) {
  const isArabic = language === "ar";
  const moments = isArabic
    ? [
        { label: "محتاج أفضفض", text: "أنا محتاج أفضفض من غير حكم. اسمعني بهدوء وساعدني أفهم اللي جوايا.", world: "calm" as WorldId },
        { label: "حوّلها لخطة", text: "عندي حاجة مضايقاني ومحتاج أحولها لخطوة عملية صغيرة أبدأ بها الآن.", world: "build" as WorldId },
        { label: "احكيها كقصة", text: "حوّل إحساسي إلى مشهد رمزي قصير يساعدني أشوف نفسي من بعيد.", world: "story" as WorldId },
        { label: "طمني", text: "محتاج طمأنة هادئة وكلام بسيط يساعدني أتنفس بدون نصائح كثيرة.", world: "faith" as WorldId },
      ]
    : [
        { label: "I need to vent", text: "I need to vent without judgment. Listen calmly and help me understand what is inside me.", world: "calm" as WorldId },
        { label: "Turn it into a plan", text: "Something is bothering me and I need to turn it into one practical step I can start now.", world: "build" as WorldId },
        { label: "Tell it as a story", text: "Turn this feeling into a short symbolic scene that helps me see myself from a distance.", world: "story" as WorldId },
        { label: "Reassure me", text: "I need calm reassurance and simple words that help me breathe without too much advice.", world: "faith" as WorldId },
      ];

  return (
    <section className="mt-5 w-full rounded-2xl border border-[#C9A86A]/20 bg-black/18 p-3 shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3 px-1 text-start">
        <div>
          <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "اختر البداية" : "Choose your start"}</p>
          <p className="mt-1 font-arsans text-sm leading-6 text-[#F7F3EC]/62">{isArabic ? "لا تفكر في صياغة مثالية. اختر ما تحتاجه الآن." : "No need to phrase it perfectly. Pick what you need now."}</p>
        </div>
        {onPersona ? (
        <button type="button" onClick={onPersona} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 font-arsans text-[11px] text-[#F7F3EC]/58 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
          {isArabic ? "اختر رفيق" : "Pick companion"}
        </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {moments.map((moment) => (
          <button key={moment.label} type="button" onClick={() => onSelect(moment.text, moment.world)} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-start transition-all hover:-translate-y-0.5 hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10">
            <span className="block font-arsans text-sm font-semibold text-[#F7F3EC]/88">{moment.label}</span>
            <span className="mt-1 block font-arsans text-[11px] text-[#C9A86A]/70">{worldLabels[moment.world][language]}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onDemo} className="mt-3 w-full rounded-xl border border-cyan-100/25 bg-cyan-100/10 px-3 py-3 text-center font-arsans text-sm text-cyan-100 transition-colors hover:bg-cyan-100 hover:text-[#0E0D10]">
        {isArabic ? "جرّب لقطة الديمو في ٦٠ ثانية" : "Try the 60-second demo moment"}
      </button>
    </section>
  );
}

function ReturnMemoryCard({ language, continuity, onContinue, onSaveSnapshot }: { language: Language; continuity: ReturnType<typeof buildConversationContinuity>; onContinue: () => void; onSaveSnapshot: () => void }) {
  if (!continuity || continuity.count < 1) return null;

  const isArabic = language === "ar";

  return (
    <section className="mt-4 w-full rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.045] p-3 text-start shadow-xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ui-kicker text-emerald-100/80">{isArabic ? "ذاكرة ناعمة" : "Soft memory"}</p>
          <p className="mt-1 truncate font-arsans text-sm text-[#F7F3EC]/72">
            {isArabic ? "آخر خيط: " : "Last thread: "}{continuity.topic}
          </p>
          <p className="mt-1 line-clamp-2 font-arsans text-xs leading-5 text-[#F7F3EC]/48">
            {isArabic ? "الخطوة التالية: " : "Next step: "}{continuity.step}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-arsans text-[10px] text-emerald-100/78">{worldLabels[continuity.world][language]}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onContinue} className="ui-action rounded-lg bg-emerald-100 px-3 py-2.5 text-xs text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
          {isArabic ? "كمّل الخيط" : "Continue thread"}
        </button>
        <button type="button" onClick={onSaveSnapshot} className="ui-action rounded-lg border border-emerald-100/35 px-3 py-2.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]">
          {isArabic ? "احفظ لقطة" : "Save snapshot"}
        </button>
      </div>
    </section>
  );
}

function DailyPulseCheckIn({
  language,
  value,
  stats,
  disabled,
  onChange,
  onSubmit,
}: {
  language: Language;
  value: DailyPulseState;
  stats: DailyPulseStats;
  disabled: boolean;
  onChange: (value: DailyPulseState) => void;
  onSubmit: () => void;
}) {
  const isArabic = language === "ar";
  const today = new Date().toISOString().slice(0, 10);
  const checkedToday = stats.lastDate === today;

  return (
    <section className="mt-6 w-full rounded-xl border border-emerald-300/20 bg-emerald-300/[0.035] p-4 shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-4">
        <div className="text-start">
          <p className="ui-kicker">{isArabic ? "نبض اليوم" : "Daily pulse"}</p>
          <h2 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/90">{isArabic ? "كيف أنت الآن؟" : "How are you right now?"}</h2>
          <p className="mt-1 font-arsans text-sm leading-6 text-[#F7F3EC]/55">
            {isArabic ? "اختر حالتك، وسنحوّلها لرد عملي مخصص لهذا اليوم." : "Choose your state and turn it into a practical reflection for today."}
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center">
          <p className="font-mono text-lg text-emerald-200">{stats.streak}</p>
          <p className="font-arsans text-[10px] text-[#F7F3EC]/45">{isArabic ? "سلسلة" : "streak"}</p>
        </div>
      </div>

      <DailyPulseOptionGroup
        language={language}
        label={isArabic ? "المزاج" : "Mood"}
        options={dailyPulseOptions.mood}
        active={value.mood}
        onSelect={(mood) => onChange({ ...value, mood })}
      />
      <DailyPulseOptionGroup
        language={language}
        label={isArabic ? "الطاقة" : "Energy"}
        options={dailyPulseOptions.energy}
        active={value.energy}
        onSelect={(energy) => onChange({ ...value, energy })}
      />
      <DailyPulseOptionGroup
        language={language}
        label={isArabic ? "أحتاج" : "I need"}
        options={dailyPulseOptions.need}
        active={value.need}
        onSelect={(need) => onChange({ ...value, need })}
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="ui-action mt-4 w-full rounded-lg bg-emerald-200 px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC] disabled:opacity-60"
      >
        {checkedToday
          ? isArabic
            ? "تحديث نبض اليوم"
            : "Update today's pulse"
          : isArabic
            ? "ابدأ تسجيل اليوم"
            : "Start today's check-in"}
      </button>
      <p className="mt-2 text-center font-arsans text-xs text-[#F7F3EC]/40">
        {isArabic ? `${stats.count} تسجيلات محفوظة على هذا الجهاز` : `${stats.count} check-ins saved on this device`}
      </p>
    </section>
  );
}

function DailyPulseOptionGroup<T extends keyof typeof dailyPulseOptions.mood | keyof typeof dailyPulseOptions.energy | keyof typeof dailyPulseOptions.need>({
  language,
  label,
  options,
  active,
  onSelect,
}: {
  language: Language;
  label: string;
  options: Record<T, { ar: string; en: string }>;
  active: T;
  onSelect: (value: T) => void;
}) {
  const isArabic = language === "ar";

  return (
    <div className="mt-4 text-start">
      <p className="mb-2 font-arsans text-xs text-[#F7F3EC]/45">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(options) as T[]).map((key) => {
          const selected = key === active;
          return (
            <button
              key={String(key)}
              type="button"
              onClick={() => onSelect(key)}
              className={`rounded-lg border px-2 py-2 text-center text-xs transition-colors ${isArabic ? "font-arsans" : "font-ensans"} ${selected ? "border-emerald-200/70 bg-emerald-200/15 text-emerald-100" : "border-white/10 bg-white/[0.025] text-[#F7F3EC]/58 hover:border-emerald-200/35 hover:text-[#F7F3EC]/88"}`}
            >
              {options[key][language]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function JudgeDemoRail({ language, onSelect }: { language: Language; onSelect: (text: string, world: WorldId, targetLanguage: Language, personaId: PersonaId) => void }) {
  const isArabic = language === "ar";
  const scenarios = judgeDemoScenarios[language];
  const featuredScenario = scenarios[0];

  return (
    <div className="mt-6 w-full rounded-xl border border-[#C9A86A]/25 bg-[#0E0D10]/45 p-4 shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-start">
          <span className="ui-kicker block">{isArabic ? "وضع الحكام" : "Judge demo mode"}</span>
          <span className="mt-1 block font-arsans text-sm leading-6 text-[#F7F3EC]/58">
            {isArabic ? "لقطات جاهزة تختار الرفيق المناسب وتبدأ العرض بدون شرح زائد." : "Ready shots that switch companion, warp the scene, and start the demo without clutter."}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-emerald-300/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-200">
          60 sec
        </span>
      </div>
      <button
        type="button"
        onClick={() => onSelect(featuredScenario.text, featuredScenario.world, featuredScenario.targetLanguage, featuredScenario.personaId)}
        className="ui-action mt-4 w-full rounded-lg bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]"
      >
        {isArabic ? "ابدأ أفضل لقطة الآن" : "Run strongest demo shot"}
      </button>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.label}
            type="button"
            onClick={() => onSelect(scenario.text, scenario.world, scenario.targetLanguage, scenario.personaId)}
            className="min-h-14 border border-white/10 bg-white/[0.035] px-3 py-2 text-start transition-colors hover:border-[#C9A86A]/50 hover:bg-[#C9A86A]/10"
          >
            <span className={`${isArabic ? "font-arsans" : "font-ensans"} block text-sm text-[#F7F3EC]/88`}>{scenario.label}</span>
            <span className="mt-1 block font-arsans text-xs text-[#C9A86A]/75">{scenario.companion} · {worldLabels[scenario.world][language]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SecretCommandGuide({ language, onSelect }: { language: Language; onSelect: (command: string) => void }) {
  const isArabic = language === "ar";
  const commands = isArabic
    ? [
        { command: "/عرض", label: "عرض الحكام", text: "يشغّل أقوى لقطة مباشرة" },
        { command: "/بطاقة", label: "بطاقة إثبات", text: "يحوّل آخر رد لشيء قابل للمشاركة" },
        { command: "/ملخص", label: "ملخص للحكام", text: "ينسخ عرض ٦٠ ثانية" },
        { command: "/منشور", label: "منشور إطلاق", text: "ينسخ منشور للمتابعين" },
        { command: "/شارة", label: "شارة مؤمن مبكر", text: "يدعو المتابعين بتقدمك الشخصي" },
        { command: "/حكاية", label: "مرآة الحكاية", text: "راوية تحول الشعور إلى مشهد رمزي صغير" },
        { command: "/كبسولة", label: "كبسولة ذكرى", text: "ينزّل آخر لحظة كملف محفوظ" },
        { command: "/تحدي", label: "تحدي ٣ أيام", text: "يبدأ رحلة نمو صغيرة من آخر خيط" },
      ]
    : [
        { command: "/judge", label: "Judge demo", text: "Runs the strongest live shot" },
        { command: "/proof", label: "Proof card", text: "Turns the latest reply into a share artifact" },
        { command: "/pitch", label: "Judge pitch", text: "Copies the 60-second explanation" },
        { command: "/launch", label: "Launch post", text: "Copies a follower-ready post" },
        { command: "/badge", label: "Believer badge", text: "Shares your early supporter badge" },
        { command: "/story", label: "Story mirror", text: "Rawiya turns the feeling into a symbolic scene" },
        { command: "/capsule", label: "Moment capsule", text: "Downloads the latest moment as a saved file" },
        { command: "/quest", label: "3-day quest", text: "Starts a small growth journey from the latest thread" },
      ];

  return (
    <section className="mt-5 w-full rounded-xl border border-cyan-100/20 bg-cyan-100/[0.035] p-4 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-cyan-100/80">{isArabic ? "مفاتيح العرض" : "Demo keys"}</p>
          <h3 className="mt-1 font-arui text-lg font-semibold text-[#F7F3EC]/90">{isArabic ? "أسرار واضحة للحكام بدون زحمة" : "Discoverable secrets without clutter"}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-cyan-100/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-cyan-100">tap</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {commands.map((item) => (
          <button
            key={item.command}
            type="button"
            onClick={() => onSelect(item.command)}
            className="grid grid-cols-[4.5rem_1fr] items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-start transition-colors hover:border-cyan-100/45 hover:bg-cyan-100/10"
          >
            <span className="rounded-lg bg-black/20 px-2 py-1 text-center font-mono text-xs text-cyan-100" dir="ltr">{item.command}</span>
            <span>
              <span className={`${isArabic ? "font-arsans" : "font-ensans"} block text-sm font-semibold text-[#F7F3EC]/88`}>{item.label}</span>
              <span className="mt-1 block font-arsans text-xs leading-5 text-[#F7F3EC]/50">{item.text}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function UserFlowGuide({ language }: { language: Language }) {
  const isArabic = language === "ar";
  const steps = isArabic
    ? [
        { title: "اكتب أو اختر بداية", text: "اكتب ما بداخلك أو اضغط على مثال جاهز." },
        { title: "اختر الرفيق أو العالم", text: "غيّر النبرة من هادئ إلى خطة أو حكاية." },
        { title: "احفظ أو شارك", text: "استمع للرد، احفظ اللحظة، أو حمّل كبسولة." },
      ]
    : [
        { title: "Write or choose a start", text: "Type freely or tap a ready prompt." },
        { title: "Pick persona or world", text: "Shift the tone from calm to plan or story." },
        { title: "Save or share", text: "Listen, save the moment, or download a capsule." },
      ];

  return (
    <div className="mt-5 grid w-full gap-2 sm:grid-cols-3" dir={isArabic ? "rtl" : "ltr"}>
      {steps.map((step, index) => (
        <div key={step.title} className="grid grid-cols-[2rem_1fr] items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-start">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#C9A86A]/15 font-arui text-sm font-semibold text-[#C9A86A]">{index + 1}</span>
          <span>
            <span className="block font-arui text-sm font-semibold text-[#F7F3EC]/88">{step.title}</span>
            <span className="mt-1 block font-arsans text-xs leading-5 text-[#F7F3EC]/55">{step.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function BottomNav({
  language,
  onHome,
  onChat,
  onBreathe,
  onPersona,
  onStories,
  onMenu,
}: {
  language: Language;
  onHome: () => void;
  onChat: () => void;
  onBreathe?: () => void;
  onPersona?: () => void;
  onStories?: () => void;
  onMenu: () => void;
}) {
  const isArabic = language === "ar";
  const itemClass = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-bone/62 transition-colors hover:bg-white/[0.05] hover:text-[#C9A86A]";
  const labelClass = `${isArabic ? "font-arsans" : "font-ensans"} text-[10px] leading-none`;
  const gridColsClass = onPersona && onStories && onBreathe
    ? "grid-cols-6"
    : onPersona && onStories
      ? "grid-cols-5"
      : onPersona && onBreathe
        ? "grid-cols-5"
        : onStories && onBreathe
          ? "grid-cols-5"
          : onPersona || onStories || onBreathe
            ? "grid-cols-4"
            : "grid-cols-3";

  return (
    <nav className="relative z-20 mx-auto mt-4 w-full max-w-[42rem] px-2 pb-2" dir={isArabic ? "rtl" : "ltr"} aria-label={isArabic ? "تنقل التطبيق" : "App navigation"}>
      <div className={`grid ${gridColsClass} gap-1 rounded-2xl border border-white/10 bg-[#0E0D10]/94 p-1 shadow-[0_18px_54px_rgba(0,0,0,0.34)] backdrop-blur-2xl`}>
        <button type="button" onClick={onHome} className={itemClass}>
          <HomeIcon />
          <span className={labelClass}>{isArabic ? "الرئيسية" : "Home"}</span>
        </button>
        <button type="button" onClick={onChat} className={itemClass}>
          <ChatIcon />
          <span className={labelClass}>{isArabic ? "المحادثة" : "Chat"}</span>
        </button>
        {onBreathe ? (
        <button type="button" onClick={onBreathe} className={itemClass}>
          <BreatheIcon />
          <span className={labelClass}>{isArabic ? "تنفس" : "Breathe"}</span>
        </button>
        ) : null}
        {onPersona ? (
        <button type="button" onClick={onPersona} className={itemClass}>
          <PersonaIcon />
          <span className={labelClass}>{isArabic ? "الرفيق" : "Persona"}</span>
        </button>
        ) : null}
        {onStories ? (
        <button type="button" onClick={onStories} className={itemClass}>
          <StoryIcon />
          <span className={labelClass}>{isArabic ? "قصص" : "Stories"}</span>
        </button>
        ) : null}
        <button type="button" onClick={onMenu} className={itemClass}>
          <MenuIcon />
          <span className={labelClass}>{isArabic ? "القائمة" : "Menu"}</span>
        </button>
      </div>
    </nav>
  );
}

function FloatingFeatureLauncher({ language, hasLatestReply, onSpeak, onStudio, onReceipt }: { language: Language; hasLatestReply: boolean; onSpeak: () => void; onStudio: () => void; onReceipt: () => void }) {
  const isArabic = language === "ar";
  const positionClass = isArabic ? "left-3 md:left-4" : "right-3 md:right-4";
  const items = [
    { id: "speak", icon: "graphic_eq", labelAr: "اسمع الرد", labelEn: "Hear reply", onClick: onSpeak, disabled: !hasLatestReply },
    { id: "studio", icon: "add", labelAr: "المزيد", labelEn: "More", onClick: onStudio, disabled: false },
    { id: "receipt", icon: "receipt_long", labelAr: "الخلاصة", labelEn: "Receipt", onClick: onReceipt, disabled: !hasLatestReply, badge: hasLatestReply },
  ];

  return (
    <div className={`fixed bottom-24 z-50 hidden flex-col items-center gap-1.5 md:flex ${positionClass}`} dir={isArabic ? "rtl" : "ltr"} aria-label={isArabic ? "اختصارات الميزات" : "Feature shortcuts"}>
      <div className="grid gap-1.5 rounded-full border border-[#E6C36A]/28 bg-[#0E0D10]/88 p-1.5 shadow-[0_24px_64px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className="group relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#F7F3EC]/72 transition-all hover:-translate-y-0.5 hover:border-[#E6C36A]/55 hover:bg-[#E6C36A]/14 hover:text-[#E6C36A] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            aria-label={isArabic ? item.labelAr : item.labelEn}
            title={isArabic ? item.labelAr : item.labelEn}
          >
            <SymbolIcon name={item.icon} className="h-5 w-5" />
            {item.badge ? <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border border-[#0E0D10] bg-[#E6C36A]" aria-hidden="true" /> : null}
            <span className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full border border-[#E6C36A]/25 bg-[#0E0D10]/94 px-2.5 py-1 font-arsans text-[11px] text-[#E6C36A] shadow-xl group-hover:block ${isArabic ? "left-12" : "right-12"}`}>
              {isArabic ? item.labelAr : item.labelEn}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SymbolIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const common = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (name) {
    case "photo_camera":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M4.75 8.75A2.75 2.75 0 0 1 7.5 6h1.15l1.1-1.5h4.5L15.35 6h1.15a2.75 2.75 0 0 1 2.75 2.75v7.5A2.75 2.75 0 0 1 16.5 19h-9a2.75 2.75 0 0 1-2.75-2.75v-7.5Z" /><path {...common} d="M9 12.5a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" /><path {...common} d="M17.25 9.25h.01" /></svg>;
    case "photo_library":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M7 7.25V5.5A2.25 2.25 0 0 1 9.25 3.25h9A2.25 2.25 0 0 1 20.5 5.5v9a2.25 2.25 0 0 1-2.25 2.25H16.5" /><path {...common} d="M3.5 9.5A2.25 2.25 0 0 1 5.75 7.25h8.5A2.25 2.25 0 0 1 16.5 9.5v7.75a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V9.5Z" /><path {...common} d="m5.75 16.5 2.2-2.4 1.55 1.55 2.35-2.9 2.4 3.75" /><path {...common} d="M8 11.25h.01" /></svg>;
    case "mic":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M9 6.75a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0v-5Z" /><path {...common} d="M5.75 11.25a6.25 6.25 0 0 0 12.5 0" /><path {...common} d="M12 17.5v3" /><path {...common} d="M9 20.5h6" /></svg>;
    case "graphic_eq":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M4.5 12v1.5M8.25 8.5v7M12 5.75v12.5M15.75 8.5v7M19.5 12v1.5" /></svg>;
    case "add":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M12 5.5v13M5.5 12h13" /></svg>;
    case "receipt_long":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M6.5 4.5h11v15l-2-1.25-2 1.25-2-1.25-2 1.25-2-1.25-2 1.25v-15Z" /><path {...common} d="M9 8h6M9 11.25h6M9 14.5h3.5" /></svg>;
    case "movie":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 17 20H7a2.5 2.5 0 0 1-2.5-2.5v-11Z" /><path {...common} d="M8 4v16M16 4v16M4.5 9h15M4.5 15h15" /></svg>;
    case "monitor_heart":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v7.5A2.75 2.75 0 0 1 17.25 17H6.75A2.75 2.75 0 0 1 4 14.25v-7.5Z" /><path {...common} d="M9 20h6M12 17v3" /><path {...common} d="M8 10.5h2l1-2.25 2 4.5 1.2-2.25H16" /></svg>;
    case "route":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M6.25 6.25h.01M17.75 17.75h.01" /><path {...common} d="M8 6.25h4.5a3 3 0 0 1 0 6h-1a3 3 0 0 0 0 6H16" /><path {...common} d="M4.75 6.25a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0ZM16.25 17.75a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" /></svg>;
    case "history":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M5.5 8.5A7.5 7.5 0 1 1 4.75 15" /><path {...common} d="M5.5 5.5v3h3" /><path {...common} d="M12 8.5V12l2.5 1.5" /></svg>;
    case "auto_awesome":
    case "sparkles":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M12 3.75 13.55 8.5 18.25 10 13.55 11.5 12 16.25 10.45 11.5 5.75 10l4.7-1.5L12 3.75Z" /><path {...common} d="M18.5 14.5 19.15 16.35 21 17l-1.85.65-.65 1.85-.65-1.85L16 17l1.85-.65.65-1.85Z" /></svg>;
    case "favorite":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M12 19.25s-6.75-4.2-8.15-8.1C2.85 8.35 4.55 6 7.25 6c1.55 0 2.75.85 3.45 1.95C11.4 6.85 12.6 6 14.15 6c2.7 0 4.4 2.35 3.4 5.15-1.4 3.9-5.55 8.1-5.55 8.1Z" /></svg>;
    case "diversity_1":
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M8.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM15.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path {...common} d="M4.5 19v-1.25A4.75 4.75 0 0 1 9.25 13h5.5a4.75 4.75 0 0 1 4.75 4.75V19" /></svg>;
    default:
      return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path {...common} d="M12 5v14M5 12h14" /></svg>;
  }
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.75 11.25 12 5l7.25 6.25v7A1.75 1.75 0 0 1 17.5 20h-11a1.75 1.75 0 0 1-1.75-1.75v-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 20v-5.25h5V20" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 17.5h-.75A2.75 2.75 0 0 1 3 14.75v-6A2.75 2.75 0 0 1 5.75 6h12.5A2.75 2.75 0 0 1 21 8.75v6a2.75 2.75 0 0 1-2.75 2.75H11l-4.5 3v-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.5 10h9M7.5 13h5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.25 5.5A2.25 2.25 0 0 1 7.5 3.25H19v14.5H7.5a2.25 2.25 0 0 0-2.25 2.25V5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M5.25 20A2.25 2.25 0 0 1 7.5 17.75H19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 7.5h6M9 10.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function EndIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.75v11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m6.75 11.75 5.25 5.25 5.25-5.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 20h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BreatheIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5.5c-2.6 0-4.75 2.15-4.75 4.75S9.4 15 12 15s4.75-2.15 4.75-4.75S14.6 5.5 12 5.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 18c1.1-1.8 3.2-3 6.5-3s5.4 1.2 6.5 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 3v2.5M12 18.5V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PersonaIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.75 20.25a6.25 6.25 0 0 1 12.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ProductPositioning({ language, open, onToggle }: { language: Language; open: boolean; onToggle: () => void }) {
  const isArabic = language === "ar";
  const points = isArabic
    ? [
        {
          title: "لماذا فضفضة؟",
          text: "ليست صندوق سؤال عام؛ هي مساحة جاهزة للفضفضة: رفقاء، عوالم، حفظ لحظات، صوت، وخطوة صغيرة واضحة. فيه رفقاء يسمعوك بس، من غير ما يحاولوا يحلّوا أي شيء — وفيه رفقاء يساعدوك تحوّل اللحظة لخطوة فعلية. اختار حسب اللي محتاجه دلوقتي.",
        },
        {
          title: "لماذا كتطبيق ويب؟",
          text: "تفتح فورًا من أي رابط، تثبت على الجهاز كتطبيق، وتصل للحكام والمستخدمين بدون متجر أو انتظار مراجعة.",
        },
        {
          title: "حالة الدفع",
          text: "الترقية تفتح متابعة أطول، رفيقاً مخصصاً، وحفظاً أوسع للحظات. إذا لم تكن بوابة الدفع مهيأة، تبقى التجربة المجانية متاحة.",
        },
      ]
    : [
        {
          title: "Why FadFada?",
          text: "It is not a replacement for Gemini or ChatGPT; it is a ready emotional workspace with companions who simply listen and companions who help turn the moment into one practical next step.",
        },
        {
          title: "Why Web/PWA?",
          text: "It opens instantly from a link, installs like an app, and reaches judges and users without app-store review friction.",
        },
        {
          title: "Payment status",
          text: "Upgrade unlocks longer progress, custom companions, and expanded saved moments. If checkout is not configured, the free experience remains available.",
        },
      ];

  return (
    <div className="mt-5 w-full rounded-xl border border-[#C9A86A]/25 bg-[#0E0D10]/52 p-4 text-right shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-start">
        <span>
          <span className="ui-kicker block">{isArabic ? "ما هي فضفضة؟" : "What is FadFada?"}</span>
          <span className="mt-1 block font-arsans text-sm leading-6 text-[#F7F3EC]/72">
            {isArabic ? "مساحة عربية/إنجليزية للفضفضة، وليست مجرد شات عام." : "An Arabic/English venting workspace, not just another general chatbot."}
          </span>
        </span>
        <span className="shrink-0 rounded-lg border border-[#F7F3EC]/10 bg-white/[0.035] px-3 py-2 font-arui text-xs font-medium text-[#C9A86A]">
          {open ? (isArabic ? "إخفاء" : "Hide") : isArabic ? "اعرف أكثر" : "Learn more"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
          {points.map((point) => (
            <div key={point.title} className="border border-white/10 bg-white/[0.025] p-3">
              <p className="font-arsans text-sm font-medium text-[#F7F3EC]/88">{point.title}</p>
              <p className="mt-1 font-arsans text-sm leading-6 text-[#F7F3EC]/58">{point.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FeatureStrip({ language }: { language: Language }) {
  const isArabic = language === "ar";
  const features = isArabic
    ? ["رفيق عاطفي", "عوالم للرد", "حفظ اللحظات", "تطبيق قابل للتثبيت", "ترقية اختيارية"]
    : ["Emotional companion", "Response worlds", "Saved moments", "Installable PWA", "Optional upgrade"];

  return (
    <div className="mt-4 flex w-full gap-2 overflow-x-auto px-1 [scrollbar-width:none]" dir={isArabic ? "rtl" : "ltr"}>
      {features.map((feature) => (
        <span key={feature} className="shrink-0 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 font-arui text-xs font-medium text-[#F7F3EC]/72">
          {feature}
        </span>
      ))}
    </div>
  );
}

function VisitorCommentBox({ language, value, status, onChange, onSubmit }: { language: Language; value: string; status: "idle" | "saving" | "saved" | "error"; onChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const isArabic = language === "ar";

  return (
    <form onSubmit={onSubmit} className="mt-5 w-full border border-[#F7F3EC]/10 bg-[#F7F3EC]/[0.025] p-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-[#C9A86A]/80">{isArabic ? "رأي الزوار" : "Visitor comments"}</p>
          <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/58">
            {isArabic ? "اكتب ملاحظة قصيرة عن التجربة. ستظهر للمدير فقط في لوحة الإدارة." : "Leave a short note about the experience. Admins see it privately in the dashboard."}
          </p>
        </div>
        {status === "saved" ? <span className="shrink-0 font-arsans text-xs text-emerald-300">{isArabic ? "تم" : "Saved"}</span> : null}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        maxLength={500}
        dir="auto"
        placeholder={isArabic ? "مثلاً: الصوت جيد لكن أريد قصصاً أكثر..." : "Example: voice is good, but I want stronger stories..."}
        className="mt-4 w-full resize-none border border-white/10 bg-black/20 px-3 py-3 font-arsans text-sm leading-6 text-[#F7F3EC]/85 outline-none transition-colors placeholder:text-[#F7F3EC]/25 focus:border-[#C9A86A]/50"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-arsans text-xs text-[#F7F3EC]/35">
          {status === "error" ? (isArabic ? "لم يتم الإرسال. جرّب مرة أخرى." : "Could not send. Try again.") : `${value.length}/500`}
        </p>
        <button type="submit" disabled={status === "saving" || value.trim().length < 2} className="ui-action rounded-full border border-[#C9A86A]/35 px-4 py-2 text-[#C9A86A] transition-colors hover:bg-[#C9A86A] hover:text-[#0E0D10] disabled:opacity-45">
          {status === "saving" ? (isArabic ? "جار الإرسال" : "Sending") : isArabic ? "إرسال ملاحظة" : "Send note"}
        </button>
      </div>
    </form>
  );
}

function BehaviorLab({
  language,
  activeStyle,
  softerNext,
  onSelect,
}: {
  language: Language;
  activeStyle: BehaviorStyle;
  softerNext: boolean;
  onSelect: (style: BehaviorStyle) => void;
}) {
  const isArabic = language === "ar";

  return (
    <div className="mt-5 w-full border border-[#F7F3EC]/10 bg-[#F7F3EC]/[0.025] p-3 text-right" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">{isArabic ? "مختبر أسلوب الرد" : "AI Behavior Lab"}</p>
          <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-sm leading-6 text-[#F7F3EC]/60`}>
            {isArabic ? behaviorStyles[activeStyle].hintAr : behaviorStyles[activeStyle].hintEn}
          </p>
        </div>
        {softerNext ? (
          <span className="shrink-0 border border-[#C9A86A]/30 px-2 py-1 font-arsans text-xs text-[#C9A86A]">
            {isArabic ? "الرد القادم أهدى" : "Next softer"}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {(Object.keys(behaviorStyles) as BehaviorStyle[]).map((style) => {
          const active = style === activeStyle;
          return (
            <button
              key={style}
              type="button"
              onClick={() => onSelect(style)}
              className={`min-h-10 border px-2 py-1 font-arsans text-sm transition-colors ${active ? "border-[#C9A86A]/55 bg-[#C9A86A]/12 text-[#C9A86A]" : "border-[#F7F3EC]/10 text-[#F7F3EC]/58 hover:border-[#C9A86A]/35 hover:text-[#F7F3EC]/85"}`}
            >
              {isArabic ? behaviorStyles[style].ar : behaviorStyles[style].en}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LearningResourceCards({ language, resources }: { language: Language; resources?: LearningResource[] }) {
  if (!resources?.length) return null;

  const isArabic = language === "ar";
  const videoResource = resources.find((resource) => resource.type === "video");
  const otherResources = resources.filter((resource) => resource !== videoResource).slice(0, 2);
  const videoIsInChat = Boolean(videoResource?.url.startsWith("#"));

  return (
    <section className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.035] p-3 text-start" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-emerald-200/80">{isArabic ? "موارد داخل المحادثة" : "In-chat resources"}</p>
          <p className="mt-1 font-arsans text-sm leading-6 text-[#F7F3EC]/62">
            {isArabic ? "ابدأ بفيديو واحد، ثم خذ ملاحظات قصيرة." : "Start with one video, then capture short notes."}
          </p>
        </div>
        {videoResource ? (
          <span className="shrink-0 rounded-lg border border-emerald-200/30 px-3 py-2 font-arsans text-xs text-emerald-200">
            {videoIsInChat ? (isArabic ? "داخل المحادثة" : "In chat") : isArabic ? "مصدر" : "Resource"}
          </span>
        ) : null}
      </div>

      {videoResource ? (
        <div className="mt-3 block rounded-xl border border-emerald-200/20 bg-black/24 p-3">
          <span className="block font-arsans text-sm font-semibold text-[#F7F3EC]/88">{videoResource.title}</span>
          <span className="mt-1 block font-arsans text-xs leading-5 text-[#F7F3EC]/52">
            {isArabic ? "يبقى داخل المحادثة: اطلب إنشاء فيديو أو صورة وسنولّدها هنا بدلاً من فتح يوتيوب." : videoResource.summary}
          </span>
          <span className="mt-3 inline-flex rounded-full border border-emerald-200/30 px-3 py-1.5 font-arsans text-[11px] text-emerald-200">
            {isArabic ? "لا خروج من التطبيق" : "No external player"}
          </span>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {otherResources.map((resource) => (
          <div key={`${resource.type}:${resource.url}`} className="block rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <span className="block font-arsans text-sm text-[#F7F3EC]/82">{isArabic ? resourceTypeLabel(resource.type, language) : resource.title}</span>
            <span className="mt-1 block font-arsans text-xs leading-5 text-[#F7F3EC]/48">
              {isArabic ? (resource.type === "document" ? "ملاحظات مختصرة تساعدك تراجع الفكرة." : "مصدر إضافي للمراجعة.") : resource.summary}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function GeneratedMediaCard({ language, asset }: { language: Language; asset: GeneratedMediaAsset }) {
  const isArabic = language === "ar";
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [frames, setFrames] = useState<Array<{ imageDataUrl: string; source?: string; model?: string }>>([]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [videoState, setVideoState] = useState<{ status: "idle" | "encoding" | "ready" | "error"; url?: string; mimeType?: string; extension?: string }>({ status: "idle" });
  const prompts = useMemo(() => asset.kind === "video" ? buildGeneratedVideoFramePrompts(asset, language) : [asset.prompt], [asset, language]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setFrames([]);

    Promise.all(prompts.map(async (prompt, index) => {
      const response = await fetch(`/api/storyboard/image?chatMedia=${encodeURIComponent(asset.id)}-${index}`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ prompt, title: asset.title, sceneNumber: index + 1, variation: index, language }),
      });
      if (!response.ok) throw new Error("media image failed");
      const data = (await response.json()) as { imageDataUrl?: string; source?: string; model?: string };
      if (!data.imageDataUrl) throw new Error("media image missing");
      return { imageDataUrl: data.imageDataUrl, source: data.source, model: data.model };
    }))
      .then((nextFrames) => {
        if (cancelled) return;
        setFrames(nextFrames);
        setStatus("ready");
        archiveGeneratedMedia(asset, asset.kind === "video" ? { frames: nextFrames.map((frame) => frame.imageDataUrl), source: nextFrames[0]?.source, model: nextFrames[0]?.model } : { imageDataUrl: nextFrames[0]?.imageDataUrl, source: nextFrames[0]?.source, model: nextFrames[0]?.model });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [asset, language, prompts]);

  useEffect(() => {
    if (asset.kind !== "video" || status !== "ready" || frames.length === 0) {
      setVideoState({ status: "idle" });
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;
    setVideoState({ status: "encoding" });

    encodeFramesAsVideo(frames.map((frame) => frame.imageDataUrl))
      .then((video) => {
        if (cancelled) {
          URL.revokeObjectURL(video.url);
          return;
        }
        objectUrl = video.url;
        setVideoState({ status: "ready", url: video.url, mimeType: video.mimeType, extension: video.extension });
      })
      .catch(() => {
        if (!cancelled) setVideoState({ status: "error" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.kind, frames, status]);

  useEffect(() => {
    if (asset.kind !== "video" || status !== "ready" || frames.length <= 1 || videoState.status === "ready") return;

    const timer = window.setInterval(() => {
      setActiveFrame((current) => (current + 1) % frames.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [asset.kind, frames.length, status, videoState.status]);

  const activeImage = frames[activeFrame]?.imageDataUrl || frames[0]?.imageDataUrl;
  const sourceLabel = videoState.status === "ready" ? `gemini_${videoState.extension || "video"}_video` : videoState.status === "error" ? "gemini_animated_storyboard_fallback" : frames[0]?.source || (asset.kind === "video" ? "gemini_video_encoding" : "gemini_image");

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-100/20 bg-emerald-100/[0.045] text-start" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-3">
        <div>
          <p className="ui-kicker text-emerald-100/85">{asset.kind === "video" ? (isArabic ? "فيديو داخل المحادثة" : "In-chat video") : isArabic ? "صورة داخل المحادثة" : "In-chat image"}</p>
          <h4 className="mt-1 font-arui text-lg font-semibold leading-7 text-[#F7F3EC]/92">{asset.title}</h4>
          <p className="mt-1 font-arsans text-xs leading-5 text-[#F7F3EC]/50">
            {asset.kind === "video"
              ? isArabic ? "ننشئ ملف فيديو حقيقي داخل المحادثة من لقطات Gemini، مع تشغيل وتحميل بدون فتح يوتيوب." : "A real video file is generated in chat from Gemini frames, with playback and download without opening YouTube."
              : isArabic ? "الصورة تُنشأ هنا وتُحفظ في أرشيف فضفضة المحلي." : "The image is generated here and saved to the local FadFada archive."}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-100/25 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/70" dir="ltr">
          {asset.kind === "video" ? (videoState.extension || "VIDEO").toUpperCase() : "IMAGE"}
        </span>
      </div>

      <div className="relative aspect-video bg-[radial-gradient(circle_at_20%_18%,rgba(110,231,183,0.18),transparent_30%),linear-gradient(135deg,rgba(7,18,16,0.95),rgba(16,21,30,0.95))]">
        {asset.kind === "video" && videoState.status === "ready" && videoState.url ? (
          <video src={videoState.url} controls playsInline loop className="h-full w-full object-cover" aria-label={asset.title} />
        ) : asset.kind === "video" && status === "ready" && activeImage ? (
          <div className="relative h-full w-full">
            <img src={activeImage} alt={asset.title} className="h-full w-full object-cover opacity-65" />
            <div className="absolute inset-0 grid place-items-center bg-black/42 p-5 text-center">
              <p className="rounded-2xl border border-emerald-100/20 bg-black/58 px-4 py-3 font-arsans text-sm leading-6 text-emerald-100/82">
                {videoState.status === "error"
                  ? isArabic ? "جهزنا اللقطات كلوحة متحركة لأن هذا المتصفح لا يدعم إخراج ملف فيديو هنا. يمكنك عرضها ونسخ البرومبت الآن." : "Your visual reel is ready as an animated storyboard because this browser cannot export a video file here. You can view it and copy the prompt now."
                  : isArabic ? "جاري تحويل لقطات Gemini إلى ملف فيديو قابل للتشغيل والتحميل..." : "Encoding Gemini frames into a playable, downloadable video file..."}
              </p>
            </div>
          </div>
        ) : status === "ready" && activeImage ? (
          <img src={activeImage} alt={asset.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-5 text-center">
            <p className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 font-arsans text-sm leading-6 text-emerald-100/76">
              {status === "error" ? (isArabic ? "تعذر إنشاء الوسيط الآن. البرومبت محفوظ داخل المحادثة." : "Could not generate this media now. The prompt is saved in chat.") : isArabic ? "Gemini ينشئ الوسيط الآن داخل المحادثة..." : "Gemini is generating this media inside the chat..."}
            </p>
          </div>
        )}
        {asset.kind === "video" && status === "ready" ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 to-transparent p-3">
            {videoState.status === "encoding" || videoState.status === "error" ? (
              <p className="mb-2 rounded-full border border-emerald-100/20 bg-black/45 px-3 py-1.5 font-arsans text-[11px] text-emerald-100/75">
                {videoState.status === "error" ? (isArabic ? "عرض بديل جاهز: لقطات Gemini متحركة" : "Fallback ready: animated Gemini frames") : isArabic ? "جاري إنشاء ملف فيديو حقيقي..." : "Creating a real video file..."}
              </p>
            ) : null}
            <div className="flex gap-1.5" dir="ltr">
              {frames.map((frame, index) => (
                <button key={`${frame.imageDataUrl}:${index}`} type="button" onClick={() => setActiveFrame(index)} className={`h-1.5 flex-1 rounded-full transition-colors ${index === activeFrame ? "bg-emerald-100" : "bg-white/25"}`} aria-label={isArabic ? `لقطة ${index + 1}` : `Frame ${index + 1}`} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-100/55" dir="ltr">{sourceLabel}</p>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {asset.kind === "video" && videoState.status === "ready" && videoState.url ? (
            <a href={videoState.url} download={`fadfada-video-${asset.createdAt.slice(0, 10)}.${videoState.extension || "webm"}`} className="ui-action rounded-lg border border-emerald-100/30 px-3 py-2 text-xs text-emerald-100 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]">
              {isArabic ? "تحميل الفيديو" : "Download video"}
            </a>
          ) : null}
          {asset.kind === "video" && videoState.status === "error" && activeImage ? (
            <a href={activeImage} download={`fadfada-video-frame-${asset.createdAt.slice(0, 10)}.png`} className="ui-action rounded-lg border border-emerald-100/30 px-3 py-2 text-xs text-emerald-100 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]">
              {isArabic ? "تحميل لقطة" : "Download frame"}
            </a>
          ) : null}
          <button type="button" onClick={() => void copyTextToClipboard(asset.prompt)} className="ui-action rounded-lg border border-emerald-100/30 px-3 py-2 text-xs text-emerald-100 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]">
            {isArabic ? "انسخ البرومبت" : "Copy prompt"}
          </button>
        </div>
      </div>
    </section>
  );
}

async function encodeFramesAsVideo(frameUrls: string[]) {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || frameUrls.length === 0) {
    throw new Error("MediaRecorder is unavailable");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context is unavailable");

  const images = await Promise.all(frameUrls.map(loadFrameImage));
  drawVideoFrame(context, images[0], canvas.width, canvas.height, 0, 0);
  const videoFormat = getSupportedRecordingFormat();
  if (!videoFormat) throw new Error("No supported video recording format");
  if (typeof canvas.captureStream !== "function") throw new Error("Canvas video capture is unavailable");
  const stream = canvas.captureStream(30);
  const recorder = videoFormat.mimeType
    ? new MediaRecorder(stream, { mimeType: videoFormat.mimeType })
    : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video recorder failed"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: videoFormat.mimeType }));
  });

  recorder.start(250);
  for (let index = 0; index < images.length; index += 1) {
    for (let step = 0; step < 18; step += 1) {
      drawVideoFrame(context, images[index], canvas.width, canvas.height, index, step / 17);
      await wait(66);
    }
  }
  drawVideoFrame(context, images[images.length - 1], canvas.width, canvas.height, images.length - 1, 1);
  await wait(240);
  if (recorder.state === "recording") recorder.requestData();
  recorder.stop();
  const blob = await stopped;
  stream.getTracks().forEach((track) => track.stop());
  if (chunks.length === 0 || blob.size === 0) throw new Error("Video recorder produced an empty file");

  const mimeType = blob.type || recorder.mimeType || videoFormat.mimeType || "video/webm";
  return {
    url: URL.createObjectURL(new Blob([blob], { type: mimeType })),
    mimeType,
    extension: videoFormat.extension,
  };
}

function getSupportedRecordingFormat() {
  const formats = [
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
    { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
  ];

  return formats.find((format) => MediaRecorder.isTypeSupported(format.mimeType)) || { mimeType: "", extension: "webm" };
}

function loadFrameImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Frame image failed to load"));
    image.src = src;
  });
}

function drawVideoFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number, index: number, progress: number) {
  context.fillStyle = "#071210";
  context.fillRect(0, 0, width, height);
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  const zoom = 1.04 + progress * 0.035;
  const drawHeight = imageRatio > canvasRatio ? height * zoom : (width / imageRatio) * zoom;
  const drawWidth = imageRatio > canvasRatio ? (height * imageRatio) * zoom : width * zoom;
  const panX = Math.sin((index + 1) * 0.8) * 26 * progress;
  const panY = Math.cos((index + 1) * 0.7) * 18 * progress;
  context.drawImage(image, (width - drawWidth) / 2 + panX, (height - drawHeight) / 2 + panY, drawWidth, drawHeight);
  context.fillStyle = `rgba(4, 8, 8, ${0.12 + progress * 0.1})`;
  context.fillRect(0, 0, width, height);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildGeneratedVideoFramePrompts(asset: GeneratedMediaAsset, language: Language) {
  const isArabic = language === "ar";
  const base = asset.prompt;
  return [
    isArabic ? `${base}\n\nاللقطة 1: افتتاحية واسعة تحدد المكان والمزاج، بدون نص داخل الصورة.` : `${base}\n\nFrame 1: wide opening shot establishing place and mood, no text inside the image.`,
    isArabic ? `${base}\n\nاللقطة 2: لقطة متوسطة فيها حركة أو تحول واضح، بدون نص داخل الصورة.` : `${base}\n\nFrame 2: medium shot with clear motion or transformation, no text inside the image.`,
    isArabic ? `${base}\n\nاللقطة 3: نهاية بصرية واضحة تصلح كآخر إطار لفيديو قصير، بدون نص داخل الصورة.` : `${base}\n\nFrame 3: clear closing visual suitable as the final frame of a short reel, no text inside the image.`,
  ];
}

function resourceTypeLabel(type: LearningResource["type"], language: Language) {
  if (type === "video") return language === "ar" ? "فيديو" : "Video";
  if (type === "document") return language === "ar" ? "ملاحظات" : "Notes";
  return language === "ar" ? "مقال" : "Article";
}

function MomentActions({
  language,
  saved,
  feedbackSent,
  speaking,
  pendingAction,
  onSpeak,
  onSave,
  onPlan,
  onShare,
  onProof,
  onDownload,
  onPersona,
  onHelpful,
  onSofter,
}: {
  language: Language;
  saved: boolean;
  feedbackSent: boolean;
  speaking: boolean;
  pendingAction: MomentActionKey | null;
  onSpeak: () => void;
  onSave: () => void;
  onPlan: () => void;
  onShare: () => void;
  onProof: () => void;
  onDownload: () => void;
  onPersona?: () => void;
  onHelpful: () => void;
  onSofter: () => void;
}) {
  const isArabic = language === "ar";
  const [open, setOpen] = useState(false);
  const loadingLabel = isArabic ? "جار التنفيذ" : "Working";
  const actionClass = "flex w-full items-center gap-3 rounded-xl border border-[#F7F3EC]/10 bg-white/[0.025] px-3 py-2.5 text-start font-arsans text-xs text-[#F7F3EC]/72 transition-colors hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10 hover:text-[#C9A86A] disabled:animate-pulse disabled:opacity-65";
  const toolbarButtonClass = "ui-action grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-[#F7F3EC]/62 shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/12 hover:text-[#C9A86A] disabled:animate-pulse disabled:opacity-60";

  function runFromMenu(action: () => void) {
    setOpen(false);
    action();
  }

  const menu = open && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/35 px-4 pb-[max(6.5rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:pb-4" dir={isArabic ? "rtl" : "ltr"} role="dialog" aria-modal="true" aria-label={isArabic ? "إجراءات اللحظة" : "Moment actions"}>
      <button type="button" className="absolute inset-0" onClick={() => setOpen(false)} aria-label={isArabic ? "إغلاق إجراءات اللحظة" : "Close moment actions"} />
      <div className="relative grid w-full max-w-xs gap-1 rounded-[1.35rem] border border-[#C9A86A]/30 bg-[#0E0D10]/96 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl">
        <div className="mb-1 flex items-center justify-between gap-3 px-1">
          <p className="font-arui text-sm font-semibold text-[#F7F3EC]/88">{isArabic ? "إجراءات اللحظة" : "Moment actions"}</p>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-2 py-1 font-arsans text-[11px] text-[#F7F3EC]/55 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <button type="button" onClick={() => runFromMenu(onSave)} disabled={pendingAction === "save"} className={actionClass}><ActionGlyph name="save" /> <span>{pendingAction === "save" ? loadingLabel : saved ? (isArabic ? "تم الحفظ" : "Saved") : isArabic ? "احفظ اللحظة" : "Save moment"}</span></button>
        <button type="button" onClick={() => runFromMenu(onPlan)} disabled={pendingAction === "plan"} className={actionClass}><ActionGlyph name="plan" /> <span>{pendingAction === "plan" ? loadingLabel : isArabic ? "خطة صغيرة" : "Tiny plan"}</span></button>
        <button type="button" onClick={() => runFromMenu(onShare)} disabled={pendingAction === "share"} className={actionClass}><ActionGlyph name="share" /> <span>{pendingAction === "share" ? loadingLabel : isArabic ? "شارك الرد" : "Share reply"}</span></button>
        <button type="button" onClick={() => runFromMenu(onProof)} disabled={pendingAction === "proof"} className={actionClass}><ActionGlyph name="proof" /> <span>{pendingAction === "proof" ? loadingLabel : isArabic ? "بطاقة إثبات" : "Proof card"}</span></button>
        <button type="button" onClick={() => runFromMenu(onDownload)} disabled={pendingAction === "download"} className={actionClass}><ActionGlyph name="download" /> <span>{pendingAction === "download" ? loadingLabel : isArabic ? "حمّل كبسولة" : "Download capsule"}</span></button>
        <div className="my-1 h-px bg-white/10" />
        <button type="button" onClick={() => runFromMenu(onHelpful)} disabled={pendingAction === "helpful"} className={actionClass}><ActionGlyph name="helpful" /> <span>{pendingAction === "helpful" ? loadingLabel : feedbackSent ? (isArabic ? "وصلنا رأيك" : "Noted") : isArabic ? "مفيد" : "Helpful"}</span></button>
        <button type="button" onClick={() => runFromMenu(onSofter)} disabled={pendingAction === "softer"} className={actionClass}><ActionGlyph name="softer" /> <span>{pendingAction === "softer" ? loadingLabel : isArabic ? "أهدى" : "Softer"}</span></button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="mt-3 flex justify-end" dir={isArabic ? "rtl" : "ltr"}>
      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0E0D10]/62 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur">
      <button type="button" onClick={onSpeak} disabled={pendingAction === "speak"} className={`${toolbarButtonClass} ${speaking ? "border-red-200/35 bg-red-200/12 text-red-100" : ""}`} aria-label={pendingAction === "speak" ? loadingLabel : speaking ? (isArabic ? "إيقاف الصوت" : "Stop voice") : isArabic ? "استمع للرد" : "Listen to reply"} aria-pressed={speaking} title={speaking ? (isArabic ? "إيقاف الصوت" : "Stop voice") : isArabic ? "استمع للرد" : "Listen to reply"}>
        <ActionGlyph name={speaking ? "stop" : "listen"} />
      </button>
      <button type="button" onClick={onSave} disabled={pendingAction === "save"} className={`${toolbarButtonClass} ${saved ? "border-emerald-200/35 bg-emerald-200/12 text-emerald-100" : ""}`} aria-label={pendingAction === "save" ? loadingLabel : saved ? (isArabic ? "محفوظ" : "Saved") : isArabic ? "احفظ" : "Save"} title={saved ? (isArabic ? "محفوظ" : "Saved") : isArabic ? "احفظ" : "Save"}>
        <ActionGlyph name="save" />
      </button>
      <button type="button" onClick={onPlan} disabled={pendingAction === "plan"} className={toolbarButtonClass} aria-label={pendingAction === "plan" ? loadingLabel : isArabic ? "خطة" : "Plan"} title={isArabic ? "خطة" : "Plan"}>
        <ActionGlyph name="plan" />
      </button>
      {onPersona ? (
      <button type="button" onClick={onPersona} className={toolbarButtonClass} aria-label={isArabic ? "جرّب رفيق" : "Try companion"} title={isArabic ? "جرّب رفيق" : "Try companion"}>
        <ActionGlyph name="persona" />
      </button>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="ui-action grid h-9 w-9 place-items-center rounded-full border border-[#C9A86A]/35 bg-[#C9A86A]/10 text-[#C9A86A] shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#C9A86A] hover:text-[#0E0D10] hover:shadow-[0_18px_48px_rgba(201,168,106,0.22)]"
        aria-expanded={open}
        aria-label={isArabic ? "إجراءات" : "Actions"}
        title={isArabic ? "إجراءات" : "Actions"}
      >
        <ActionGlyph name="more" />
      </button>
      {menu}
      </div>
    </div>
  );
}

function VoicePlaybackButton({ language, speaking, loading, onClick }: { language: Language; speaking: boolean; loading: boolean; onClick: () => void }) {
  const isArabic = language === "ar";
  const label = loading ? (isArabic ? "جار التجهيز" : "Preparing") : speaking ? (isArabic ? "إيقاف الصوت" : "Stop voice") : isArabic ? "استمع للرد" : "Listen to reply";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`ui-action mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs shadow-[0_14px_36px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 disabled:animate-pulse disabled:opacity-70 ${speaking ? "border-red-200/35 bg-red-200/12 text-red-100 hover:bg-red-200 hover:text-[#0E0D10]" : "border-[#C9A86A]/45 bg-[#C9A86A]/12 text-[#C9A86A] hover:bg-[#C9A86A] hover:text-[#0E0D10]"}`}
      aria-pressed={speaking}
      aria-label={label}
    >
      <span className={speaking ? "relative grid h-7 w-7 place-items-center rounded-full bg-red-200/14" : "relative grid h-7 w-7 place-items-center rounded-full bg-[#C9A86A]/16"}>
        {speaking ? <span className="absolute inset-0 rounded-full border border-red-100/50 animate-ping" aria-hidden="true" /> : null}
        <ActionGlyph name={speaking ? "stop" : "listen"} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function ActionGlyph({ name }: { name: "save" | "plan" | "share" | "proof" | "download" | "helpful" | "softer" | "persona" | "more" | "listen" | "stop" }) {
  const common = "h-4 w-4 shrink-0";

  if (name === "save") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4.75h9.2l2.8 2.8v11.7H6V4.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8.75 4.75v5h6.5v-5M8.75 19.25v-5h6.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "plan") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5.75h10M7 12h10M7 18.25h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="m15.25 16.75 1.55 1.55 3.1-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "share") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.25 12.5 15.75 8M8.25 12.5l7.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M6.5 15.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM17.5 9.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM17.5 19.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "proof") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.75 19 7v5.2c0 4.05-2.85 7.1-7 8.05-4.15-.95-7-4-7-8.05V7l7-3.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m8.8 12.1 2.1 2.1 4.45-4.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "download") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4.5v9M8.25 10.25 12 14l3.75-3.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.5 18.75h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "helpful") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 20.25h8.65a2 2 0 0 0 1.96-1.6l1.1-5.4a2 2 0 0 0-1.96-2.4H14.5l.55-3.2A2.45 2.45 0 0 0 12.65 4.75L8.5 10.6h-1v9.65Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M4.25 10.6h3.25v9.65H4.25V10.6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "softer") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20.25c3.9-2.65 6.5-5.6 6.5-9.2A5.25 5.25 0 0 0 8.95 8.05 5.25 5.25 0 0 0 5.5 17.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 16.5c1.7-1.7 4.3-1.7 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "persona") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" stroke="currentColor" strokeWidth="1.8" /><path d="M5.75 20.25a6.25 6.25 0 0 1 12.5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "more") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6.75v10.5M6.75 12h10.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  if (name === "stop") return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 8h8v8H8V8Z" fill="currentColor" /></svg>;
  return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 9.5v5M11 7v10M15 9.5v5M19 11v2M5 11v2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>;
}

function ReflectionReceiptCard({
  language,
  message,
  userMessage,
  personaName,
  onSaveSnapshot,
  onSafeShare,
  onProofShare,
  onStartQuest,
}: {
  language: Language;
  message: ChatMessage;
  userMessage: ChatMessage | undefined;
  personaName: string;
  onSaveSnapshot: () => void;
  onSafeShare: () => void;
  onProofShare: () => void;
  onStartQuest: () => void;
}) {
  const isArabic = language === "ar";
  const receipt = buildReflectionReceipt(message, userMessage, language);
  const storyboard = useMemo(() => buildStoryMirrorBoard(message, userMessage, personaName, language), [language, message, personaName, userMessage]);
  const [storyboardOpen, setStoryboardOpen] = useState(false);

  return (
    <section className="animate-rise-in rounded-2xl border border-[#C9A86A]/25 bg-[#C9A86A]/[0.055] p-4 text-start shadow-2xl backdrop-blur" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "خلاصة الفضفضة" : "Reflection summary"}</p>
          <h3 className="mt-1 font-arui text-xl font-semibold text-[#F7F3EC]/92">{isArabic ? "ما الذي فهمناه؟ وما الخطوة؟" : "What did we understand, and what is next?"}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-arsans text-[11px] text-[#F7F3EC]/58">{personaName}</span>
      </div>
      <div className="mt-4 grid gap-2">
        <ReceiptLine label={isArabic ? "دخلت بـ" : "Came in with"} value={receipt.cameInWith} accent="text-cyan-100" />
        <ReceiptLine label={isArabic ? "سمّيت" : "Named"} value={receipt.named} accent="text-[#C9A86A]" />
        <ReceiptLine label={isArabic ? "خطوتك" : "Next step"} value={receipt.nextStep} accent="text-emerald-100" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={onSafeShare} className="ui-action min-h-10 rounded-lg bg-[#C9A86A] px-3 py-2.5 text-xs leading-4 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
          {isArabic ? "شارك بأمان" : "Safe share"}
        </button>
        <button type="button" onClick={onProofShare} className="ui-action min-h-10 rounded-lg border border-cyan-100/30 px-3 py-2.5 text-xs leading-4 text-cyan-100 transition-colors hover:bg-cyan-100 hover:text-[#0E0D10]">
          {isArabic ? "إثبات" : "Proof"}
        </button>
        <button type="button" onClick={onSaveSnapshot} className="ui-action min-h-10 rounded-lg border border-emerald-100/30 px-3 py-2.5 text-xs leading-4 text-emerald-100 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10]">
          {isArabic ? "لقطة" : "Snapshot"}
        </button>
        <button type="button" onClick={onStartQuest} className="ui-action min-h-10 rounded-lg border border-white/10 px-3 py-2.5 text-xs leading-4 text-[#F7F3EC]/70 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
          {isArabic ? "تحدي" : "Quest"}
        </button>
      </div>
      <button type="button" onClick={() => setStoryboardOpen((open) => !open)} className="mt-3 w-full rounded-lg border border-blue-200/25 bg-blue-200/10 px-3 py-3 text-center font-arsans text-xs text-blue-100 transition-colors hover:bg-blue-100 hover:text-[#0E0D10]">
        {storyboardOpen ? (isArabic ? "إخفاء لوحة المشاهد" : "Hide storyboard") : isArabic ? "حوّلها للوحة مشاهد" : "Turn into storyboard"}
      </button>
      {storyboardOpen ? <StoryMirrorBoard language={language} shots={storyboard} /> : null}
    </section>
  );
}

function StoryMirrorBoard({ language, shots }: { language: Language; shots: StoryMirrorShot[] }) {
  const isArabic = language === "ar";
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [copiedScene, setCopiedScene] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "saved">("idle");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [imageStates, setImageStates] = useState<Record<number, StoryMirrorImageState>>({});
  const activeShot = shots[Math.min(activeShotIndex, shots.length - 1)] || shots[0];
  const cast = buildStoryMirrorCast(shots, language);
  const activeImageState = activeShot ? imageStates[activeShot.sceneNumber] : undefined;

  useEffect(() => {
    let cancelled = false;
    shots.forEach((shot) => {
      setImageStates((current) => ({ ...current, [shot.sceneNumber]: { status: "loading" } }));

      fetch(`/api/storyboard/image?fresh=${Date.now()}-${refreshNonce}-${shot.sceneNumber}`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ prompt: shot.prompt, title: shot.title, sceneNumber: shot.sceneNumber, variation: refreshNonce, language }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Storyboard image failed");
          return (await response.json()) as { imageDataUrl?: string; source?: string; model?: string };
        })
        .then((data) => {
          if (cancelled) return;
          if (!data.imageDataUrl) throw new Error("Storyboard image missing");
          setImageStates((current) => ({ ...current, [shot.sceneNumber]: { status: "ready", imageDataUrl: data.imageDataUrl, source: data.source, model: data.model } }));
        })
        .catch(() => {
          if (cancelled) return;
          setImageStates((current) => ({ ...current, [shot.sceneNumber]: { status: "error" } }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [language, refreshNonce, shots]);

  async function copyPrompt(shot: StoryMirrorShot) {
    try {
      await copyTextToClipboard(shot.prompt);
      setCopiedScene(shot.sceneNumber);
      window.setTimeout(() => setCopiedScene(null), 1800);
    } catch {
      setCopiedScene(null);
    }
  }

  async function copyAllPrompts() {
    const text = shots.map((shot) => `${shot.sceneNumber}. ${shot.title}\n${shot.prompt}`).join("\n\n");
    await copyTextToClipboard(text);
    setCopiedScene(0);
    window.setTimeout(() => setCopiedScene(null), 1800);
  }

  function exportBoard() {
    const markdown = buildStoryMirrorMarkdown(shots, cast, language);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fadfada-story-mirror-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportStatus("saved");
    window.setTimeout(() => setExportStatus("idle"), 1800);
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-200/25 bg-blue-200/[0.045] p-3" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker text-blue-100/80">{isArabic ? "لوحة المشاهد" : "Story mirror board"}</p>
          <h4 className="mt-1 font-arui text-lg font-semibold text-[#F7F3EC]/90">{isArabic ? "شخصيات، مشاهد، وبرومبتات صور" : "Characters, scenes, and image prompts"}</h4>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setRefreshNonce((current) => current + 1)} className="rounded-full border border-blue-100/25 px-2.5 py-1 font-arsans text-[10px] text-blue-100 transition-colors hover:bg-blue-100 hover:text-[#0E0D10]">
            {isArabic ? "صورة جديدة" : "New visual"}
          </button>
          <span className="rounded-full bg-blue-200/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-blue-100">{shots.length} shots</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {cast.map((character) => (
          <article key={character.name} className="rounded-xl border border-white/10 bg-black/16 p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-200/12 font-arsans text-sm text-blue-100">{character.icon}</span>
              <div className="min-w-0">
                <p className="truncate font-arsans text-sm font-semibold text-[#F7F3EC]/88">{character.name}</p>
                <p className="font-arsans text-[11px] text-blue-100/65">{character.role}</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 font-arsans text-xs leading-5 text-[#F7F3EC]/50">{character.description}</p>
          </article>
        ))}
      </div>

      {activeShot ? (
        <section className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_22%_18%,rgba(191,219,254,0.22),transparent_28%),radial-gradient(circle_at_78%_78%,rgba(201,168,106,0.18),transparent_30%),linear-gradient(135deg,rgba(8,13,22,0.96),rgba(20,25,45,0.92))]">
            {activeImageState?.status === "ready" && activeImageState.imageDataUrl ? (
              <img src={activeImageState.imageDataUrl} alt={activeShot.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center p-5 text-center">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 font-arsans text-sm text-blue-100/72">
                  {activeImageState?.status === "error" ? (isArabic ? "لم تُنشأ الصورة الآن. البرومبت جاهز للنسخ." : "Image could not be created now. The prompt is ready to copy.") : isArabic ? "جار إنشاء صورة المشهد..." : "Creating scene image..."}
                </div>
              </div>
            )}
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/78 via-black/12 to-black/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-blue-200/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-blue-100">{activeShot.shotType}</span>
                <span className="rounded-full bg-[#C9A86A]/12 px-3 py-1 font-mono text-[10px] text-[#C9A86A]">{activeShot.duration}</span>
              </div>
              <div>
                <h5 className="font-arui text-xl font-semibold text-[#F7F3EC]/95">{activeShot.title}</h5>
                <p className="mt-2 max-w-xl font-arsans text-sm leading-6 text-[#F7F3EC]/62">{activeShot.visualNotes}</p>
                {activeImageState?.source ? <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-blue-100/55">{activeImageState.source}</p> : null}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 border-t border-white/10 bg-black/16 p-2">
            {shots.map((shot, index) => (
              <button key={shot.sceneNumber} type="button" onClick={() => setActiveShotIndex(index)} className={`rounded-lg px-2 py-2 text-center font-arsans text-[11px] transition-colors ${index === activeShotIndex ? "bg-blue-100 text-[#0E0D10]" : "text-blue-100/70 hover:bg-blue-100/10"}`}>
                {isArabic ? "مشهد" : "Scene"} {shot.sceneNumber}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => void copyAllPrompts()} className="ui-action rounded-lg border border-blue-100/30 px-3 py-2.5 text-xs text-blue-100 transition-colors hover:bg-blue-100 hover:text-[#0E0D10]">
          {copiedScene === 0 ? (isArabic ? "نُسخت البرومبتات" : "Prompts copied") : isArabic ? "انسخ كل برومبتات الصور" : "Copy all image prompts"}
        </button>
        <button type="button" onClick={exportBoard} className="ui-action rounded-lg border border-[#C9A86A]/35 px-3 py-2.5 text-xs text-[#C9A86A] transition-colors hover:bg-[#C9A86A] hover:text-[#0E0D10]">
          {exportStatus === "saved" ? (isArabic ? "تم تنزيل الملف" : "Downloaded") : isArabic ? "نزّل اللوحة كملف" : "Download board file"}
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {shots.map((shot) => (
          <article key={shot.sceneNumber} className="rounded-xl border border-white/10 bg-black/18 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-200/12 font-mono text-xs text-blue-100">{shot.sceneNumber}</span>
                <div className="min-w-0">
                  <h5 className="truncate font-arsans text-sm font-semibold text-[#F7F3EC]/88">{shot.title}</h5>
                  <p className="mt-0.5 font-arsans text-[11px] text-blue-100/68">{shot.shotType} · {shot.duration}</p>
                </div>
              </div>
              <button type="button" onClick={() => void copyPrompt(shot)} className="shrink-0 rounded-full border border-blue-100/25 px-2.5 py-1 font-arsans text-[10px] text-blue-100 transition-colors hover:bg-blue-100 hover:text-[#0E0D10]">
                {copiedScene === shot.sceneNumber ? (isArabic ? "نُسخ" : "Copied") : isArabic ? "انسخ البرومبت" : "Copy prompt"}
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-start">
              {imageStates[shot.sceneNumber]?.status === "ready" && imageStates[shot.sceneNumber]?.imageDataUrl ? (
                <img src={imageStates[shot.sceneNumber].imageDataUrl} alt={shot.title} className="aspect-video w-full rounded-lg border border-white/10 object-cover" />
              ) : null}
              <p className="font-arsans text-xs leading-5 text-[#F7F3EC]/62"><span className="text-blue-100">{isArabic ? "الصورة: " : "Visual: "}</span>{shot.visualNotes}</p>
              <p className="font-arsans text-xs leading-5 text-[#F7F3EC]/52"><span className="text-pink-100">{isArabic ? "الصوت: " : "Audio: "}</span>{shot.audioNotes}</p>
              <p className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 font-arsans text-[11px] leading-5 text-[#F7F3EC]/48"><span className="text-[#C9A86A]">Prompt: </span>{shot.prompt}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function buildStoryMirrorCast(shots: StoryMirrorShot[], language: Language) {
  const isArabic = language === "ar";
  const first = shots[0];
  const second = shots[1];
  const third = shots[2];

  return isArabic
    ? [
        { icon: "أنا", name: "أنا الآن", role: "الشخصية الرئيسية", description: first?.visualNotes || "الشعور كما دخل إلى فضفضة." },
        { icon: "رف", name: "الرفيق", role: "المرآة الهادئة", description: second?.visualNotes || "يعكس المعنى بدون حكم أو تهويل." },
        { icon: "خط", name: "الخطوة", role: "المشهد القادم", description: third?.visualNotes || "فعل صغير وواضح يمكن البدء به." },
      ]
    : [
        { icon: "Me", name: "Me now", role: "Main character", description: first?.visualNotes || "The feeling as it entered FadFada." },
        { icon: "Co", name: "Companion", role: "Calm mirror", description: second?.visualNotes || "Reflects meaning without judgment or drama." },
        { icon: "Go", name: "The step", role: "Next scene", description: third?.visualNotes || "One small clear action to begin with." },
      ];
}

function buildStoryMirrorMarkdown(shots: StoryMirrorShot[], cast: ReturnType<typeof buildStoryMirrorCast>, language: Language) {
  const isArabic = language === "ar";
  const lines = [
    `# ${isArabic ? "لوحة مشاهد فضفضة" : "FadFada Story Mirror Board"}`,
    "",
    `## ${isArabic ? "الشخصيات" : "Cast"}`,
    "",
    ...cast.flatMap((character) => [`### ${character.name}`, `- ${isArabic ? "الدور" : "Role"}: ${character.role}`, `- ${isArabic ? "الوصف" : "Description"}: ${character.description}`, ""]),
    `## ${isArabic ? "المشاهد" : "Scenes"}`,
    "",
    ...shots.flatMap((shot) => [
      `### ${isArabic ? "مشهد" : "Scene"} ${shot.sceneNumber}: ${shot.title}`,
      `- ${isArabic ? "نوع اللقطة" : "Shot type"}: ${shot.shotType}`,
      `- ${isArabic ? "المدة" : "Duration"}: ${shot.duration}`,
      `- ${isArabic ? "الصورة" : "Visual"}: ${shot.visualNotes}`,
      `- ${isArabic ? "الصوت" : "Audio"}: ${shot.audioNotes}`,
      `- Prompt: ${shot.prompt}`,
      "",
    ]),
  ];

  return lines.join("\n");
}

function ReceiptLine({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <p className="rounded-xl border border-white/10 bg-black/16 px-3 py-2 font-arsans text-sm leading-6 text-[#F7F3EC]/68">
      <span className={`${accent} font-semibold`}>{label}: </span>{value}
    </p>
  );
}

function ThinkingShimmer({ language, personaName }: { language: Language; personaName: string }) {
  const isArabic = language === "ar";

  return (
    <div className="animate-rise-in rounded-2xl border border-white/10 bg-white/[0.025] p-4" dir={isArabic ? "rtl" : "ltr"}>
      <p className="font-arsans text-sm text-[#F7F3EC]/45">{isArabic ? `${personaName} يحضّر الرد...` : `${personaName} is preparing your reply...`}</p>
      <div className="mt-4 space-y-2">
        <span className="block h-3 w-11/12 animate-pulse rounded-full bg-[#F7F3EC]/10" />
        <span className="block h-3 w-9/12 animate-pulse rounded-full bg-[#F7F3EC]/10 [animation-delay:120ms]" />
        <span className="block h-3 w-7/12 animate-pulse rounded-full bg-[#C9A86A]/15 [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function PaywallCard({
  language,
  accessState,
  remainingReflections,
  configuration,
  loading,
  onCheckout,
  onSignIn,
  onClose,
}: {
  language: Language;
  accessState: AccessState;
  remainingReflections: number;
  configuration: typeof defaultExperienceConfiguration;
  loading: boolean;
  onCheckout: () => void;
  onSignIn: () => void;
  onClose: () => void;
}) {
  const isArabic = language === "ar";
  const isAnonymous = accessState === "anonymous";
  const { anonymousReflectionLimit, signedGiftReflectionLimit, anonymousPersonaLimit, signedPersonaLimit } = configuration;
  const gains = isAnonymous
    ? isArabic
      ? [`هدية تسجيل: ${signedGiftReflectionLimit} ردًا`, `${signedPersonaLimit} رفقاء بدل ${anonymousPersonaLimit}`, "حفظ الرحلة على حسابك", "بدون دفع الآن"]
      : [`Sign-in gift: ${signedGiftReflectionLimit} replies`, `${signedPersonaLimit} companions instead of ${anonymousPersonaLimit}`, "Save the journey to your account", "No payment now"]
    : isArabic
      ? ["حوّل الخيط إلى رحلة محفوظة", "كل الرفقاء والشخصيات", "ردود أعمق وخطوات أوضح", "حفظ أوسع للحظات والكبسولات"]
      : ["Turn this thread into a saved journey", "All companions and personas", "Deeper replies and clearer next steps", "Expanded moments and capsules"];
  const meterLabel = accessState === "plus"
    ? isArabic ? "بلس نشط" : "Plus active"
    : isArabic
      ? `${remainingReflections} ردود متبقية`
      : `${remainingReflections} replies left`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-6 backdrop-blur-sm" dir={isArabic ? "rtl" : "ltr"}>
      <div className="animate-rise-in w-full max-w-sm rounded-2xl border border-[#C9A86A]/35 bg-[#0E0D10]/95 p-5 text-start shadow-2xl backdrop-blur-2xl">
        <span className="inline-flex rounded-full border border-[#C9A86A]/35 bg-[#C9A86A]/10 px-3 py-1 font-arsans text-xs text-[#C9A86A]">{meterLabel}</span>
        <p className="mt-3 font-arserif text-2xl text-[#F7F3EC]/90">{isAnonymous ? (isArabic ? "خذ هديتك قبل الدفع" : "Claim your gift before paying") : isArabic ? "وصلت لنقطة تستحق الحفظ" : "This point is worth keeping"}</p>
        <p className="mt-3 font-arsans text-sm leading-7 text-[#F7F3EC]/60">
          {isAnonymous
            ? isArabic
              ? `جلسة الزائر قصيرة: ${anonymousReflectionLimit} ردود و${anonymousPersonaLimit} رفقاء. سجّل دخولك لتحصل على هدية أكبر وتحفظ ما بدأته.`
              : `The visitor session is short: ${anonymousReflectionLimit} replies and ${anonymousPersonaLimit} companions. Sign in to get a bigger gift and keep what you started.`
            : isArabic
              ? "لا نريد قطع الفضفضة فجأة. بلس يحفظ الرحلة ويفتح متابعة أعمق عندما تكون جاهزاً تكمل هذا الخيط بجدية."
              : "We will not cut the reflection abruptly. Plus saves the journey and unlocks deeper continuity when you are ready to keep this thread seriously alive."}
        </p>
        <div className="mt-4 grid gap-2">
          {gains.map((gain) => (
            <p key={gain} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-arsans text-xs text-[#F7F3EC]/70">
              {gain}
            </p>
          ))}
        </div>
        <button type="button" onClick={isAnonymous ? onSignIn : onCheckout} disabled={loading} className="ui-action mt-5 w-full rounded-full bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC] disabled:animate-pulse disabled:opacity-70">
          {loading ? (isArabic ? "جار التجهيز..." : "Preparing...") : isAnonymous ? (isArabic ? "سجّل واحصل على الهدية" : "Sign in and claim gift") : isArabic ? "احفظ الرحلة وافتح بلس" : "Save the journey with Plus"}
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full font-arsans text-xs text-[#F7F3EC]/45 transition-colors hover:text-[#F7F3EC]">
          {isArabic ? "لاحقاً" : "Later"}
        </button>
      </div>
    </div>
  );
}

function getClientDeviceType() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(userAgent)) return "tablet";
  if (/mobi|android|iphone/.test(userAgent)) return "mobile";
  return "desktop";
}

function getClientBrowserName() {
  const userAgent = navigator.userAgent;
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  return "Other";
}
