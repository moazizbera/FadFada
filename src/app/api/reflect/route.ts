export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createGeminiClient, getGeminiModel, getGeminiProvider, isGeminiConfigured } from "../../../lib/gemini";
import { hasLifetimePlusAccess } from "../../../lib/lifetimeAccess";
import { reflectLocally, type ReflectInput } from "../../../lib/localReflect";
import { prisma } from "../../../lib/prisma";
import { worlds, type WorldId } from "../../../lib/worlds";

type ReflectRequestBody = {
  userId?: string;
  messageText?: string;
  userDisplayName?: string | null;
  currentWorld?: WorldId;
  currentLanguage?: "ar" | "en";
  personaSystemPrompt?: string;
  behaviorStyle?: "signature" | "deep" | "coach" | "quick";
  softerMode?: boolean;
  recentMessages?: Array<{
    role?: "user" | "assistant";
    text?: string;
    world?: WorldId;
    language?: "ar" | "en";
  }>;
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

type ReflectResource = {
  title: string;
  type: "video" | "article" | "document";
  url: string;
  summary: string;
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
  const userDisplayName = normalizeUserDisplayName(body.userDisplayName);
  const currentWorld = normalizeWorld(body.currentWorld);
  const currentLanguage = inferRequestedLanguage(messageText, body.currentLanguage);
  const behaviorStyle = normalizeBehaviorStyle(body.behaviorStyle);
  const softerMode = body.softerMode === true;
  const personaSystemPrompt = typeof body.personaSystemPrompt === "string" && body.personaSystemPrompt.trim().length > 0
    ? body.personaSystemPrompt.trim()
    : null;

  if (!userId) {
    return NextResponse.json({ error: "USER_ID_REQUIRED", message: "userId is required." }, { status: 400 });
  }

  if (!messageText) {
    return NextResponse.json({ error: "MESSAGE_TEXT_REQUIRED", message: "messageText is required." }, { status: 400 });
  }

  const isDailyPulseRequest = /^(Daily check-in:|تسجيل يومي:)/i.test(messageText);
  const recentMessages = normalizeRecentMessages(body.recentMessages);
  const isProductFeedbackRequest = isFadFadaProductFeedbackRequest(messageText, recentMessages);
  const fallback = reflectLocally({ messageText, currentWorld, currentLanguage, recentMessages, behaviorStyle, softerMode });
  const effectiveWorld = isDailyPulseRequest ? currentWorld : fallback.world;
  let responseText = fallback.replyText;
  let cadence = buildCadence(effectiveWorld);
  let responseSource: "gemini" | "fallback" = "fallback";
  let aiStatus = "not_attempted";
  const geminiDisabled = process.env.GEMINI_DISABLED === "true";

  if (geminiDisabled) {
    return NextResponse.json(
      {
        text: ensureDirectionFriendlyText(responseText, currentLanguage),
        world: effectiveWorld,
        emotionalCadence: cadence,
        source: responseSource,
        aiStatus: "gemini_disabled",
      },
      { status: 200 }
    );
  }

  try {
    const user =
      (await prisma.user.findUnique({ where: { id: userId } })) ??
      (await prisma.user.create({
        data: {
          id: userId,
          tokenBalance: userId.startsWith("visitor:") ? 5 : 15,
        },
      }));

    const hasUnlimitedAccess = user.activeTier === "PLUS" || hasLifetimePlusAccess(user.email);
    const reflectionMeteringEnabled = process.env.FADFADA_ENABLE_REFLECTION_METERING === "true" && !hasUnlimitedAccess;

    if (reflectionMeteringEnabled && user.tokenBalance === 0) {
      return NextResponse.json(
        {
          error: "PAYWALL_TRIGGERED",
          promptUpsell: true,
          message: "Free reflection limit reached.",
        },
        { status: 200 }
      );
    }

    if (reflectionMeteringEnabled && user.tokenBalance > 0) {
      await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: userId },
          data: {
            tokenBalance: {
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
    if (!isGeminiConfigured()) {
      aiStatus = getGeminiProvider() === "vertex" ? "missing_vertex_config" : "missing_api_key";
      throw new Error("Gemini provider is not configured.");
    }

    aiStatus = "requesting_gemini";
    const ai = createGeminiClient(request.headers.get("x-vercel-oidc-token"));
    const world = worlds[effectiveWorld];
    const languageInstruction =
      currentLanguage === "ar"
        ? "Respond only in Arabic with natural right-to-left phrasing unless the user explicitly requests translation. Do not include English greetings, labels, fillers, or transliterated English words."
        : "Respond only in English with clean left-to-right phrasing unless the user explicitly requests translation. Do not include Arabic greetings, labels, fillers, or transliterated Arabic words.";

    const result = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: JSON.stringify({
        currentMessage: messageText,
        recentMessages,
      }),
      config: {
        systemInstruction: [
          "You are FadFada | فضفضة, a premium bilingual wellbeing companion and learning support agent.",
          isProductFeedbackRequest
            ? "The user is asking about FadFada as a product, app, or support experience. Answer as a candid product advisor, not as a therapeutic mirror. Be direct, specific, and useful: name what is missing, what already works, and the next product improvements. If the user says 'miss' in this context, interpret it as 'missing from the product', not longing or nostalgia. Do not end by only asking how it feels."
            : null,
          personaSystemPrompt
            ? `COMPANION PERSONA IDENTITY:\n${personaSystemPrompt}\nStay in this persona's voice, but do not let persona warmth override direct answers to product, factual, learning, or build questions.`
            : null,
          userDisplayName
            ? `Known user display name: ${userDisplayName}. If the user greets you, starts a new chat, or asks for a simple welcome, address them naturally by this name. Do not repeat the name in every reply.`
            : null,
          "You are not therapy, diagnosis, legal advice, financial advice, or emergency care.",
          languageInstruction,
          `Current world: ${world.nameEn} / ${world.nameAr}.`,
          `World tone target: ${world.tone}.`,
          buildBehaviorInstruction(behaviorStyle, softerMode),
          "Respect the active language above every persona accent. A screen must not mix Arabic and English unless the user explicitly asks to translate or compare languages.",
          "Adapt your persona tone, vocabulary, rhythm, and literary style to both the active companion identity and the current world.",
          "For calm: use soft, grounded reflection and one small next step.",
          "For story: answer in short literary narrative form with concrete imagery and historically specific details when requested.",
          "For faith: use gentle Arabic Naskh-inspired cadence and spiritual reassurance without claiming religious authority.",
          "For poetry: use structured rhyming verses, controlled metaphor, and generous line breaks.",
          "For build: use short action-oriented project tasks, numbered steps, and no decorative language.",
          "For learning: teach as a concise coach, include a micro-plan, and suggest resource types without fabricating inaccessible links.",
          "For grief/stillness: slow down, validate, and recommend nearby trusted people or emergency resources if risk appears.",
          "If the current message starts with 'Daily check-in:' or 'تسجيل يومي:', preserve the current world unless the user expresses urgent safety risk. Treat mood and energy as reflection context, not as a request to switch topics.",
          "If the user asks to translate, convert, continue, or reframe the previous message, preserve the subject and world instead of resetting context.",
          "Return strict JSON only. No markdown fences. No prose outside JSON.",
          "JSON shape: { text: string, world: calm|story|faith|build|learning|celebration|grief, emotionalCadence: { speed: slow_reflective|steady_calm|rapid_energetic, typewriterIntervalMs: number, particleVelocity: number } }.",
        ].filter(Boolean).join("\n"),
        temperature: effectiveWorld === "build" ? 0.35 : 0.72,
        responseMimeType: "application/json",
      },
    });

    const generatedText = result.text?.trim() || "";
    const parsed = parseGeminiJson<ReflectGeminiPayload>(generatedText);
    if (parsed?.text) {
      const responseWorld = isDailyPulseRequest ? effectiveWorld : normalizeWorld(parsed.world) || effectiveWorld;
      responseText = ensureDirectionFriendlyText(parsed.text, currentLanguage);
      cadence = normalizeCadence(parsed.emotionalCadence, responseWorld);
      responseSource = "gemini";
      aiStatus = "gemini_json";
    } else if (generatedText) {
      console.warn("Reflect route Gemini returned non-JSON text", generatedText.slice(0, 240));
      responseText = ensureDirectionFriendlyText(generatedText, currentLanguage);
      responseSource = "gemini";
      aiStatus = "gemini_text";
    } else {
      console.warn("Reflect route Gemini returned empty text");
      aiStatus = "empty_gemini_text";
    }
  } catch (error) {
    console.error("Reflect route Gemini fallback", error);
    aiStatus = getGeminiErrorStatus(error);
    responseText = ensureDirectionFriendlyText(fallback.replyText, currentLanguage);
  }

  return NextResponse.json(
    {
      text: responseText,
      world: effectiveWorld,
      emotionalCadence: cadence,
      resources: normalizeResources(fallback.resources),
      source: responseSource,
      aiStatus,
    },
    { status: 200 }
  );
}

function normalizeWorld(world: WorldId | undefined): WorldId {
  return world && world in worlds ? world : "calm";
}

function normalizeUserDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const cleanedName = value.replace(/[<>()[\]{}]/g, "").replace(/\s+/g, " ").trim();
  return cleanedName ? cleanedName.slice(0, 32) : null;
}

