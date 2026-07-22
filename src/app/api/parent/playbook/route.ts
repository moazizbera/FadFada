import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, buildGeographicRegionFromHeaders, requireParentWorkspace, type ChildAgeBand } from "../../../../lib/auth";
import { createGeminiClient, getGeminiModel, isGeminiConfigured } from "../../../../lib/gemini";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type Language = "ar" | "en";
type ParentEnergy = "calm" | "tired" | "stressed" | "angry";

type ParentPlaybookPayload = {
  title: string;
  quickRead: string;
  childLens: string;
  sayThis: string[];
  avoidThis: string[];
  resetSteps: string[];
  playBridge: string;
  boundaryScript: string;
  repairLine: string;
  followUp: string;
  safetyNote: string;
};

type ParsedPlaybookRequest = {
  language: Language;
  childProfileId: string;
  childAgeBand: ChildAgeBand | "unknown";
  parentEnergy: ParentEnergy;
  situation: string;
  goal: string;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const parsed = await parsePlaybookRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const childProfile = parsed.value.childProfileId
    ? await prisma.childProfile.findFirst({ where: { id: parsed.value.childProfileId, parentId: parentContext.userId }, select: { id: true, nickname: true, birthYear: true } })
    : null;

  if (parsed.value.childProfileId && !childProfile) {
    return NextResponse.json({ error: "CHILD_PROFILE_NOT_FOUND" }, { status: 404 });
  }

  const payload = await buildParentPlaybook(parsed.value, childProfile?.nickname || "", request.headers.get("x-vercel-oidc-token"));
  await saveParentPlaybook(parentContext.userId, parsed.value, payload, childProfile?.nickname || "");

  return NextResponse.json({ ...payload, childNickname: childProfile?.nickname || null }, { status: 200 });
}

async function parsePlaybookRequest(request: NextRequest): Promise<
  | { ok: true; value: ParsedPlaybookRequest }
  | { ok: false; error: string; status: number }
> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return { ok: false, error: "INVALID_JSON", status: 400 };

  const language = normalizeLanguage(typeof body.language === "string" ? body.language : "");
  const childProfileId = typeof body.childProfileId === "string" ? body.childProfileId.trim() : "";
  const childAgeBand = normalizeAgeBand(typeof body.childAgeBand === "string" ? body.childAgeBand : "");
  const parentEnergy = normalizeParentEnergy(typeof body.parentEnergy === "string" ? body.parentEnergy : "");
  const situation = cleanInput(body.situation, 1400);
  const goal = cleanInput(body.goal, 500);

  if (childProfileId && !isUuid(childProfileId)) return { ok: false, error: "INVALID_CHILD_PROFILE", status: 400 };
  if (!situation || situation.length < 8) return { ok: false, error: "SITUATION_REQUIRED", status: 400 };

  return { ok: true, value: { language, childProfileId, childAgeBand, parentEnergy, situation, goal } };
}

async function buildParentPlaybook(request: ParsedPlaybookRequest, childNickname: string, oidcToken?: string | null): Promise<ParentPlaybookPayload> {
  const fallback = buildFallbackPlaybook(request, childNickname);
  if (!isGeminiConfigured()) return fallback;

  try {
    const ai = createGeminiClient(oidcToken);
    const result = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: [{ role: "user", parts: [{ text: buildPlaybookPrompt(request, childNickname) }] }],
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        systemInstruction: [
          "You are FadFada's parent playbook coach.",
          "Turn a parent's real situation into a practical, kind, short plan they can use today.",
          "Do not diagnose the child or parent. Do not shame, threaten, or recommend harsh punishment.",
          "Use connection plus boundaries: warmth first, clear limit second, repair after.",
          "If there is violence, self-harm, abuse, or immediate danger, advise contacting local emergency/professional support.",
          "Return strict JSON only. No markdown fences. No extra text.",
        ].join("\n"),
      },
    });

    const parsed = parseGeminiJson<ParentPlaybookPayload>(result.text || "");
    return normalizePlaybookPayload(parsed, fallback);
  } catch (error) {
    console.error("Parent playbook fallback", error);
    return fallback;
  }
}

