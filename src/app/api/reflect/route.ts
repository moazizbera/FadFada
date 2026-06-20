export const runtime = "edge";

import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { reflectLocally } from "../../../lib/localReflect";
import { prisma } from "../../../lib/prisma";
import { worlds, type WorldId } from "../../../lib/worlds";

type ReflectRequestBody = {
  userId?: string;
  messageText?: string;
  currentWorld?: WorldId;
  currentLanguage?: "ar" | "en";
};

type EmotionalCadenceSpeed = "slow_reflective" | "steady_calm" | "rapid_energetic";

type ReflectGeminiPayload = {
  text: string;
  world: WorldId;
  emotionalCadence: {
    speed: EmotionalCadenceSpeed;
    typewriterIntervalMs: number;
    particleVelocity: number;
  };
};

export async function POST(request: NextRequest) {
  let body: ReflectRequestBody;

  try {
    body = (await request.json()) as ReflectRequestBody;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const messageText = body.messageText?.trim();
  const currentWorld = normalizeWorld(body.currentWorld);
  const currentLanguage = inferRequestedLanguage(messageText, body.currentLanguage);

  if (!userId) {
    return NextResponse.json({ error: "USER_ID_REQUIRED", message: "userId is required." }, { status: 400 });
  }

  if (!messageText) {
    return NextResponse.json({ error: "MESSAGE_TEXT_REQUIRED", message: "messageText is required." }, { status: 400 });
  }

  const fallback = reflectLocally({ messageText, currentWorld, currentLanguage });
  const effectiveWorld = fallback.world;
  let responseText = fallback.replyText;
  let cadence = buildCadence(effectiveWorld);

  try {
    const user =
      (await prisma.user.findUnique({ where: { id: userId } })) ??
      (await prisma.user.create({
        data: {
          id: userId,
          premiumTokens: 3,
        },
      }));

    if (user.premiumTokens === 0) {
      return NextResponse.json(
        {
          error: "PAYWALL_TRIGGERED",
          promptUpsell: true,
          message: "Free reflection limit reached.",
        },
        { status: 200 }
      );
    }

    if (user.premiumTokens > 0) {
      await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: userId },
          data: {
            premiumTokens: {
              decrement: 1,
            },
          },
        });
      });
    }
  } catch (error) {
    console.error("Reflect route token accounting fallback", error);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const world = worlds[effectiveWorld];
    const languageInstruction =
      currentLanguage === "ar"
        ? "Respond in Arabic with natural right-to-left phrasing unless the user explicitly requests another language."
        : "Respond in English with clean left-to-right phrasing unless the user explicitly requests another language.";

    const result = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: messageText,
      config: {
        systemInstruction: [
          "You are FadFada | فضفضة, a premium bilingual wellbeing companion and learning support agent.",
          "You are not therapy, diagnosis, legal advice, financial advice, or emergency care.",
          languageInstruction,
          `Current world: ${world.nameEn} / ${world.nameAr}.`,
          `World tone target: ${world.tone}.`,
          "Adapt persona tone, vocabulary density, rhythm, and literary structure to the current world.",
          "For calm: use soft, grounded reflection and one small next step.",
          "For story: answer in short literary narrative form with concrete imagery and historically specific details when requested.",
          "For faith: use gentle Arabic Naskh-inspired cadence and spiritual reassurance without claiming religious authority.",
          "For poetry: use structured rhyming verses, controlled metaphor, and generous line breaks.",
          "For build: use short action-oriented project tasks, numbered steps, and no decorative language.",
          "For learning: teach as a concise coach, include a micro-plan, and suggest resource types without fabricating inaccessible links.",
          "For grief/stillness: slow down, validate, and recommend nearby trusted people or emergency resources if risk appears.",
          "If the user asks to translate, convert, continue, or reframe the previous message, preserve the subject and world instead of resetting context.",
          "Return strict JSON only. No markdown fences. No prose outside JSON.",
          "JSON shape: { text: string, world: calm|story|faith|build|learning|celebration|grief, emotionalCadence: { speed: slow_reflective|steady_calm|rapid_energetic, typewriterIntervalMs: number, particleVelocity: number } }.",
        ].join("\n"),
        temperature: effectiveWorld === "build" ? 0.35 : 0.72,
        responseMimeType: "application/json",
      },
    });

    const parsed = parseGeminiJson<ReflectGeminiPayload>(result.text || "");
    if (parsed?.text) {
      responseText = ensureDirectionFriendlyText(parsed.text, currentLanguage);
      cadence = normalizeCadence(parsed.emotionalCadence, normalizeWorld(parsed.world) || effectiveWorld);
    }
  } catch (error) {
    console.error("Reflect route Gemini fallback", error);
    responseText = ensureDirectionFriendlyText(fallback.replyText, currentLanguage);
  }

  return NextResponse.json(
    {
      text: responseText,
      world: effectiveWorld,
      emotionalCadence: cadence,
    },
    { status: 200 }
  );
}

function normalizeWorld(world: WorldId | undefined): WorldId {
  return world && world in worlds ? world : "calm";
}

function inferRequestedLanguage(messageText: string | undefined, requestedLanguage: "ar" | "en" | undefined): "ar" | "en" {
  const text = messageText?.toLowerCase() || "";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/\b(arabic|arabiyyah|عربي|العربية|بالعربي|arabic story|arabic poem)\b/i.test(text)) return "ar";
  return requestedLanguage === "ar" ? "ar" : "en";
}

function ensureDirectionFriendlyText(text: string, language: "ar" | "en") {
  if (language === "ar") {
    return text.replace(/\s+([،.؟!])/g, "$1").trim();
  }

  return text.replace(/\s+([,.?!])/g, "$1").trim();
}

function buildCadence(world: WorldId): ReflectGeminiPayload["emotionalCadence"] {
  if (world === "faith" || world === "grief" || world === "story") {
    return { speed: "slow_reflective", typewriterIntervalMs: 45, particleVelocity: 0.18 };
  }

  if (world === "build" || world === "celebration") {
    return { speed: "rapid_energetic", typewriterIntervalMs: 12, particleVelocity: 0.72 };
  }

  return { speed: "steady_calm", typewriterIntervalMs: 28, particleVelocity: 0.34 };
}

function normalizeCadence(value: ReflectGeminiPayload["emotionalCadence"] | undefined, world: WorldId) {
  const fallback = buildCadence(world);
  if (!value) return fallback;

  const speed = value.speed === "slow_reflective" || value.speed === "rapid_energetic" || value.speed === "steady_calm" ? value.speed : fallback.speed;
  return {
    speed,
    typewriterIntervalMs: clampNumber(value.typewriterIntervalMs, fallback.typewriterIntervalMs, 8, 70),
    particleVelocity: clampNumber(value.particleVelocity, fallback.particleVelocity, 0.08, 1.2),
  };
}

function parseGeminiJson<T>(text: string): T | null {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function clampNumber(value: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