function normalizeBehaviorStyle(style: ReflectRequestBody["behaviorStyle"]) {
  return style === "deep" || style === "coach" || style === "quick" ? style : "signature";
}

function buildBehaviorInstruction(style: ReturnType<typeof normalizeBehaviorStyle>, softerMode: boolean) {
  const styleInstruction = {
    signature: "Behavior style: original FadFada. Warm, Arabic-first when appropriate, emotionally precise, and ends with one small next step.",
    deep: "Behavior style: deeper reflective AI. Name the emotional layers, meaning, and hidden pressure gently before offering one small step.",
    coach: "Behavior style: action-oriented AI. Be decisive, structured, low-fluff, and turn the feeling into a short practical sequence.",
    quick: "Behavior style: fast concise AI. Use the fewest warm words possible, then one concrete next step.",
  }[style];

  return softerMode
    ? `${styleInstruction}\nThe user asked for a softer next response. Make this reply gentler, shorter, less intense, and slower-paced.`
    : styleInstruction;
}

function normalizeResources(resources: ReflectResource[] | undefined) {
  if (!resources?.length) return undefined;

  return resources.slice(0, 3).map((resource) => ({
    title: resource.title.slice(0, 90),
    type: resource.type,
    url: resource.url,
    summary: resource.summary.slice(0, 220),
  }));
}

