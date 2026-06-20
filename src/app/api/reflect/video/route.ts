export const runtime = "nodejs";

import { GoogleGenAI, type Part } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { worlds, type WorldId } from "../../../../lib/worlds";

const VIDEO_REFLECTION_CREDIT_COST = 2;
const MAX_INLINE_VIDEO_BYTES = 22 * 1024 * 1024;

type Language = "ar" | "en";
type TypingCadenceSpeed = "slow_reflective" | "steady_calm" | "rapid_energetic";
type RecommendedWorld = "calm" | "story" | "poetry" | "faith" | "build" | "celebration";

type VideoMomentRequest = {
  userId?: string;
  currentWorld?: RecommendedWorld | WorldId;
  currentLanguage?: Language;
  videoBase64?: string;
  mimeType?: string;
  transcriptHint?: string;
};

type VideoOrchestrationPayload = {
  detectedState: {
    primaryEmotion: string;
    environmentalStressors: string[];
    intensityScore: number;
  };
  uiConfiguration: {
    recommendedWorld: RecommendedWorld;
    typingCadenceSpeed: TypingCadenceSpeed;
    particleVelocityMultiplier: number;
  };
  responseContent: {
    language: Language;
    replyText: string;
    microNextStep: string;
  };
};

type PaywallResponse = {
  error: "PAYWALL_TRIGGERED";
  promptUpsell: true;
  message: string;
  creditsRequired: number;
};

type ParsedVideoRequest = {
  userId: string;
  currentWorld: RecommendedWorld;
  currentLanguage: Language;
  videoBase64: string;
  mimeType: string;
  transcriptHint?: string;
};

export async function POST(request: NextRequest) {
  const parsed = await parseVideoMomentRequest(request);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { userId, currentWorld, currentLanguage, videoBase64, mimeType, transcriptHint } = parsed.value;
  const billing = await chargeVideoCredits(userId);

  if (!billing.ok) {
    return NextResponse.json(billing.response, { status: 200 });
  }

  const payload = await analyzeVideoMoment({
    currentLanguage,
    currentWorld,
    mimeType,
    transcriptHint,
    videoBase64,
  });

  return NextResponse.json(payload, { status: 200 });
}

async function parseVideoMomentRequest(request: NextRequest): Promise<
  | { ok: true; value: ParsedVideoRequest }
  | { ok: false; error: string; status: number }
> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const userId = readFormString(form, "userId");
    const currentWorld = normalizeRecommendedWorld(readFormString(form, "currentWorld"));
    const currentLanguage = normalizeLanguage(readFormString(form, "currentLanguage"));
    const transcriptHint = readFormString(form, "transcriptHint");
    const video = form.get("video");

    if (!userId) return { ok: false, error: "USER_ID_REQUIRED", status: 400 };
    if (!(video instanceof File)) return { ok: false, error: "VIDEO_FILE_REQUIRED", status: 400 };
    if (!video.type.startsWith("video/") && !video.type.startsWith("audio/")) return { ok: false, error: "UNSUPPORTED_MEDIA_TYPE", status: 415 };
    if (video.size > MAX_INLINE_VIDEO_BYTES) return { ok: false, error: "VIDEO_TOO_LARGE", status: 413 };

    const bytes = new Uint8Array(await video.arrayBuffer());
    return {
      ok: true,
      value: {
        userId,
        currentWorld,
        currentLanguage,
        mimeType: video.type,
        videoBase64: uint8ArrayToBase64(bytes),
        transcriptHint,
      },
    };
  }

  let body: VideoMomentRequest;
  try {
    body = (await request.json()) as VideoMomentRequest;
  } catch {
    return { ok: false, error: "INVALID_JSON", status: 400 };
  }

  const userId = body.userId?.trim();
  const videoBase64 = sanitizeBase64(body.videoBase64 || "");
  const mimeType = body.mimeType?.trim() || "video/mp4";

  if (!userId) return { ok: false, error: "USER_ID_REQUIRED", status: 400 };
  if (!videoBase64) return { ok: false, error: "VIDEO_BASE64_REQUIRED", status: 400 };
  if (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/")) return { ok: false, error: "UNSUPPORTED_MEDIA_TYPE", status: 415 };
  if (base64ByteLength(videoBase64) > MAX_INLINE_VIDEO_BYTES) return { ok: false, error: "VIDEO_TOO_LARGE", status: 413 };

  return {
    ok: true,
    value: {
      userId,
      currentWorld: normalizeRecommendedWorld(body.currentWorld),
      currentLanguage: normalizeLanguage(body.currentLanguage),
      mimeType,
      videoBase64,
      transcriptHint: body.transcriptHint?.trim(),
    },
  };
}

