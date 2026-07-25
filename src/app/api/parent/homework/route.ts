import type { Part } from "@google/genai";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, buildGeographicRegionFromHeaders, requireParentWorkspace, type ChildAgeBand } from "../../../../lib/auth";
import { createGeminiClient, getGeminiModel, isGeminiConfigured } from "../../../../lib/gemini";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const MAX_HOMEWORK_IMAGE_BYTES = 8 * 1024 * 1024;
const supportedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type Language = "ar" | "en";
type HomeworkActivityType = "quiz" | "trace" | "match" | "story" | "challenge";

type HomeworkActivity = {
  type: HomeworkActivityType;
  title: string;
  prompt: string;
  hint: string;
  answer: string;
  choices?: string[];
  visual?: HomeworkActivityVisual;
};

type HomeworkActivityVisual = {
  kind: "stars" | "circles" | "triangles" | "squares" | "letters" | "numbers" | "mixed";
  count?: number;
  label?: string;
};

type HomeworkPayload = {
  subject: "math" | "english" | "arabic" | "kg" | "mixed";
  detectedTask: string;
  parentSummary: string;
  childIntro: string;
  activities: HomeworkActivity[];
  safetyNote: string;
};

type ParsedHomeworkRequest = {
  language: Language;
  childAgeBand: ChildAgeBand | "unknown";
  childProfileId: string;
  hint: string;
  imageBase64?: string;
  mimeType?: string;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const parsed = await parseHomeworkRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const payload = await analyzeHomework(parsed.value, request.headers.get("x-vercel-oidc-token"));
  const assignment = await saveHomeworkAssignment(parentContext.userId, parsed.value, payload).catch((error) => {
    if (error instanceof Error && error.message === "CHILD_PROFILE_NOT_FOUND") return null;
    throw error;
  });

  if (!assignment) {
    return NextResponse.json({ error: "CHILD_PROFILE_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ...payload, assignmentId: assignment.id, assignedChildProfileId: parsed.value.childProfileId }, { status: 200 });
}

async function parseHomeworkRequest(request: NextRequest): Promise<
  | { ok: true; value: ParsedHomeworkRequest }
  | { ok: false; error: string; status: number }
> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const language = normalizeLanguage(readFormString(form, "language"));
    const childAgeBand = normalizeAgeBand(readFormString(form, "childAgeBand"));
    const childProfileId = readFormString(form, "childProfileId");
    const hint = readFormString(form, "hint").slice(0, 1200);
    const image = form.get("image");

    if (!isUuid(childProfileId)) return { ok: false, error: "CHILD_PROFILE_REQUIRED", status: 400 };

    if (image instanceof File) {
      if (!supportedImageTypes.has(image.type)) return { ok: false, error: "UNSUPPORTED_IMAGE_TYPE", status: 415 };
      if (image.size > MAX_HOMEWORK_IMAGE_BYTES) return { ok: false, error: "IMAGE_TOO_LARGE", status: 413 };
      const bytes = new Uint8Array(await image.arrayBuffer());
      return {
        ok: true,
        value: {
          language,
          childAgeBand,
          childProfileId,
          hint,
          imageBase64: uint8ArrayToBase64(bytes),
          mimeType: image.type,
        },
      };
    }

    if (!hint) return { ok: false, error: "HOMEWORK_IMAGE_OR_HINT_REQUIRED", status: 400 };
    return { ok: true, value: { language, childAgeBand, childProfileId, hint } };
  }

  let body: { language?: unknown; childAgeBand?: unknown; childProfileId?: unknown; hint?: unknown; imageBase64?: unknown; mimeType?: unknown };
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "INVALID_JSON", status: 400 };
  }

  const language = normalizeLanguage(typeof body.language === "string" ? body.language : "");
  const childAgeBand = normalizeAgeBand(typeof body.childAgeBand === "string" ? body.childAgeBand : "");
  const childProfileId = typeof body.childProfileId === "string" ? body.childProfileId.trim() : "";
  const hint = (typeof body.hint === "string" ? body.hint.trim() : "").slice(0, 1200);
  const imageBase64 = sanitizeBase64(typeof body.imageBase64 === "string" ? body.imageBase64 : "");
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "image/jpeg";

  if (!isUuid(childProfileId)) return { ok: false, error: "CHILD_PROFILE_REQUIRED", status: 400 };

  if (imageBase64) {
    if (!supportedImageTypes.has(mimeType)) return { ok: false, error: "UNSUPPORTED_IMAGE_TYPE", status: 415 };
    if (base64ByteLength(imageBase64) > MAX_HOMEWORK_IMAGE_BYTES) return { ok: false, error: "IMAGE_TOO_LARGE", status: 413 };
    return { ok: true, value: { language, childAgeBand, childProfileId, hint, imageBase64, mimeType } };
  }

  if (!hint) return { ok: false, error: "HOMEWORK_IMAGE_OR_HINT_REQUIRED", status: 400 };
  return { ok: true, value: { language, childAgeBand, childProfileId, hint } };
}

