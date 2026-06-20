import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/prisma";
import { worlds, type WorldId } from "../../../../lib/worlds";

export const runtime = "nodejs";

const CAPSULE_PRICE_CENTS = 2499;
const MAX_HISTORY_MESSAGES = 1200;
const MAX_HISTORY_CHARACTERS = 180_000;

type Language = "ar" | "en";

type ChatHistoryMessage = {
  role: "user" | "assistant" | "system";
  text: string;
  world?: WorldId;
  createdAt?: string;
};

type CapsulePrintRequest = {
  userId?: string;
  currentLanguage?: Language;
  currentWorld?: WorldId;
  chatHistory?: ChatHistoryMessage[];
  fulfillmentPartner?: "printful" | "gelato";
};

type SevenDayPlanItem = {
  day: number;
  title: string;
  practice: string;
  reflectionPrompt: string;
  completionSignal: string;
};

type MomentCapsuleTemplate = {
  title: string;
  language: Language;
  direction: "rtl" | "ltr";
  cover: {
    headline: string;
    subtitle: string;
    palette: string[];
  };
  emotionalEvolution: {
    startingPoint: string;
    turningPoint: string;
    currentNeed: string;
    growthPattern: string;
  };
  customPoetry: {
    title: string;
    lines: string[];
    styleNotes: string;
  };
  sevenDayWellnessProject: SevenDayPlanItem[];
  closingLetter: string;
  printProduction: {
    format: "A5_REFLECTION_JOURNAL";
    pageCountEstimate: number;
    binding: "perfect_bound";
    interior: "premium_matte";
  };
};

export async function POST(request: NextRequest) {
  let body: CapsulePrintRequest;

  try {
    body = (await request.json()) as CapsulePrintRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const chatHistory = normalizeChatHistory(body.chatHistory);
  const currentLanguage = body.currentLanguage === "ar" ? "ar" : "en";
  const currentWorld = normalizeWorld(body.currentWorld);
  const fulfillmentPartner = body.fulfillmentPartner === "gelato" ? "gelato" : "printful";

  if (!userId) {
    return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
  }

  if (chatHistory.length < 2) {
    return NextResponse.json({ error: "CHAT_HISTORY_REQUIRED" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }

  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, tokenBalance: 3 },
    update: {},
  });

  const template = await compileMomentCapsuleTemplate({ chatHistory, currentLanguage, currentWorld });
  const capsule = await prisma.momentCapsule.create({
    data: {
      userId,
      title: template.title,
      language: currentLanguage,
      templateJson: JSON.stringify(template),
      fulfillmentPartner,
      fulfillmentStatus: "DRAFT",
    },
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
  const locale = (currentLanguage === "ar" ? "ar" : "en") as Stripe.Checkout.SessionCreateParams.Locale;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    mode: "payment",
    client_reference_id: userId,
    customer_creation: "if_required",
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "GB", "AE", "SA", "EG", "DE", "FR", "NL", "AU"],
    },
    phone_number_collection: {
      enabled: true,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: CAPSULE_PRICE_CENTS,
          product_data: {
            name: "FadFada Personal Reflection Journal",
            description: currentLanguage === "ar" ? "كبسولة مطبوعة من رحلتك العاطفية وخطة ٧ أيام." : "A printed capsule of your emotional breakthrough and 7-day plan.",
            metadata: {
              product: "moment_capsule_journal",
              capsuleId: capsule.id,
              fulfillmentPartner,
            },
          },
        },
      },
    ],
    success_url: `${appUrl}/?capsule=ordered&capsuleId=${capsule.id}`,
    cancel_url: `${appUrl}/?capsule=cancelled&capsuleId=${capsule.id}`,
    locale,
    metadata: {
      product: "moment_capsule_journal",
      capsuleId: capsule.id,
      userId,
      fulfillmentPartner,
      fulfillmentStatus: "pending_webhook",
    },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await prisma.momentCapsule.update({
    where: { id: capsule.id },
    data: {
      stripeSessionId: session.id,
      fulfillmentStatus: "CHECKOUT_CREATED",
    },
  });

  return NextResponse.json(
    {
      url: session.url,
      capsuleId: capsule.id,
      amountDue: CAPSULE_PRICE_CENTS,
      currency: "usd",
      fulfillmentPartner,
      template,
    },
    { status: 200 }
  );
}