async function chargeVideoCredits(userId: string): Promise<{ ok: true } | { ok: false; response: PaywallResponse }> {
  try {
    const user =
      (await prisma.user.findUnique({ where: { id: userId } })) ??
      (await prisma.user.create({
        data: {
          id: userId,
             tokenBalance: 3,
        },
      }));

      if (user.tokenBalance < VIDEO_REFLECTION_CREDIT_COST) {
      return {
        ok: false,
        response: {
          error: "PAYWALL_TRIGGERED",
          promptUpsell: true,
          message: "Video moment analysis requires 2 premium credits.",
          creditsRequired: VIDEO_REFLECTION_CREDIT_COST,
        },
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
          tokenBalance: {
          decrement: VIDEO_REFLECTION_CREDIT_COST,
        },
      },
    });
  } catch (error) {
    console.error("Video moment token accounting fallback", error);
  }

  return { ok: true };
}

async function analyzeVideoMoment({
  currentLanguage,
  currentWorld,
  mimeType,
  transcriptHint,
  videoBase64,
}: {
  currentLanguage: Language;
  currentWorld: RecommendedWorld;
  mimeType: string;
  transcriptHint?: string;
  videoBase64: string;
}): Promise<VideoOrchestrationPayload> {
  const fallback = buildFallbackPayload(currentWorld, currentLanguage, transcriptHint);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const promptPart: Part = {
      text: buildAnalysisPrompt({ currentLanguage, currentWorld, transcriptHint }),
    };
    const videoPart: Part = {
      inlineData: {
        data: videoBase64,
        mimeType,
      },
    };

    const result = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: [
        {
          role: "user",
          parts: [promptPart, videoPart],
        },
      ],
      config: {
        temperature: 0.34,
        responseMimeType: "application/json",
        systemInstruction: [
          "You are an advanced, non-clinical Multi-Modal Emotional Analysis Agent inside FadFada | فضفضة billing infrastructure.",
          "Ingest the combined video/audio file chunk and transcript hint, then evaluate emotional state and physical environment context.",
          "Environment extraction: identify up to 3 physical stressors from background scenery, lighting, clutter, movement, posture, commute context, or visible work setting.",
          "Emotional velocity calculation: classify cadence exactly as slow_reflective, steady_calm, or rapid_energetic.",
          "Cultural tone alignment: if Arabic, use clear modern comforting Arabic with warm dialect cues, never stiff classical phrasing.",
          "Do not diagnose conditions, infer protected traits, or claim certainty about micro-expressions. Use observational language.",
          "Return ONLY a minified valid JSON object matching the requested schema. No markdown fences. No introduction. No trailing explanation.",
        ].join("\n"),
      },
    });

    const parsed = parseGeminiJson<VideoOrchestrationPayload>(result.text || "");
    if (!parsed) {
      return fallback;
    }

    return normalizePayload(parsed, currentWorld, currentLanguage);
  } catch (error) {
    console.error("Video orchestration fallback", error);
    return fallback;
  }
}

function buildAnalysisPrompt({
  currentLanguage,
  currentWorld,
  transcriptHint,
}: {
  currentLanguage: Language;
  currentWorld: RecommendedWorld;
  transcriptHint?: string;
}) {
  return JSON.stringify({
    inputDataMatrix: {
      videoFrameData: "Inspect facial expression signals, posture, body language, physical background, low lighting, background movement, commute/transit cues, clutter, and work-surface stressors.",
      audioTrackTranscript: transcriptHint || "No transcript hint supplied. Use any audible speech available in the uploaded media.",
    },
    analysisInstructions: {
      environmentExtraction: "Identify up to 3 physical stressors present in the visual background scenery.",
      emotionalVelocityCalculation: "Classify typing speed as slow_reflective, steady_calm, or rapid_energetic.",
      culturalToneAlignment: "Match the active Conversation World. Arabic should feel clear, modern, comforting, and lightly dialect-aware without sounding overly formal.",
    },
    activeConversationWorld: currentWorld,
    inputLanguage: currentLanguage,
    worldTone: getWorldTone(currentWorld),
    jsonOutputConstraint: "Return only minified valid JSON with this exact schema and no extra keys.",
    schemaTemplate: {
      detectedState: {
        primaryEmotion: "string",
        environmentalStressors: ["string"],
        intensityScore: 0.0,
      },
      uiConfiguration: {
        recommendedWorld: "calm | story | poetry | faith | build | celebration",
        typingCadenceSpeed: "slow_reflective | steady_calm | rapid_energetic",
        particleVelocityMultiplier: 1.5,
      },
      responseContent: {
        language: "ar | en",
        replyText: "The complete empathetic typewriter-ready text response string goes here.",
        microNextStep: "A single, highly tactical action choice for the user.",
      },
    },
  });
}