async function saveHomeworkAssignment(parentId: string, request: ParsedHomeworkRequest, payload: HomeworkPayload) {
  const childProfile = await prisma.childProfile.findFirst({
    where: { id: request.childProfileId, parentId },
    select: { id: true, nickname: true },
  });

  if (!childProfile) throw new Error("CHILD_PROFILE_NOT_FOUND");

  const headerStore = await headers();
  return prisma.interactionEvent.create({
    data: {
      userId: parentId,
      eventType: "child_homework_assignment",
      geographicRegion: buildGeographicRegionFromHeaders(headerStore),
      metadataJson: JSON.stringify({
        childProfileId: childProfile.id,
        childNickname: childProfile.nickname,
        language: request.language,
        childAgeBand: request.childAgeBand,
        assignedAt: new Date().toISOString(),
        source: request.imageBase64 ? "image" : "hint",
        homework: payload,
      }),
    },
    select: { id: true },
  });
}

async function analyzeHomework(request: ParsedHomeworkRequest, oidcToken?: string | null): Promise<HomeworkPayload> {
  const fallback = buildFallbackHomework(request.language, request.childAgeBand, request.hint);

  if (!isGeminiConfigured()) return fallback;

  try {
    const ai = createGeminiClient(oidcToken);
    const parts: Part[] = [{ text: buildHomeworkPrompt(request) }];

    if (request.imageBase64 && request.mimeType) {
      parts.push({
        inlineData: {
          data: request.imageBase64,
          mimeType: request.mimeType,
        },
      });
    }

    const result = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.42,
        responseMimeType: "application/json",
        systemInstruction: [
          "You are FadFada's parent-controlled multimodal homework transformer for children.",
          "Read the uploaded worksheet/photo or parent hint, infer the skill, and turn it into playful practice questions.",
          "Never ask for school name, teacher name, class, location, child full name, phone, address, or private data.",
          "Do not shame mistakes. Keep the child-facing text short, warm, and tap-friendly.",
          "For KG/pre-literate children, use oral, matching, tracing, counting, color, and pointing style activities instead of long reading.",
          "If the requested language is Arabic, write all child-facing and parent-facing sentences in Arabic. If the worksheet teaches English letters or words, keep only the target letter/word itself in English, but explain the task in Arabic.",
          "Include answers for the parent, but write prompts so the child gets hints before answers.",
          "Return strict JSON only. No markdown fences. No extra text.",
        ].join("\n"),
      },
    });

    const parsed = parseGeminiJson<HomeworkPayload>(result.text || "");
    return normalizeHomeworkPayload(parsed, fallback, request.language);
  } catch (error) {
    console.error("Homework helper fallback", error);
    return fallback;
  }
}