async function compileMomentCapsuleTemplate({
  chatHistory,
  currentLanguage,
  currentWorld,
}: {
  chatHistory: ChatHistoryMessage[];
  currentLanguage: Language;
  currentWorld: WorldId;
}): Promise<MomentCapsuleTemplate> {
  const fallback = buildFallbackCapsule(chatHistory, currentLanguage, currentWorld);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const historyText = serializeHistoryForLongContext(chatHistory);
    const result = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildCapsulePrompt({ currentLanguage, currentWorld, historyText }),
            },
          ],
        },
      ],
      config: {
        temperature: 0.64,
        responseMimeType: "application/json",
        systemInstruction: [
          "You are the autonomous Moment Capsule design agent for FadFada | فضفضة.",
          "Use the full long-context conversation to synthesize a print-ready personal reflection journal template.",
          "Do not invent traumatic details, diagnoses, or religious rulings. Preserve the user's language and emotional agency.",
          "Return strict JSON only. No markdown fences. No prose outside JSON.",
        ].join("\n"),
      },
    });

    const parsed = parseGeminiJson<MomentCapsuleTemplate>(result.text || "");
    if (!parsed) {
      return fallback;
    }

    return normalizeCapsuleTemplate(parsed, currentLanguage);
  } catch (error) {
    console.error("Moment Capsule fallback", error);
    return fallback;
  }
}

function buildCapsulePrompt({
  currentLanguage,
  currentWorld,
  historyText,
}: {
  currentLanguage: Language;
  currentWorld: WorldId;
  historyText: string;
}) {
  const direction = currentLanguage === "ar" ? "rtl" : "ltr";
  return JSON.stringify({
    task: "Compile a beautiful personalized PDF template for a physical FadFada Personal Reflection Journal.",
    language: currentLanguage,
    direction,
    currentWorld,
    worldTone: worlds[currentWorld].tone,
    conversationHistory: historyText,
    requiredJsonShape: {
      title: "string, emotionally specific and print-worthy",
      language: currentLanguage,
      direction,
      cover: {
        headline: "string",
        subtitle: "string",
        palette: ["hex color", "hex color", "hex color"],
      },
      emotionalEvolution: {
        startingPoint: "string",
        turningPoint: "string",
        currentNeed: "string",
        growthPattern: "string",
      },
      customPoetry: {
        title: "string",
        lines: ["8 to 16 poetry lines matching the user's vibe"],
        styleNotes: "string",
      },
      sevenDayWellnessProject: [
        {
          day: "1 through 7",
          title: "string",
          practice: "specific 10-25 minute practice",
          reflectionPrompt: "journal prompt",
          completionSignal: "how the user knows it is complete",
        },
      ],
      closingLetter: "warm letter from FadFada, no clinical claims",
      printProduction: {
        format: "A5_REFLECTION_JOURNAL",
        pageCountEstimate: "integer from 16 to 48",
        binding: "perfect_bound",
        interior: "premium_matte",
      },
    },
  });
}

function normalizeChatHistory(history: CapsulePrintRequest["chatHistory"]): ChatHistoryMessage[] {
  if (!Array.isArray(history)) return [];

  let totalCharacters = 0;
  const normalized: ChatHistoryMessage[] = [];

  for (const message of history.slice(-MAX_HISTORY_MESSAGES)) {
    if (!message || typeof message.text !== "string") continue;
    const text = message.text.trim();
    if (!text) continue;
    totalCharacters += text.length;
    if (totalCharacters > MAX_HISTORY_CHARACTERS) break;
    normalized.push({
      role: message.role === "assistant" || message.role === "system" ? message.role : "user",
      text,
      world: normalizeWorld(message.world),
      createdAt: message.createdAt,
    });
  }

  return normalized;
}

function serializeHistoryForLongContext(history: ChatHistoryMessage[]) {
  return history
    .map((message, index) => {
      const timestamp = message.createdAt ? ` @ ${message.createdAt}` : "";
      const world = message.world ? ` [${message.world}]` : "";
      return `${index + 1}. ${message.role}${world}${timestamp}: ${message.text}`;
    })
    .join("\n");
}