function buildFallbackPayload(world: RecommendedWorld, language: Language, transcriptHint?: string): VideoOrchestrationPayload {
  const isArabic = language === "ar";
  const cadence = cadenceForWorld(world);
  const intensityScore = transcriptHint && /overwhelmed|panic|can't|مش قادر|مخنوق|قلقان|توتر/i.test(transcriptHint) ? 0.74 : 0.58;

  return {
    detectedState: {
      primaryEmotion: isArabic ? "ضغط محتاج تهدئة وتنظيم" : "pressure seeking calm and structure",
      environmentalStressors: isArabic
        ? ["ازدحام بصري محتمل", "إضاءة أو حركة قد تزيد التوتر", "إشارات إرهاق في المساحة المحيطة"]
        : ["possible visual clutter", "lighting or movement that may increase tension", "fatigue cues in the surrounding space"],
      intensityScore,
    },
    uiConfiguration: {
      recommendedWorld: world,
      typingCadenceSpeed: cadence,
      particleVelocityMultiplier: particleVelocityForCadence(cadence),
    },
    responseContent: {
      language,
      replyText: isArabic
        ? "حاسس إن اللحظة دي ضاغطة ومليانة تفاصيل بتشد انتباهك من كل ناحية. خلينا نصغرها: مش مطلوب منك تصلح كل حاجة دلوقتي. خد نفس هادي، بص على أقرب نقطة ثابتة قدامك، واختار حاجة واحدة بس نرجع بيها الإحساس للسيطرة."
        : "This moment feels pressured and full of details pulling your attention in different directions. Let's make it smaller: you do not need to fix everything right now. Take one steady breath, look at the nearest still point, and choose one thing that gives you back a little control.",
      microNextStep: isArabic ? "لمدة دقيقتين فقط: رتّب أو سمّي أقرب شيء واحد مضايقك في المكان." : "For two minutes only: clear or name the one nearest thing in the space that is bothering you.",
    },
  };
}

function normalizePayload(payload: VideoOrchestrationPayload, fallbackWorld: RecommendedWorld, fallbackLanguage: Language): VideoOrchestrationPayload {
  const world = normalizeRecommendedWorld(payload.uiConfiguration?.recommendedWorld || fallbackWorld);
  const cadence = normalizeCadence(payload.uiConfiguration?.typingCadenceSpeed || cadenceForWorld(world));
  const language = payload.responseContent?.language === "ar" || payload.responseContent?.language === "en" ? payload.responseContent.language : fallbackLanguage;

  return {
    detectedState: {
      primaryEmotion: normalizeText(payload.detectedState?.primaryEmotion, language === "ar" ? "ضغط يحتاج احتواء" : "pressure needing support"),
      environmentalStressors: normalizeStressors(payload.detectedState?.environmentalStressors, language),
      intensityScore: clampNumber(payload.detectedState?.intensityScore, 0.5, 0, 1),
    },
    uiConfiguration: {
      recommendedWorld: world,
      typingCadenceSpeed: cadence,
      particleVelocityMultiplier: clampNumber(payload.uiConfiguration?.particleVelocityMultiplier, particleVelocityForCadence(cadence), 0.4, 2.4),
    },
    responseContent: {
      language,
      replyText: normalizeText(payload.responseContent?.replyText, language === "ar" ? "أنا معاك. خلينا نبطّأ اللحظة ونختار خطوة واحدة واضحة." : "I am with you. Let's slow the moment down and choose one clear step."),
      microNextStep: normalizeText(payload.responseContent?.microNextStep, language === "ar" ? "خذ نفسا بطيئا واختر شيئا واحدا فقط تبدأ به." : "Take one slow breath and choose only one thing to start with."),
    },
  };
}

function normalizeStressors(value: string[] | undefined, language: Language) {
  if (!Array.isArray(value)) {
    return language === "ar" ? ["إشارات ضغط في البيئة المحيطة"] : ["stress cues in the surrounding environment"];
  }

  const stressors = value.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  if (stressors.length > 0) return stressors;
  return language === "ar" ? ["إشارات ضغط في البيئة المحيطة"] : ["stress cues in the surrounding environment"];
}

function normalizeText(value: string | undefined, fallback: string) {
  const text = value?.trim();
  return text || fallback;
}

function normalizeRecommendedWorld(value: string | undefined | null): RecommendedWorld {
  if (value === "calm" || value === "story" || value === "poetry" || value === "faith" || value === "build" || value === "celebration") {
    return value;
  }

  if (value === "learning") return "build";
  if (value === "grief") return "calm";
  return "calm";
}

function normalizeLanguage(value: string | undefined | null): Language {
  return value === "ar" ? "ar" : "en";
}

function normalizeCadence(value: string): TypingCadenceSpeed {
  if (value === "slow_reflective" || value === "rapid_energetic" || value === "steady_calm") {
    return value;
  }
  return "steady_calm";
}

function cadenceForWorld(world: RecommendedWorld): TypingCadenceSpeed {
  if (world === "faith" || world === "story" || world === "poetry") return "slow_reflective";
  if (world === "build" || world === "celebration") return "rapid_energetic";
  return "steady_calm";
}

function particleVelocityForCadence(cadence: TypingCadenceSpeed) {
  if (cadence === "slow_reflective") return 0.7;
  if (cadence === "rapid_energetic") return 1.8;
  return 1.15;
}

function getWorldTone(world: RecommendedWorld) {
  if (world === "poetry") return "lyrical but clear, emotionally precise, warm modern Arabic or English";
  const mappedWorld: WorldId = world === "calm" || world === "story" || world === "faith" || world === "build" || world === "celebration" ? world : "calm";
  return worlds[mappedWorld].tone;
}

function parseGeminiJson<T>(text: string): T | null {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function sanitizeBase64(value: string) {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(",");
  return commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
}

function base64ByteLength(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function readFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : undefined;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