function buildHomeworkPrompt(request: ParsedHomeworkRequest) {
  const isArabic = request.language === "ar";

  return JSON.stringify({
    input: {
      language: request.language,
      childAgeBand: request.childAgeBand,
      parentHint: request.hint || "No parent hint supplied. Inspect the uploaded image carefully.",
      imageInstruction: request.imageBase64 ? "Read the worksheet/photo. Extract visible math, English, Arabic, tracing, KG, or mixed learning task." : "No image supplied. Use the parent hint as the worksheet description.",
    },
    outputRules: {
      language: isArabic ? "Arabic only, simple parent-friendly Arabic." : "English only.",
      bilingualGuard: isArabic ? "Do not output English instructions such as Trace, Match, Choose, or full English sentences. If the task is about an English letter like A/B/C, keep the letter itself but explain the action in Arabic." : "Keep all instructions in English.",
      activities: "Return 5 to 7 activities. Mix quiz, match, trace, story, and challenge when appropriate.",
      childIntro: "One short exciting line a parent can read to the child.",
      parentSummary: "One sentence explaining what the worksheet is teaching.",
      visualPolicy: "Every activity must include visual. Use kind stars/circles/triangles/squares/letters/numbers/mixed. For counting, visual.count must be the exact count the child should see in that activity picture.",
      answerPolicy: "Every activity must include a parent answer and a gentle hint.",
      safety: "No private data, no school details, no camera storage claims beyond not storing the uploaded image.",
    },
    schema: {
      subject: "math | english | arabic | kg | mixed",
      detectedTask: "short skill name",
      parentSummary: "one sentence",
      childIntro: "short child-facing intro",
      activities: [
        {
          type: "quiz | trace | match | story | challenge",
          title: "short title",
          prompt: "child-facing question or action",
          hint: "gentle hint",
          answer: "parent answer",
          choices: ["optional short choices"],
          visual: { kind: "stars | circles | triangles | squares | letters | numbers | mixed", count: 5, label: "short image label" },
        },
      ],
      safetyNote: "parent privacy/safety note",
    },
  });
}

function normalizeHomeworkPayload(payload: HomeworkPayload | null, fallback: HomeworkPayload, language: Language): HomeworkPayload {
  if (!payload || !Array.isArray(payload.activities)) return fallback;

  const subjects = new Set(["math", "english", "arabic", "kg", "mixed"]);
  const types = new Set(["quiz", "trace", "match", "story", "challenge"]);
  const activities = payload.activities
    .filter((activity) => activity && typeof activity.prompt === "string" && activity.prompt.trim())
    .slice(0, 7)
    .map((activity, index) => {
      const normalizedActivity = {
        type: types.has(activity.type) ? activity.type : "quiz" as HomeworkActivityType,
        title: cleanText(activity.title, language === "ar" ? "نشاط سريع" : "Quick activity"),
        prompt: cleanText(activity.prompt, language === "ar" ? "اختر الإجابة الصحيحة." : "Choose the correct answer."),
        hint: cleanText(activity.hint, language === "ar" ? "ابدأ بخطوة صغيرة." : "Start with one small clue."),
        answer: cleanText(activity.answer, language === "ar" ? "راجع مع الطفل بهدوء." : "Review calmly with the child."),
        choices: Array.isArray(activity.choices) ? activity.choices.filter((choice) => typeof choice === "string" && choice.trim()).slice(0, 4).map((choice) => choice.trim().slice(0, 80)) : undefined,
        visual: normalizeActivityVisual(activity.visual, activity),
      };

      return language === "ar" ? normalizeArabicHomeworkActivity(normalizedActivity, fallback.activities[index] ?? fallback.activities[0]) : normalizedActivity;
    });

  return {
    subject: subjects.has(payload.subject) ? payload.subject : fallback.subject,
    detectedTask: normalizeHomeworkTextForLanguage(cleanText(payload.detectedTask, fallback.detectedTask), fallback.detectedTask, language),
    parentSummary: normalizeHomeworkTextForLanguage(cleanText(payload.parentSummary, fallback.parentSummary), fallback.parentSummary, language),
    childIntro: normalizeHomeworkTextForLanguage(cleanText(payload.childIntro, fallback.childIntro), fallback.childIntro, language),
    activities: activities.length ? activities : fallback.activities,
    safetyNote: normalizeHomeworkTextForLanguage(cleanText(payload.safetyNote, fallback.safetyNote), fallback.safetyNote, language),
  };
}