function buildPlaybookPrompt(request: ParsedPlaybookRequest, childNickname: string) {
  const isArabic = request.language === "ar";
  return JSON.stringify({
    input: {
      language: request.language,
      childNickname: childNickname || "not supplied",
      childAgeBand: request.childAgeBand,
      parentEnergy: request.parentEnergy,
      situation: request.situation,
      parentGoal: request.goal || "Help the parent respond calmly and keep connection.",
    },
    outputRules: {
      language: isArabic ? "Arabic only, simple warm Arabic." : "English only.",
      tone: "practical, non-judgmental, parent-friendly, immediately usable",
      length: "short lines; no long lectures",
      sayThis: "3 short phrases the parent can say out loud",
      avoidThis: "3 common reactions to avoid, written gently",
      resetSteps: "4 steps, each under 12 words",
      safety: "Include a short safety note when professional help is needed.",
    },
    schema: {
      title: "short name for the plan",
      quickRead: "one sentence summary",
      childLens: "what may be happening for the child without diagnosis",
      sayThis: ["phrase 1", "phrase 2", "phrase 3"],
      avoidThis: ["avoid 1", "avoid 2", "avoid 3"],
      resetSteps: ["step 1", "step 2", "step 3", "step 4"],
      playBridge: "one tiny playful connection activity",
      boundaryScript: "warm limit sentence",
      repairLine: "what parent can say after losing patience",
      followUp: "what to do later today or tomorrow",
      safetyNote: "when to seek professional/emergency help",
    },
  });
}

async function saveParentPlaybook(parentId: string, request: ParsedPlaybookRequest, payload: ParentPlaybookPayload, childNickname: string) {
  try {
    const headerStore = await headers();
    await prisma.interactionEvent.create({
      data: {
        userId: parentId,
        eventType: "parent_playbook",
        geographicRegion: buildGeographicRegionFromHeaders(headerStore),
        metadataJson: buildParentPlaybookMetadataJson(request, payload, childNickname),
      },
    });
  } catch (error) {
    console.error("Parent playbook save fallback", error);
  }
}