function inferRequestedLanguage(messageText: string | undefined, requestedLanguage: "ar" | "en" | undefined): "ar" | "en" {
  const text = messageText?.toLowerCase() || "";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/\b(arabic|arabiyyah|عربي|العربية|بالعربي|arabic story|arabic poem)\b/i.test(text)) return "ar";
  return requestedLanguage === "ar" ? "ar" : "en";
}

function normalizeRecentMessages(messages: ReflectRequestBody["recentMessages"]): NonNullable<ReflectInput["recentMessages"]> {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message): NonNullable<ReflectInput["recentMessages"]>[number] => ({
      role: message.role === "assistant" ? "assistant" : "user",
      text: typeof message.text === "string" ? message.text.trim().slice(0, 1200) : "",
      world: normalizeWorld(message.world),
      language: message.language === "ar" ? "ar" : "en",
    }))
    .filter((message) => message.text.length > 0)
    .slice(-8);
}

function isFadFadaProductFeedbackRequest(messageText: string, recentMessages: NonNullable<ReflectInput["recentMessages"]>) {
  const currentText = messageText.toLowerCase();
  const recentUserText = recentMessages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.text.toLowerCase())
    .join("\n");
  const contextText = `${recentUserText}\n${currentText}`;
  const mentionsFadFada = /fadfada|fad fada|فضفضة|فضفضه/.test(contextText);
  const asksForProductJudgment = /\b(opinion|feedback|review|improve|improvement|missing|miss|amazing support|better support|product|app|feature|features|ux|experience)\b|ناقص|ينقص|رأيك|رايك|تحسين|يحسن|أفضل|افضل/.test(contextText);

  return mentionsFadFada && asksForProductJudgment;
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

function getGeminiErrorStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error && typeof error.status === "number") {
    return `gemini_error_${error.status}`;
  }

  if (error instanceof Error && error.message === "Gemini API key is missing.") {
    return "missing_api_key";
  }

  return "gemini_error";
}