function normalizeArabicHomeworkActivity(activity: HomeworkActivity, fallbackActivity: HomeworkActivity): HomeworkActivity {
  const title = normalizeHomeworkTextForLanguage(activity.title, fallbackActivity.title, "ar");
  const prompt = normalizeHomeworkTextForLanguage(activity.prompt, fallbackActivity.prompt, "ar");
  const hint = normalizeHomeworkTextForLanguage(activity.hint, fallbackActivity.hint, "ar");
  const answer = normalizeHomeworkTextForLanguage(activity.answer, fallbackActivity.answer, "ar");
  const englishToken = extractHomeworkToken(`${activity.title} ${activity.prompt} ${activity.answer}`);

  if (containsMostlyEnglish(activity.title) || containsMostlyEnglish(activity.prompt)) {
    if (activity.type === "trace" && englishToken) {
      return {
        ...activity,
        title: `تتبّع الحرف ${englishToken}`,
        prompt: `تتبّع الحرف ${englishToken} الكبير.`,
        hint: "ابدأ من أعلى واتبع الشكل بهدوء.",
        answer: `الحرف المطلوب هو ${englishToken}.`,
      };
    }

    if ((activity.type === "match" || activity.type === "quiz") && englishToken) {
      return {
        ...activity,
        title: `نشاط الحرف ${englishToken}`,
        prompt: `ابحث عن الحرف ${englishToken} واختره.`,
        hint: `ركّز على شكل الحرف ${englishToken}.`,
        answer: `الإجابة الصحيحة هي ${englishToken}.`,
      };
    }

    return {
      ...activity,
      title: fallbackActivity.title,
      prompt: fallbackActivity.prompt,
      hint: fallbackActivity.hint,
      answer: fallbackActivity.answer,
    };
  }

  return {
    ...activity,
    title,
    prompt,
    hint,
    answer,
  };
}

function normalizeHomeworkTextForLanguage(value: string, fallback: string, language: Language) {
  if (language !== "ar") return value;
  return containsMostlyEnglish(value) ? fallback : value;
}

function containsMostlyEnglish(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const arabicMatches = trimmed.match(/[\u0600-\u06FF]/g) ?? [];
  const latinMatches = trimmed.match(/[A-Za-z]/g) ?? [];
  return latinMatches.length >= 4 && arabicMatches.length === 0;
}

