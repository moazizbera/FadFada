"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { prepareArabicForSpeech } from "../lib/arabicSpeech";
import { personas, type Persona, type PersonaId, type PersonaVoiceConfig } from "../lib/personas";
import { selectableWorlds, worlds, type WorldId } from "../lib/worlds";
import { useAppLocale } from "./AppShell";
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
type HomeHeaderAction = "start" | "avatars" | "newChat";

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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  world: WorldId;
  language?: Language;
  cadence?: EmotionalCadence;
  resources?: LearningResource[];
  personaId?: PersonaId;
  personaName?: string;
  avatarPath?: string;
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

type LearningResource = {
  title: string;
  type: "video" | "article" | "document";
  url: string;
  summary: string;
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
  emotionalCadence?: {
    speed?: EmotionalCadence;
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

type InteractionEventType = "starter_tap" | "moment_save" | "tiny_plan" | "moment_share" | "app_share" | "capsule_download" | "helpful_feedback" | "softer_feedback" | "visitor_comment" | "avatar_rating";

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
  const allowedCommands = new Set(["/judge", "/story", "/proof", "/quest", "/pitch", "/launch", "/badge"]);
  return cleanedValue && allowedCommands.has(cleanedValue) ? cleanedValue : "";
}

const visitorUserIdKey = "fadfada-user-id";
const chatSessionIdStorageKey = "fadfada-active-chat-session-id";
const conversationStorageKey = "fadfada-chat-session-v1";
const customPersonaStorageKey = "fadfada-custom-persona";
const localCreditStorageKey = "fadfada-beta-credits-used";
const dailyPulseStorageKey = "fadfada-daily-pulse";
const tinyPlanStorageKey = "fadfada-tiny-plans";
const journeySnapshotStorageKey = "fadfada-journey-snapshots";
const growthQuestStorageKey = "fadfada-growth-quests";
const discountCodeStorageKey = "fadfada-discount-code";
const voiceDialectStorageKey = "fadfada-voice-dialect";
const defaultExperienceConfiguration = {
  anonymousReflectionLimit: 5,
  signedGiftReflectionLimit: 15,
  anonymousPersonaLimit: 4,
  signedPersonaLimit: 10,
};
const maxStoredMessages = 80;
const fadfadaHomeActionEventName = "fadfada:home-action";

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
  return personaEnvironmentProfiles[personaIdValue] ?? defaultEnvironmentProfile;
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
  const { data: session } = useSession();
  const [world, setWorld] = useState<WorldId>("calm");
  const { language, setLanguage } = useAppLocale();
  const [personaId, setPersonaId] = useState<PersonaId>("omar");
  const [personaOpen, setPersonaOpen] = useState(false);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("local-demo-user");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "opening",
      role: "assistant",
      text: openingMessages.ar,
      world: "calm",
      language: "ar",
      personaId: "omar",
      personaName: "عمر",
      avatarPath: "/avatars/omar.png",
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
  const [storyOpen, setStoryOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeHomePanel, setActiveHomePanel] = useState<HomeToolPanel>("checkin");
  const [conversationHydrated, setConversationHydrated] = useState(false);
  const [journeySnapshotStatus, setJourneySnapshotStatus] = useState<"idle" | "saved">("idle");
  const [growthQuestStatus, setGrowthQuestStatus] = useState<"idle" | "saved">("idle");
  const [growthQuests, setGrowthQuests] = useState<GrowthQuest[]>([]);
  const [visitorComment, setVisitorComment] = useState("");
  const [visitorCommentStatus, setVisitorCommentStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedMomentIds, setSavedMomentIds] = useState<string[]>([]);
  const [feedbackMomentIds, setFeedbackMomentIds] = useState<string[]>([]);
  const [dailyPulse, setDailyPulse] = useState<DailyPulseState>({ mood: "steady", energy: "okay", need: "calm" });
  const [dailyPulseStats, setDailyPulseStats] = useState<DailyPulseStats>({ count: 0, streak: 0, lastDate: null });
  const [customPersonaDraft, setCustomPersonaDraft] = useState<CustomPersonaDraft | null>(null);
  const [trialCounter, setTrialCounter] = useState(0);
  const [activeChatSessionId, setActiveChatSessionId] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "saving" | "saved" | "loading" | "error">("idle");
  const [animatedAssistantMessageIds, setAnimatedAssistantMessageIds] = useState<string[]>([]);
  const [accountTokenBalance, setAccountTokenBalance] = useState<number | null>(null);
  const [grantedPersonaIds, setGrantedPersonaIds] = useState<PersonaId[]>([]);
  const [experienceConfiguration, setExperienceConfiguration] = useState(defaultExperienceConfiguration);
  const [activeDiscountCode, setActiveDiscountCode] = useState("");
  const recorderRef = useRef<ISpeechRecognition | null>(null);
  const keepRecordingRef = useRef(false);
  const recordingRestartCountRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const homeRef = useRef<HTMLElement | null>(null);
  const chatRef = useRef<HTMLElement | null>(null);

  const activeWorld = worlds[world];
  const customPersona = useMemo(() => buildCustomPersona(customPersonaDraft), [customPersonaDraft]);
  const activePersona = useMemo(() => {
    if (personaId === "custom" && customPersona) return customPersona;
    return personas.find((persona) => persona.id === personaId) ?? personas[0];
  }, [customPersona, personaId]);
  const activeHeaderPresentation = getHeaderAvatarPresentation(activePersona);
  const personaAura = activeHeaderPresentation.auraHex;
  const activePersonaDisplayName = getHeaderDisplayName(activePersona, language);
  const personaEnvironment = getPersonaEnvironmentProfile(activePersona.id);
  const activeBehavior = behaviorStyles[behaviorStyle];
  const conversationContinuity = useMemo(() => buildConversationContinuity(messages, language), [messages, language]);
  const latestAssistantMessage = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant" && message.id !== "opening"), [messages]);
  const greetingName = useMemo(() => normalizeGreetingName(session?.user?.name || session?.user?.email), [session?.user?.email, session?.user?.name]);
  const accountName = session?.user?.name || session?.user?.email || (language === "ar" ? "حسابي" : "Account");
  const accountImage = session?.user?.image || null;
  const sessionUser = session?.user as ({ id?: string; activeTier?: string; tokenBalance?: number } & Record<string, unknown>) | undefined;
  const accessState: AccessState = sessionUser?.activeTier === "PLUS" || sessionUser?.activeTier === "BUSINESS" ? "plus" : sessionUser?.id ? "signed" : "anonymous";
  const { anonymousReflectionLimit, signedGiftReflectionLimit, anonymousPersonaLimit, signedPersonaLimit } = experienceConfiguration;
  const signedReflectionAllowance = Math.max(signedGiftReflectionLimit, accountTokenBalance ?? sessionUser?.tokenBalance ?? signedGiftReflectionLimit);
  const reflectionLimit = accessState === "anonymous" ? anonymousReflectionLimit : accessState === "signed" ? signedReflectionAllowance : Number.POSITIVE_INFINITY;
  const usedReflections = accessState === "plus" ? 0 : trialCounter;
  const remainingReflections = accessState === "plus" ? Number.POSITIVE_INFINITY : Math.max(0, reflectionLimit - usedReflections);
  const unlockedPersonaIds = useMemo<PersonaId[]>(() => {
    if (accessState === "plus") return personas.map((persona) => persona.id);
    const limit = accessState === "signed" ? signedPersonaLimit : anonymousPersonaLimit;
    return Array.from(new Set([...personas.slice(0, limit).map((persona) => persona.id), ...grantedPersonaIds]));
  }, [accessState, anonymousPersonaLimit, grantedPersonaIds, signedPersonaLimit]);

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

  function submitStarterMoment(text: string, nextWorld: WorldId) {
    setWorld(nextWorld);
    trackInteraction("starter_tap", { world: nextWorld, language });
    void submitMessage(undefined, text, nextWorld);
  }

  function submitJudgeScenario(text: string, nextWorld: WorldId, targetLanguage: Language, nextPersonaId: PersonaId) {
    const nextPersona = personas.find((persona) => persona.id === nextPersonaId) ?? activePersona;
    setPersonaId(nextPersonaId);
    setLanguage(targetLanguage);
    setWorld(nextWorld);
    setToolsOpen(false);
    trackInteraction("starter_tap", { type: "judge_demo", world: nextWorld, language: targetLanguage, personaId: nextPersonaId });
    scrollToSection("chat");
    void submitMessage(undefined, text, nextWorld, nextPersona);
  }

  function submitDailyPulse() {
    const today = new Date().toISOString().slice(0, 10);
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

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    void submitMessage();
  }

  function stageSecretCommand(command: string) {
    setToolsOpen(false);
    setInput(command);
    window.setTimeout(focusInput, 80);
    trackInteraction("starter_tap", { type: "secret_command_hint", command, language });
  }

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0].id !== "opening") return current;
      return [{ ...current[0], text: buildOpeningMessage(language, greetingName), language }];
    });
  }, [greetingName, language]);

  useEffect(() => {
    if (!conversationHydrated) return;

    localStorage.setItem(
      conversationStorageKey,
      JSON.stringify({
        messages: sanitizeStoredMessages(messages).slice(-maxStoredMessages),
        world,
        savedAt: new Date().toISOString(),
      })
    );
  }, [conversationHydrated, messages, world]);

  useEffect(() => {
    if (!activeChatSessionId) {
      const storedSessionId = localStorage.getItem(chatSessionIdStorageKey);
      const nextSessionId = storedSessionId || `session:${crypto.randomUUID()}`;
      localStorage.setItem(chatSessionIdStorageKey, nextSessionId);
      setActiveChatSessionId(nextSessionId);
    }
  }, [activeChatSessionId]);

  useEffect(() => {
    if (sessionUser?.id) {
      setUserId(sessionUser.id);
    }
    setTrialCounter(getUsedCredits());
  }, [accessState, sessionUser?.id]);

  useEffect(() => {
    if (accessState !== "signed" || !sessionUser?.id) {
      setAccountTokenBalance(null);
      return;
    }

    let active = true;
    fetch("/api/profile")
      .then((response) => response.ok ? response.json() as Promise<{ profile?: { tokenBalance?: number; grantedPersonaIds?: PersonaId[] } }> : null)
      .then((data) => {
        if (!active) return;
        const tokenBalance = Number(data?.profile?.tokenBalance);
        setAccountTokenBalance(Number.isFinite(tokenBalance) ? tokenBalance : null);
        setGrantedPersonaIds(Array.isArray(data?.profile?.grantedPersonaIds) ? data.profile.grantedPersonaIds.filter((personaIdValue) => personas.some((persona) => persona.id === personaIdValue)) : []);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [accessState, sessionUser?.id]);

  useEffect(() => {
    if (accessState === "anonymous") return;
    void loadChatSessions();
  }, [accessState, sessionUser?.id]);

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

    setInput(stagedCommand);
    setToolsOpen(false);
    scrollToSection("chat");
    window.setTimeout(focusInput, 120);
    trackInteraction("starter_tap", { type: "demo_command_staged", command: stagedCommand, language });
    params.delete("demoCommand");
    params.delete("fadfadaCommand");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [language]);

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
        }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (accessState === "anonymous" || !conversationHydrated || !activeChatSessionId || messages.length < 2) return;

    const timeout = window.setTimeout(() => {
      void saveCurrentChatSession("silent");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [accessState, activeChatSessionId, conversationHydrated, messages, personaId, world, language]);

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
    if (accessState === "anonymous" || !activeChatSessionId || messages.length < 2) return false;
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
    if (accessState !== "anonymous" && messages.length >= 2) {
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
    localStorage.setItem(chatSessionIdStorageKey, nextSessionId);
    setActiveChatSessionId(nextSessionId);
    setAnimatedAssistantMessageIds([]);
    setMessages([{ id: "opening", role: "assistant", text: buildOpeningMessage(language, greetingName), world: "calm", language, personaId: "omar", personaName: language === "ar" ? "عمر" : "Omar", avatarPath: "/avatars/omar.png" }]);
    setWorld("calm");
    setToolsOpen(false);
    window.setTimeout(focusInput, 120);
  }

  async function openChatSession(sessionItem: ChatSessionSummary) {
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

    localStorage.setItem(chatSessionIdStorageKey, sessionItem.sessionId);
    setActiveChatSessionId(sessionToOpen.sessionId);
    const restoredMessages: ChatMessage[] = sessionToOpen.messages.length > 0 ? sessionToOpen.messages : [{ id: "opening", role: "assistant", text: buildOpeningMessage(language, greetingName), world: "calm", language, personaId: "omar", personaName: language === "ar" ? "عمر" : "Omar", avatarPath: "/avatars/omar.png" }];
    setMessages(restoredMessages);
    setAnimatedAssistantMessageIds(getAssistantMessageIds(restoredMessages));
    if (sessionToOpen.activeWorld in worlds) setWorld(sessionToOpen.activeWorld as WorldId);
    const nextPersona = personas.find((persona) => persona.id === sessionToOpen.activePersonaId);
    if (nextPersona) setPersonaId(nextPersona.id);
    setSessionStatus("idle");
    setToolsOpen(false);
    window.setTimeout(() => scrollToSection("chat"), 80);
  }

  function scrollToSection(section: "home" | "chat") {
    const target = section === "home" ? homeRef.current : chatRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      setToolsOpen(false);
      setPersonaOpen(true);
      void trackInteraction("starter_tap", { type: "top_menu_avatars", language });
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

    if (initialAction === "start" || initialAction === "avatars" || initialAction === "newChat") {
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
      if (action === "start" || action === "avatars" || action === "newChat") {
        runHomeHeaderAction(action);
      }
    };

    window.addEventListener(fadfadaHomeActionEventName, handleAction);
    return () => window.removeEventListener(fadfadaHomeActionEventName, handleAction);
  }, [language]);

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

  function playBrowserSpeech(message: ChatMessage) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const speechLanguage = message.language || language;
    const preferredVoiceConfig = getPreferredVoiceConfig(activePersona.voiceConfig);
    const utterance = new SpeechSynthesisUtterance(prepareArabicForSpeech(message.text, speechLanguage, getArabicSpeechDialect(preferredVoiceConfig)));
    utterance.lang = getSpeechLocale(speechLanguage, preferredVoiceConfig);
    utterance.rate = preferredVoiceConfig.rate;
    utterance.pitch = preferredVoiceConfig.pitch;
    utterance.voice = selectSpeechVoice(speechLanguage, preferredVoiceConfig) ?? null;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(message.id);
    window.speechSynthesis.speak(utterance);
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

    if (!overrideText && await runSecretCommand(text)) return;

    if (accessState !== "plus" && getUsedCredits() >= reflectionLimit) {
      if (!overrideText) setInput("");
      showAccessLimitMessage();
      return;
    }

    const nextLanguage = inferRequestedLanguage(text, language);
    const requestWorld = overrideWorld ?? world;
    const requestPersona = overridePersona ?? activePersona;
    const personaContinuityPrompt = buildCompanionContinuityPrompt(requestPersona, messages, nextLanguage);
    setInput("");
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
          messageText: text,
          currentWorld: requestWorld,
          currentLanguage: nextLanguage,
          userDisplayName: greetingName,
          personaSystemPrompt: [requestPersona.coreSystemPrompt, personaContinuityPrompt].filter(Boolean).join("\n\n"),
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
      if (accessState !== "plus") {
        useOneCredit();
      }
      setWorld(responseWorld);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.text || (nextLanguage === "ar" ? "أنا معاك. خلينا نكمل بخطوة صغيرة." : "I am with you. Let's continue with one small step."),
          world: responseWorld,
          language: nextLanguage,
          cadence,
          resources: data.resources,
          personaId: requestPersona.id,
          personaName: nextLanguage === "ar" ? requestPersona.nameAr : requestPersona.nameEn,
          avatarPath: requestPersona.avatarPath,
        },
      ]);
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

  // Cleanup on unmount
  useEffect(() => {
    const storedUserId = localStorage.getItem(visitorUserIdKey);
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const nextUserId = `visitor:${crypto.randomUUID()}`;
      localStorage.setItem(visitorUserIdKey, nextUserId);
      setUserId(nextUserId);
    }

    try {
      const storedConversation = JSON.parse(localStorage.getItem(conversationStorageKey) || "null") as { messages?: ChatMessage[]; world?: WorldId } | null;
      const restoredMessages = sanitizeStoredMessages(storedConversation?.messages);
      if (restoredMessages.length > 0) {
        setMessages(restoredMessages);
        setAnimatedAssistantMessageIds(getAssistantMessageIds(restoredMessages));
      }
      if (storedConversation?.world && storedConversation.world in worlds) {
        setWorld(storedConversation.world);
      }
    } catch {
      localStorage.removeItem(conversationStorageKey);
    } finally {
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
  }, []);

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

    localStorage.setItem(customPersonaStorageKey, JSON.stringify(nextDraft));
    setCustomPersonaDraft(nextDraft);
    setPersonaId("custom");
    trackInteraction("starter_tap", { type: "custom_persona", language });
    window.setTimeout(focusInput, 80);
  }

  function selectPersona(nextPersonaId: PersonaId) {
    setPersonaId(nextPersonaId);
    window.setTimeout(focusInput, 80);
  }

  return (
    <main
      className={`relative mx-auto flex min-h-screen max-w-2xl flex-col overflow-hidden px-4 pb-44 pt-20 transition-all duration-700 ease-in-out ${personaEnvironment.ambientClassName} ${personaEnvironment.textClassName} ${personaEnvironment.typographyClassName}`}
      style={{
        backgroundImage: activeWorld.gradient,
        "--persona-aura": personaAura,
        "--persona-aura-soft": hexToRgba(personaAura, 0.22),
        "--persona-aura-faint": hexToRgba(personaAura, 0.1),
      } as React.CSSProperties}
    >
      <div className={`persona-ambient-layer pointer-events-none absolute inset-0 ${personaEnvironment.animationClassName}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(247,243,236,0.08),transparent_22rem)]" />

      <header className="relative z-10 flex min-h-24 items-start justify-between">
        <button type="button" onClick={() => void startNewChatSession()} className="ui-action rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs text-[#F7F3EC]/70 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
          {language === "ar" ? "محادثة جديدة" : "New chat"}
        </button>
        <button
          type="button"
          onClick={() => setPersonaOpen(true)}
          className="absolute left-1/2 top-0 flex w-40 -translate-x-1/2 flex-col items-center gap-1.5 rounded-[1.25rem] border border-white/10 bg-black/15 px-3 py-2 text-center outline-none backdrop-blur-sm transition-colors hover:border-[#C9A86A]/45"
          aria-label={language === "ar" ? `افتح اختيار الرفيق ${activePersona.nameAr}` : `Open persona drawer for ${activePersona.nameEn}`}
        >
          <span
            className={`h-[4.75rem] w-[4.75rem] ${headerAvatarFrameClass} rounded-[1.65rem] transition-all duration-500 ${isThinking ? "animate-pulse scale-105" : "animate-breathe scale-105 duration-[4000ms]"
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
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="font-arserif text-2xl text-[#F7F3EC]/95 sm:text-3xl">فضفضة</span>
        </div>
      </header>

      <section ref={homeRef} className="relative z-10 mt-8 scroll-mt-24 flex flex-col items-center">
        <PresenceOrb world={world} color={activeWorld.orbHex} />
        <h1 className="mt-4 text-center font-arui text-3xl font-semibold leading-tight text-[#F7F3EC]/95">
          {language === "ar" ? "فضفضة ليست شات عام" : "FadFada is not a generic chat"}
        </h1>
        <p className="mt-2 max-w-md text-center font-arsans text-base leading-7 text-[#F7F3EC]/62">
          {language === "ar"
            ? "مساحة عربية/إنجليزية هادئة: اكتب ما بداخلك، واختر من القائمة عندما تحتاج رفيقًا أو خطوة أو حفظ لحظة."
            : "A calm Arabic/English space: write what is inside, then open the menu when you need a companion, a step, or a saved moment."}
        </p>
        <TrustChipRow language={language} />
        {plusWelcomeOpen ? (
          <PlusWelcomeCard
            language={language}
            onClose={() => setPlusWelcomeOpen(false)}
            onExplore={() => {
              setPlusWelcomeOpen(false);
              setToolsOpen(true);
              setActiveHomePanel("plans");
            }}
          />
        ) : null}
        <FeatureAnnouncementCard language={language} onTry={() => {
          const storyPersona = personas.find((persona) => persona.id === "rawi") ?? activePersona;
          submitJudgeScenario(
            language === "ar"
              ? "اصنعي مثالاً بصرياً إبداعياً: شخص يدخل غرفة هادئة مليئة بضوء ذهبي وظلال زرقاء، يحمل شعور أن أحداً قلل من ألمه. حوّليها إلى لوحة مشاهد بثلاث صور رمزية: اللحظة كما دخلت، المرآة الهادئة، والخطوة الصغيرة نحو ضوء واضح. اجعلي البرومبتات صالحة لتوليد صور سينمائية آمنة بدون نص داخل الصورة."
              : "Create a creative visual demo: a person enters a quiet room filled with golden light and blue shadows, carrying the feeling that someone minimized their pain. Turn it into a three-image symbolic storyboard: the moment as it arrived, the calm mirror, and one small step toward clear light. Make the prompts ready for safe cinematic image generation with no text inside the image.",
            "story",
            language,
            storyPersona.id
          );
        }} />
        <JudgeDemoCallout language={language} onRun={() => {
          const scenario = judgeDemoScenarios[language][0];
          submitJudgeScenario(scenario.text, scenario.world, scenario.targetLanguage, scenario.personaId);
        }} />
        <div className="mt-5 w-full max-w-sm" dir={language === "ar" ? "rtl" : "ltr"}>
          <button type="button" onClick={focusInput} className="ui-action w-full rounded-xl bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
            {language === "ar" ? "ابدأ الفضفضة" : "Start venting"}
          </button>
        </div>
        <FirstMomentPanel language={language} onSelect={submitStarterMoment} onPersona={() => setPersonaOpen(true)} onDemo={() => {
          const scenario = judgeDemoScenarios[language][0];
          submitJudgeScenario(scenario.text, scenario.world, scenario.targetLanguage, scenario.personaId);
        }} />
        <ReturnMemoryCard
          language={language}
          continuity={conversationContinuity}
          onContinue={() => {
            scrollToSection("chat");
            window.setTimeout(focusInput, 120);
          }}
          onSaveSnapshot={saveJourneySnapshot}
        />
        <p className="mt-3 font-arsans text-sm text-[#F7F3EC]/45">{language === "ar" ? activeWorld.nameAr : activeWorld.nameEn}</p>
        {shareStatus !== "idle" ? (
          <p className="mt-3 rounded-full border border-cyan-100/20 bg-black/25 px-4 py-2 text-center font-arsans text-xs text-cyan-100" aria-live="polite">
            {shareStatus === "copied" ? (language === "ar" ? "تم نسخ نص المشاركة. إذا لم يظهر في لينكدإن، الصقه يدويًا." : "Share text copied. If LinkedIn leaves the post empty, paste it manually.") : language === "ar" ? "تعذر فتح المشاركة. انسخ الرابط يدويًا." : "Could not share. Copy the link manually."}
          </p>
        ) : null}
      </section>

      <section
        ref={chatRef}
        className={`relative z-10 mx-auto mt-8 flex w-full max-w-[42rem] flex-1 flex-col gap-8 overflow-y-auto text-right transition-opacity duration-500 ${paywallOpen ? "opacity-20" : "opacity-100"
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
                  <TypewriterSync
                    text={messagePersonaEnvironment.formatAssistantText?.(message.text) ?? message.text}
                    language={messageLanguage}
                    cadence={resolvePersonaCadence(message.cadence, message.world, messagePersonaEnvironment)}
                    accentHex={messagePersona.glowColorHex}
                    className={messagePersonaEnvironment.typewriterClassName}
                    instant={animatedAssistantMessageIds.includes(message.id)}
                    onComplete={() => setAnimatedAssistantMessageIds((current) => current.includes(message.id) ? current : [...current, message.id])}
                  />
                <VoicePlaybackButton
                  language={messageLanguage}
                  speaking={speakingMessageId === message.id}
                  loading={actionLoadingKey === `${message.id}:speak`}
                  onClick={() => void runMomentAction(message.id, "speak", () => toggleVoicePlayback(message))}
                />
                <MomentActions
                  language={language}
                  saved={savedMomentIds.includes(message.id)}
                  feedbackSent={feedbackMomentIds.includes(message.id)}
                  pendingAction={actionLoadingKey?.startsWith(`${message.id}:`) ? actionLoadingKey.split(":")[1] as MomentActionKey : null}
                  onSave={() => void runMomentAction(message.id, "save", () => saveMoment(message))}
                  onPlan={() => void runMomentAction(message.id, "plan", () => saveTinyPlan(message))}
                  onShare={() => void runMomentAction(message.id, "share", () => shareMoment(message))}
                  onProof={() => void runMomentAction(message.id, "proof", () => shareProofCard(message))}
                  onDownload={() => void runMomentAction(message.id, "download", () => downloadCapsule(message))}
                  onPersona={() => setPersonaOpen(true)}
                  onHelpful={() => void runMomentAction(message.id, "helpful", () => sendFeedback(message, "helpful_feedback"))}
                  onSofter={() => void runMomentAction(message.id, "softer", () => sendFeedback(message, "softer_feedback"))}
                />
                <LearningResourceCards language={messageLanguage} resources={message.resources} />
                </div>
              </div>
            )}
          </article>
          );
        })}
        {latestAssistantMessage ? (
          <ReflectionReceiptCard
            language={language}
            message={latestAssistantMessage}
            userMessage={[...messages].reverse().find((message) => message.role === "user")}
            personaName={latestAssistantMessage.personaName || activePersonaDisplayName}
            onSaveSnapshot={saveJourneySnapshot}
            onSafeShare={() => void shareSafeReceipt(latestAssistantMessage)}
            onProofShare={() => void shareProofCard(latestAssistantMessage)}
            onStartQuest={startGrowthQuest}
          />
        ) : null}
        {isThinking ? (
          <ThinkingShimmer language={language} personaName={language === "ar" ? activePersona.nameAr : activePersona.nameEn} />
        ) : null}
      </section>

      {paywallOpen ? <PaywallCard language={language} accessState={accessState} remainingReflections={remainingReflections} configuration={experienceConfiguration} loading={checkoutLoading} onCheckout={startCheckout} onSignIn={openSignInGift} onClose={() => setPaywallOpen(false)} /> : null}

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

      <form onSubmit={submitMessage} className="fixed inset-x-0 bottom-20 z-30 mx-auto flex max-w-2xl flex-col gap-2 px-4 pb-3 pt-4 backdrop-blur-xl">
        {accessState !== "plus" ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-[#0E0D10]/82 px-3 py-2 shadow-xl" dir={language === "ar" ? "rtl" : "ltr"}>
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
        <div className="flex w-full items-end gap-3">
        <button
          type="button"
          onClick={toggleVoiceCapture}
          className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 py-2 font-arsans text-xs transition-colors ${isRecording ? "border-red-200/35 bg-red-200/10 text-red-100 shadow-[0_0_0_6px_rgba(248,113,113,0.12)]" : "border-[#F7F3EC]/10 bg-[#F7F3EC]/[0.03] text-[#C9A86A] hover:border-[#C9A86A]/45"
            }`}
          aria-pressed={isRecording}
          aria-label={isRecording ? (language === "ar" ? "إيقاف التسجيل الصوتي" : "Stop voice recording") : language === "ar" ? "تشغيل التسجيل الصوتي" : "Start voice recording"}
        >
          <span className={isRecording ? "absolute inset-0 rounded-full border border-[#C9A86A]/60 animate-ping" : "hidden"} />
          <span className="h-2.5 w-2.5 rounded-full bg-[#C9A86A]" aria-hidden="true" />
          <span>{isRecording ? (language === "ar" ? "إيقاف" : "Stop") : language === "ar" ? "صوت" : "Voice"}</span>
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          rows={1}
          dir={language === "ar" ? "rtl" : "ltr"}
          placeholder={language === "ar" ? "فضفض هنا..." : "Write freely..."}
          className={`min-h-12 flex-1 border-0 bg-transparent font-arsans text-lg leading-[1.9] text-[#F7F3EC]/95 outline-none placeholder:text-[#F7F3EC]/25 ${language === "ar" ? "text-right" : "text-left"}`}
        />
        <button type="submit" disabled={isThinking} className={`ui-action pb-3 text-[#C9A86A] transition-colors hover:text-[#F7F3EC] disabled:opacity-60 ${isThinking ? "animate-pulse" : ""}`}>
          {isThinking ? (language === "ar" ? "ينتظر" : "Waiting") : language === "ar" ? "إرسال" : "Send"}
        </button>
        </div>
      </form>

      <BottomNav
        language={language}
        accountHref={session?.user ? "/profile" : "/auth/signin?callbackUrl=/"}
        accountName={accountName}
        accountImage={accountImage}
        onHome={() => scrollToSection("home")}
        onChat={() => {
          scrollToSection("chat");
          window.setTimeout(focusInput, 120);
        }}
        onPersona={() => setPersonaOpen(true)}
        onMenu={() => setToolsOpen(true)}
      />

      <PersonaDrawer
        open={personaOpen}
        activePersona={personaId}
        language={language}
        unlockedPersonaIds={unlockedPersonaIds}
        customPersona={customPersona}
        onClose={() => setPersonaOpen(false)}
        onSelect={selectPersona}
        onLockedPersonaSelect={handleLockedPersonaSelect}
        onCustomPersonaSave={saveCustomPersona}
        onAvatarRate={rateAvatar}
      />
    </main>
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

      if (!role || !text) return null;

      return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : crypto.randomUUID(),
        role,
        text,
        world,
        language,
        cadence,
        resources,
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
        {sessions.length > 0 ? sessions.map((sessionItem) => (
          <button key={sessionItem.sessionId} type="button" onClick={() => onOpenSession(sessionItem)} className="rounded-xl border border-white/10 bg-black/15 p-3 text-start transition hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10">
            <span className="block truncate font-arsans text-sm text-[#F7F3EC]/84" dir="auto">{sessionItem.title}</span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-[#F7F3EC]/35" dir="ltr">
              {sessionItem.messageCount ?? sessionItem.messages.length} messages · {sessionItem.activePersonaId} · {sessionItem.updatedAt ? new Date(sessionItem.updatedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US") : "local"}
            </span>
          </button>
        )) : (
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

function FirstMomentPanel({ language, onSelect, onPersona, onDemo }: { language: Language; onSelect: (text: string, world: WorldId) => void; onPersona: () => void; onDemo: () => void }) {
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
        <button type="button" onClick={onPersona} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 font-arsans text-[11px] text-[#F7F3EC]/58 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
          {isArabic ? "اختر رفيق" : "Pick companion"}
        </button>
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
      ]
    : [
        { command: "/judge", label: "Judge demo", text: "Runs the strongest live shot" },
        { command: "/proof", label: "Proof card", text: "Turns the latest reply into a share artifact" },
        { command: "/pitch", label: "Judge pitch", text: "Copies the 60-second explanation" },
        { command: "/launch", label: "Launch post", text: "Copies a follower-ready post" },
        { command: "/badge", label: "Believer badge", text: "Shares your early supporter badge" },
        { command: "/story", label: "Story mirror", text: "Rawiya turns the feeling into a symbolic scene" },
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
  accountHref,
  accountName,
  accountImage,
  onHome,
  onChat,
  onPersona,
  onMenu,
}: {
  language: Language;
  accountHref: string;
  accountName: string;
  accountImage: string | null;
  onHome: () => void;
  onChat: () => void;
  onPersona: () => void;
  onMenu: () => void;
}) {
  const isArabic = language === "ar";
  const accountInitial = accountName.trim().slice(0, 1).toUpperCase() || (isArabic ? "ح" : "A");
  const itemClass = "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-bone/62 transition-colors hover:bg-white/[0.05] hover:text-[#C9A86A]";
  const labelClass = `${isArabic ? "font-arsans" : "font-ensans"} text-[11px] leading-none`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl border-t border-white/10 bg-[#0E0D10]/92 px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl" dir={isArabic ? "rtl" : "ltr"} aria-label={isArabic ? "تنقل التطبيق" : "App navigation"}>
      <div className="grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
        <button type="button" onClick={onHome} className={itemClass}>
          <HomeIcon />
          <span className={labelClass}>{isArabic ? "الرئيسية" : "Home"}</span>
        </button>
        <button type="button" onClick={onChat} className={itemClass}>
          <ChatIcon />
          <span className={labelClass}>{isArabic ? "المحادثة" : "Chat"}</span>
        </button>
        <button type="button" onClick={onPersona} className={itemClass}>
          <PersonaIcon />
          <span className={labelClass}>{isArabic ? "الرفيق" : "Persona"}</span>
        </button>
        <button type="button" onClick={onMenu} className={itemClass}>
          <MenuIcon />
          <span className={labelClass}>{isArabic ? "القائمة" : "Menu"}</span>
        </button>
        <Link href={accountHref} className={itemClass}>
          <span className="relative grid h-5 w-5 overflow-hidden rounded-full border border-white/10 bg-slate-950/80">
            {accountImage ? <Image src={accountImage} alt={accountName} fill sizes="20px" className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center font-ensans text-[9px] font-semibold text-[#C9A86A]">{accountInitial}</span>}
          </span>
          <span className={labelClass}>{isArabic ? "الحساب" : "Account"}</span>
        </Link>
      </div>
    </nav>
  );
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
  const embedUrl = videoResource ? buildVideoEmbedUrl(videoResource.url) : null;

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
          <a href={videoResource.url} target="_blank" rel="noreferrer" className="ui-action shrink-0 rounded-lg border border-emerald-200/30 px-3 py-2 text-xs text-emerald-200 transition-colors hover:bg-emerald-200 hover:text-[#0E0D10]">
            {isArabic ? "فتح" : "Open"}
          </a>
        ) : null}
      </div>

      {videoResource ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/25">
          {embedUrl ? (
            <iframe
              title={isArabic ? "فيديو تعليمي مقترح" : "Suggested learning video"}
              src={embedUrl}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="grid aspect-video place-items-center px-4 text-center font-arsans text-sm text-[#F7F3EC]/55">
              {isArabic ? "افتح المورد خارج التطبيق إذا لم يظهر الفيديو هنا." : "Open the resource externally if the video cannot appear here."}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {otherResources.map((resource) => (
          <a key={`${resource.type}:${resource.url}`} href={resource.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/10 bg-white/[0.025] p-3 transition-colors hover:border-emerald-200/35">
            <span className="block font-arsans text-sm text-[#F7F3EC]/82">{isArabic ? resourceTypeLabel(resource.type, language) : resource.title}</span>
            <span className="mt-1 block font-arsans text-xs leading-5 text-[#F7F3EC]/48">
              {isArabic ? (resource.type === "document" ? "ملاحظات مختصرة تساعدك تراجع الفكرة." : "مصدر إضافي للمراجعة.") : resource.summary}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function resourceTypeLabel(type: LearningResource["type"], language: Language) {
  if (type === "video") return language === "ar" ? "فيديو" : "Video";
  if (type === "document") return language === "ar" ? "ملاحظات" : "Notes";
  return language === "ar" ? "مقال" : "Article";
}

function buildVideoEmbedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;

      const searchQuery = parsedUrl.searchParams.get("search_query");
      if (searchQuery) return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`;
    }

    if (host === "youtu.be") {
      const videoId = parsedUrl.pathname.replace(/^\//, "");
      if (videoId) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    }
  } catch {
    return null;
  }

  return null;
}

function MomentActions({
  language,
  saved,
  feedbackSent,
  pendingAction,
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
  pendingAction: MomentActionKey | null;
  onSave: () => void;
  onPlan: () => void;
  onShare: () => void;
  onProof: () => void;
  onDownload: () => void;
  onPersona: () => void;
  onHelpful: () => void;
  onSofter: () => void;
}) {
  const isArabic = language === "ar";
  const [open, setOpen] = useState(false);
  const loadingLabel = isArabic ? "جار التنفيذ" : "Working";
  const actionClass = "flex w-full items-center gap-3 rounded-xl border border-[#F7F3EC]/10 bg-white/[0.025] px-3 py-2.5 text-start font-arsans text-xs text-[#F7F3EC]/72 transition-colors hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10 hover:text-[#C9A86A] disabled:animate-pulse disabled:opacity-65";

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
    <div className="mt-4 flex flex-wrap justify-end gap-2" dir={isArabic ? "rtl" : "ltr"}>
      <button type="button" onClick={onSave} disabled={pendingAction === "save"} className="ui-action inline-flex items-center gap-1.5 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-3 py-2 text-xs text-emerald-100 transition-colors hover:bg-emerald-200 hover:text-[#0E0D10] disabled:animate-pulse disabled:opacity-65">
        <ActionGlyph name="save" />
        <span>{pendingAction === "save" ? loadingLabel : saved ? (isArabic ? "محفوظ" : "Saved") : isArabic ? "احفظ" : "Save"}</span>
      </button>
      <button type="button" onClick={onPlan} disabled={pendingAction === "plan"} className="ui-action inline-flex items-center gap-1.5 rounded-full border border-cyan-100/30 bg-cyan-100/10 px-3 py-2 text-xs text-cyan-100 transition-colors hover:bg-cyan-100 hover:text-[#0E0D10] disabled:animate-pulse disabled:opacity-65">
        <ActionGlyph name="plan" />
        <span>{pendingAction === "plan" ? loadingLabel : isArabic ? "خطة" : "Plan"}</span>
      </button>
      <button type="button" onClick={onPersona} className="ui-action inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-[#F7F3EC]/62 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
        <ActionGlyph name="persona" />
        <span>{isArabic ? "جرّب رفيق" : "Try companion"}</span>
      </button>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="ui-action inline-flex items-center gap-1.5 rounded-full border border-[#C9A86A]/35 bg-[#C9A86A]/10 px-3 py-2 text-xs text-[#C9A86A] shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#C9A86A] hover:text-[#0E0D10] hover:shadow-[0_18px_48px_rgba(201,168,106,0.22)]"
        aria-expanded={open}
      >
        <ActionGlyph name="more" />
        <span>{isArabic ? "إجراءات" : "Actions"}</span>
      </button>
      {menu}
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