function buildParentPlaybookMetadataJson(request: ParsedPlaybookRequest, payload: ParentPlaybookPayload, childNickname: string) {
  const compactPayload: ParentPlaybookPayload = {
    title: payload.title.slice(0, 180),
    quickRead: payload.quickRead.slice(0, 320),
    childLens: payload.childLens.slice(0, 320),
    sayThis: payload.sayThis.slice(0, 3).map((line) => line.slice(0, 180)),
    avoidThis: payload.avoidThis.slice(0, 3).map((line) => line.slice(0, 180)),
    resetSteps: payload.resetSteps.slice(0, 4).map((line) => line.slice(0, 140)),
    playBridge: payload.playBridge.slice(0, 220),
    boundaryScript: payload.boundaryScript.slice(0, 240),
    repairLine: payload.repairLine.slice(0, 220),
    followUp: payload.followUp.slice(0, 260),
    safetyNote: payload.safetyNote.slice(0, 260),
  };

  const metadata = {
    childProfileId: request.childProfileId || null,
    childNickname: childNickname || null,
    language: request.language,
    childAgeBand: request.childAgeBand,
    parentEnergy: request.parentEnergy,
    situation: request.situation.slice(0, 500),
    goal: request.goal.slice(0, 300),
    playbook: compactPayload,
    createdAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(metadata);
  if (serialized.length <= 7000) return serialized;

  return JSON.stringify({
    childProfileId: request.childProfileId || null,
    childNickname: childNickname || null,
    language: request.language,
    childAgeBand: request.childAgeBand,
    parentEnergy: request.parentEnergy,
    situation: request.situation.slice(0, 260),
    goal: request.goal.slice(0, 180),
    playbook: {
      title: compactPayload.title,
      quickRead: compactPayload.quickRead,
      resetSteps: compactPayload.resetSteps,
      safetyNote: compactPayload.safetyNote,
    },
    createdAt: new Date().toISOString(),
  });
}

function buildFallbackPlaybook(request: ParsedPlaybookRequest, childNickname: string): ParentPlaybookPayload {
  const isArabic = request.language === "ar";
  const name = childNickname || (isArabic ? "طفلك" : "your child");

  if (isArabic) {
    return {
      title: "خطة هدوء من ٥ دقائق",
      quickRead: `ابدأ بالتهدئة مع ${name}، ثم ضع حدًا واضحًا وخطوة صغيرة قابلة للتنفيذ.`,
      childLens: "قد يكون الطفل مرهقًا أو محتاجًا للشعور بالسيطرة قبل أن يسمع التوجيه.",
      sayThis: ["أنا معك، وسنحلها خطوة خطوة.", "أفهم أنك لا تريد هذا الآن.", "الحد واضح، وسأساعدك تبدأ بأصغر خطوة."],
      avoidThis: ["محاضرة طويلة وقت الانفعال.", "مقارنة الطفل بغيره.", "تهديد كبير لا يمكن تنفيذه."],
      resetSteps: ["اخفض صوتك أولاً.", "سمّ الشعور بجملة واحدة.", "اعرض اختيارين مقبولين.", "ابدأ بخطوة دقيقة."],
      playBridge: "اجعل البداية سباقًا هادئًا: من يجهز أول خطوة خلال عشر عدات؟",
      boundaryScript: "أحبك، ولن أترك الصراخ يقود البيت. سنبدأ بخطوة واحدة الآن.",
      repairLine: "آسف أن صوتي ارتفع. سأحاول من جديد بهدوء.",
      followUp: "بعد أن يهدأ الجو، اسأل: ما الشيء الذي يساعدك نبدأ أسرع المرة القادمة؟",
      safetyNote: "إذا كان هناك خطر جسدي أو خوف شديد أو إيذاء للنفس، اطلب دعمًا مهنيًا أو طارئًا فورًا.",
    };
  }

  return {
    title: "5-minute calm playbook",
    quickRead: `Start by regulating with ${name}, then set one clear limit and one tiny next step.`,
    childLens: "Your child may be overloaded or needing some control before they can hear direction.",
    sayThis: ["I am with you. We will do this one step at a time.", "I hear that you do not want this right now.", "The limit is clear, and I will help you start small."],
    avoidThis: ["A long lecture during the heat of the moment.", "Comparing your child with someone else.", "A big threat you cannot calmly follow through on."],
    resetSteps: ["Lower your voice first.", "Name the feeling once.", "Offer two acceptable choices.", "Begin with a one-minute step."],
    playBridge: "Make the first step a calm race: can we start before ten slow counts?",
    boundaryScript: "I love you, and I will not let shouting lead the house. We are starting with one step now.",
    repairLine: "I am sorry my voice got big. I am going to try again calmly.",
    followUp: "Later, ask: what would help us start faster next time?",
    safetyNote: "If there is physical danger, intense fear, or self-harm risk, contact local emergency or professional support immediately.",
  };
}

function normalizePlaybookPayload(payload: ParentPlaybookPayload | null, fallback: ParentPlaybookPayload): ParentPlaybookPayload {
  if (!payload) return fallback;
  return {
    title: cleanOutput(payload.title, fallback.title),
    quickRead: cleanOutput(payload.quickRead, fallback.quickRead),
    childLens: cleanOutput(payload.childLens, fallback.childLens),
    sayThis: cleanList(payload.sayThis, fallback.sayThis, 3),
    avoidThis: cleanList(payload.avoidThis, fallback.avoidThis, 3),
    resetSteps: cleanList(payload.resetSteps, fallback.resetSteps, 4),
    playBridge: cleanOutput(payload.playBridge, fallback.playBridge),
    boundaryScript: cleanOutput(payload.boundaryScript, fallback.boundaryScript),
    repairLine: cleanOutput(payload.repairLine, fallback.repairLine),
    followUp: cleanOutput(payload.followUp, fallback.followUp),
    safetyNote: cleanOutput(payload.safetyNote, fallback.safetyNote),
  };
}

function normalizeLanguage(value: string): Language {
  return value?.trim().toLowerCase() === "en" ? "en" : "ar";
}

function normalizeAgeBand(value: string): ChildAgeBand | "unknown" {
  return value === "under_8" || value === "8_to_10" || value === "11_to_12" || value === "13_plus" ? value : "unknown";
}

function normalizeParentEnergy(value: string): ParentEnergy {
  return value === "tired" || value === "stressed" || value === "angry" ? value : "calm";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanInput(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanOutput(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 700) : fallback;
}

function cleanList(value: unknown, fallback: string[], maxItems: number) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, maxItems).map((item) => item.trim().slice(0, 220))
    : fallback;
}

function parseGeminiJson<T>(value: string): T | null {
  const text = value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