function extractHomeworkToken(value: string) {
  const match = value.match(/\b([A-Z])\b|['"]([A-Za-z])['"]|\b([A-Za-z]{1,2})\b/);
  const token = match?.[1] || match?.[2] || match?.[3] || "";
  return token ? token.toUpperCase() : "";
}

function buildFallbackHomework(language: Language, ageBand: ChildAgeBand | "unknown", hint: string): HomeworkPayload {
  const isArabic = language === "ar";
  const kg = ageBand === "under_8" || /kg|kindergarten|حضانة|كي جي|روضة|ألوان|حروف|ارقام|أرقام/i.test(hint);

  if (isArabic) {
    return {
      subject: kg ? "kg" : "mixed",
      detectedTask: kg ? "تعلّم مبكر" : "مراجعة واجب",
      parentSummary: "حوّلت وصف الواجب إلى تدريب قصير آمن يمكن للطفل حله مع تلميحات قبل الإجابة.",
      childIntro: "جاهز يا بطل؟ سنحوّل الواجب إلى لعبة صغيرة.",
      activities: [
        { type: "quiz", title: "سؤال البداية", prompt: hint ? `ما أول شيء تلاحظه في الواجب: ${hint.slice(0, 90)}؟` : "ما أول شيء تلاحظه في الصورة؟", hint: "انظر للكلمة أو الرقم الأكبر أولاً.", answer: "يقبل الوالد ملاحظة الطفل الصحيحة ويكمل منها.", visual: { kind: "mixed", count: 4, label: "صورة البداية" } },
        { type: "match", title: "اختيار سريع", prompt: kg ? "اختر الشيء المختلف: دائرة، دائرة، مربع." : "اختر الطريقة التي تساعدك: عدّ، قراءة، أو رسم.", hint: "ابحث عن الشكل أو الفكرة التي لا تشبه الباقي.", answer: kg ? "المربع" : "أي اختيار مناسب يبدأ منه الطفل.", visual: { kind: kg ? "circles" : "numbers", count: 3, label: "اختيار مصور" } },
        { type: "challenge", title: "خطوة البطل", prompt: "حل سؤالاً واحداً فقط، ثم توقف وقل: فعلتها!", hint: "ابدأ بالأسهل وليس بالأطول.", answer: "الهدف بناء ثقة وليس إنهاء كل الواجب مرة واحدة.", visual: { kind: "stars", count: 5, label: "نجوم البطل" } },
      ],
      safetyNote: "الصورة لا تُحفظ هنا؛ استخدم اسماً مختصراً للطفل وتجنب بيانات المدرسة أو المعلم.",
    };
  }

  return {
    subject: kg ? "kg" : "mixed",
    detectedTask: kg ? "early learning" : "homework review",
    parentSummary: "I turned the homework description into short safe practice with hints before answers.",
    childIntro: "Ready, hero? Let’s turn homework into a tiny game.",
    activities: [
      { type: "quiz", title: "First look", prompt: hint ? `What is the first thing you notice here: ${hint.slice(0, 90)}?` : "What is the first thing you notice in the worksheet?", hint: "Look for the biggest word, number, or shape first.", answer: "Accept the child’s accurate observation and build from it.", visual: { kind: "mixed", count: 4, label: "First picture" } },
      { type: "match", title: "Quick pick", prompt: kg ? "Pick the odd one: circle, circle, square." : "Pick the helper strategy: count, read, or draw.", hint: "Find what does not match the others.", answer: kg ? "square" : "Any strategy that helps the child begin.", visual: { kind: kg ? "circles" : "numbers", count: 3, label: "Picture choice" } },
      { type: "challenge", title: "Hero step", prompt: "Solve one tiny question, then say: I did it!", hint: "Start with the easiest one, not the longest one.", answer: "The goal is confidence before finishing the whole page.", visual: { kind: "stars", count: 5, label: "Hero stars" } },
    ],
    safetyNote: "The image is processed for this request only; avoid school names, teacher names, full names, or private details.",
  };
}

function normalizeLanguage(value: string): Language {
  return value?.trim().toLowerCase() === "en" ? "en" : "ar";
}

function normalizeAgeBand(value: string): ChildAgeBand | "unknown" {
  return value === "under_8" || value === "8_to_10" || value === "11_to_12" || value === "13_plus" ? value : "unknown";
}

function normalizeActivityVisual(value: unknown, activity: Partial<HomeworkActivity>): HomeworkActivityVisual {
  const visual = value && typeof value === "object" ? value as Partial<HomeworkActivityVisual> : {};
  const text = `${activity.title || ""} ${activity.prompt || ""} ${activity.hint || ""} ${activity.answer || ""}`.toLowerCase();
  const kind = visual.kind === "stars" || visual.kind === "circles" || visual.kind === "triangles" || visual.kind === "squares" || visual.kind === "letters" || visual.kind === "numbers" || visual.kind === "mixed"
    ? visual.kind
    : /نجوم|نجمة|star/.test(text) ? "stars"
      : /دوائر|دائرة|circle/.test(text) ? "circles"
        : /مثلث|triang/.test(text) ? "triangles"
          : /مربع|square|box/.test(text) ? "squares"
            : /حرف|letter|abc|أ|ب|ت/.test(text) ? "letters"
              : /عدد|رقم|number|count|عد/.test(text) ? "numbers"
                : "mixed";
  const numericAnswer = typeof activity.answer === "string" ? Number((activity.answer.match(/[0-9٠-٩]+/) || [])[0]?.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))) : Number.NaN;
  const visualCount = typeof visual.count === "number" && Number.isFinite(visual.count) ? visual.count : numericAnswer;
  const count = Number.isFinite(visualCount) ? Math.min(8, Math.max(2, Math.round(visualCount))) : undefined;
  const label = typeof visual.label === "string" && visual.label.trim() ? visual.label.trim().slice(0, 60) : undefined;
  return { kind, count, label };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeBase64(value: string) {
  return value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
}

function base64ByteLength(value: string) {
  const clean = sanitizeBase64(value);
  if (!clean) return 0;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return Buffer.from(binary, "binary").toString("base64");
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

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 700) : fallback;
}