function buildFallbackCapsule(history: ChatHistoryMessage[], language: Language, world: WorldId): MomentCapsuleTemplate {
  const isArabic = language === "ar";
  const userLines = history.filter((message) => message.role === "user").map((message) => message.text);
  const firstNeed = userLines[0] || (isArabic ? "البداية كانت رغبة في تفريغ ما تراكم داخلك." : "The beginning was a need to release what had been building inside.");
  const latestNeed = userLines[userLines.length - 1] || firstNeed;

  return {
    title: isArabic ? "كبسولة لحظة هادئة" : "A Capsule for a Steadier Moment",
    language,
    direction: isArabic ? "rtl" : "ltr",
    cover: {
      headline: isArabic ? "فضفضة شخصية مطبوعة" : "A Personal FadFada Reflection",
      subtitle: isArabic ? "من حديث داخلي طويل إلى خطة أسبوع واضحة" : "From a long inner conversation to a clear seven-day project",
      palette: ["#0E0D10", worlds[world].orbHex, "#F7F3EC"],
    },
    emotionalEvolution: {
      startingPoint: firstNeed,
      turningPoint: isArabic ? "بدأ التحول عندما صار الشعور قابلا للتسمية بدلا من أن يبقى كتلة واحدة." : "The shift began when the feeling became nameable instead of staying one heavy mass.",
      currentNeed: latestNeed,
      growthPattern: isArabic ? "نمطك الأقوى هو تحويل الضغط إلى خطوة صغيرة يمكن احترامها." : "Your strongest pattern is turning pressure into one small step you can respect.",
    },
    customPoetry: {
      title: isArabic ? "على حافة النفس" : "At the Edge of a Breath",
      lines: isArabic
        ? ["أخفف صوت العالم قليلا", "وأترك قلبي يختار مقعده", "لا أحتاج أن أصل دفعة واحدة", "يكفيني أن أعرف الطريق الصغير", "خطوة تشبهني", "ونفس لا يخاصمني"]
        : ["I lower the volume of the day", "and let my heart choose a chair", "I do not need to arrive all at once", "only to find the smaller road", "one step that sounds like me", "one breath that does not argue back"],
      styleNotes: isArabic ? "قصيدة قصيرة بنبرة سكينة وبناء." : "A short poem with stillness and constructive movement.",
    },
    sevenDayWellnessProject: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      title: isArabic ? `اليوم ${index + 1}: خطوة صغيرة` : `Day ${index + 1}: One Small Step`,
      practice: isArabic ? "خصص 15 دقيقة لمساحة واحدة: ترتيب، كتابة، أو مشي هادئ." : "Spend 15 minutes on one contained space: reset, write, or take a quiet walk.",
      reflectionPrompt: isArabic ? "ما الشيء الذي صار أخف ولو بدرجة واحدة؟" : "What became one degree lighter today?",
      completionSignal: isArabic ? "جملة واحدة مكتوبة أو مساحة صغيرة أهدأ." : "One written sentence or one calmer small space.",
    })),
    closingLetter: isArabic
      ? "هذه ليست نهاية الرحلة. إنها نسخة ملموسة من لحظة استطعت فيها أن تسمع نفسك بوضوح أكبر. ارجع إليها عندما يعلو الضجيج."
      : "This is not the end of the journey. It is a tangible version of a moment when you heard yourself more clearly. Return to it when the noise rises.",
    printProduction: {
      format: "A5_REFLECTION_JOURNAL",
      pageCountEstimate: 28,
      binding: "perfect_bound",
      interior: "premium_matte",
    },
  };
}

function normalizeCapsuleTemplate(template: MomentCapsuleTemplate, language: Language): MomentCapsuleTemplate {
  return {
    ...template,
    language,
    direction: language === "ar" ? "rtl" : "ltr",
    title: template.title?.trim() || (language === "ar" ? "كبسولة فضفضة" : "FadFada Moment Capsule"),
    cover: {
      headline: template.cover?.headline || template.title || "FadFada Moment Capsule",
      subtitle: template.cover?.subtitle || "Personal Reflection Journal",
      palette: Array.isArray(template.cover?.palette) && template.cover.palette.length >= 3 ? template.cover.palette.slice(0, 5) : ["#0E0D10", "#C9A86A", "#F7F3EC"],
    },
    sevenDayWellnessProject: normalizePlan(template.sevenDayWellnessProject),
    printProduction: {
      format: "A5_REFLECTION_JOURNAL",
      pageCountEstimate: clampPageCount(template.printProduction?.pageCountEstimate),
      binding: "perfect_bound",
      interior: "premium_matte",
    },
  };
}

function normalizePlan(plan: SevenDayPlanItem[]) {
  if (!Array.isArray(plan)) return [];
  return plan.slice(0, 7).map((item, index) => ({
    day: index + 1,
    title: item.title || `Day ${index + 1}`,
    practice: item.practice || "Complete one small grounding practice.",
    reflectionPrompt: item.reflectionPrompt || "What changed by one degree?",
    completionSignal: item.completionSignal || "One sentence written.",
  }));
}

function clampPageCount(value: number | undefined) {
  if (!Number.isFinite(value)) return 28;
  return Math.min(48, Math.max(16, Math.round(value || 28)));
}

function parseGeminiJson<T>(text: string): T | null {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function normalizeWorld(value: string | undefined | null): WorldId {
  return value && value in worlds ? (value as WorldId) : "calm";
}
