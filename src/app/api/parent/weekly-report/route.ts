import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, requireParentWorkspace } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type Language = "ar" | "en";
type PulseTrend = "up" | "steady" | "down" | "quiet";
type PulseRisk = "low" | "medium" | "high";
type EngagementLevel = "high" | "medium" | "low" | "quiet";

type WeeklyReportChild = {
  childProfileId: string;
  nickname: string;
  dominantWorld: string;
  turnCount7d: number;
  trend: PulseTrend;
  riskLevel: PulseRisk;
  homeworkCount7d: number;
  playbookCount7d: number;
  headline: string;
  summary: string;
  nextAction: string;
  updatedAt: string | null;
};

type WeeklyReportResponse = {
  generatedAt: string;
  windowDays: number;
  summary: string;
  wins: string[];
  focusAreas: string[];
  nextWeekPlan: string[];
  businessHint: string;
  metrics: {
    activeChildren: number;
    totalTurns: number;
    homeworkAssignments: number;
    playbookRuns: number;
    highRiskChildren: number;
  };
  children: WeeklyReportChild[];
};

const highRiskSignals = [
  "suicide",
  "kill myself",
  "end my life",
  "hurt myself",
  "self harm",
  "cut myself",
  "someone is hurting me",
  "abuse",
  "assault",
  "molest",
  "انتحار",
  "انتحر",
  "اقتل نفسي",
  "اذي نفسي",
  "ايذاء نفسي",
  "ااذي نفسي",
  "نزيف",
  "يؤذيني",
  "ياذيني",
  "اعتداء",
  "تحرش",
  "يضربني",
] as const;

const mediumRiskSignals = [
  "knife",
  "bleeding",
  "unsafe secret",
  "dont tell my parents",
  "dont tell mom",
  "dont tell dad",
  "im scared alone",
  "سر خطير",
  "لا تقول لماما",
  "لا تقول لبابا",
  "خايف لوحدي",
  "خوفني",
  "خائف في البيت",
  "عنف",
] as const;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const language = normalizeLanguage(request.nextUrl.searchParams.get("language"));
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 7);

  const [children, events] = await Promise.all([
    prisma.childProfile.findMany({
      where: { parentId: parentContext.userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nickname: true,
      },
    }),
    prisma.interactionEvent.findMany({
      where: {
        userId: parentContext.userId,
        eventType: { in: ["child_conversation_turn", "child_homework_assignment", "parent_playbook"] },
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "desc" },
      take: 1200,
      select: {
        eventType: true,
        metadataJson: true,
        createdAt: true,
      },
    }),
  ]);

  const childById = new Map(children.map((child) => [child.id, child.nickname]));
  const recent3dStart = new Date(now);
  recent3dStart.setUTCDate(recent3dStart.getUTCDate() - 3);
  const prev3dStart = new Date(now);
  prev3dStart.setUTCDate(prev3dStart.getUTCDate() - 6);

  const aggregate = new Map<string, {
    turnCount: number;
    recent3dCount: number;
    prev3dCount: number;
    riskHits: number;
    homeworkCount: number;
    playbookCount: number;
    worlds: Map<string, number>;
    lastActivityAt: Date | null;
  }>();

  for (const child of children) {
    aggregate.set(child.id, {
      turnCount: 0,
      recent3dCount: 0,
      prev3dCount: 0,
      riskHits: 0,
      homeworkCount: 0,
      playbookCount: 0,
      worlds: new Map<string, number>(),
      lastActivityAt: null,
    });
  }

  let totalHomeworkAssignments = 0;
  let totalPlaybookRuns = 0;

  for (const event of events) {
    if (event.eventType === "child_conversation_turn") {
      const metadata = parseChildTurnMetadata(event.metadataJson);
      if (!metadata || !childById.has(metadata.childProfileId)) continue;

      const current = aggregate.get(metadata.childProfileId);
      if (!current) continue;

      current.turnCount += 1;
      current.riskHits += scoreChildRiskSignals(metadata.childText);
      current.worlds.set(metadata.world, (current.worlds.get(metadata.world) || 0) + 1);

      if (event.createdAt >= recent3dStart) {
        current.recent3dCount += 1;
      } else if (event.createdAt >= prev3dStart) {
        current.prev3dCount += 1;
      }

      if (!current.lastActivityAt || event.createdAt > current.lastActivityAt) {
        current.lastActivityAt = event.createdAt;
      }
      continue;
    }

    if (event.eventType === "child_homework_assignment") {
      const childProfileId = parseChildProfileId(event.metadataJson);
      if (!childProfileId || !childById.has(childProfileId)) continue;

      const current = aggregate.get(childProfileId);
      if (!current) continue;

      current.homeworkCount += 1;
      totalHomeworkAssignments += 1;

      if (!current.lastActivityAt || event.createdAt > current.lastActivityAt) {
        current.lastActivityAt = event.createdAt;
      }
      continue;
    }

    if (event.eventType === "parent_playbook") {
      totalPlaybookRuns += 1;
      const childProfileId = parseChildProfileId(event.metadataJson);
      if (!childProfileId || !childById.has(childProfileId)) continue;

      const current = aggregate.get(childProfileId);
      if (!current) continue;
      current.playbookCount += 1;

      if (!current.lastActivityAt || event.createdAt > current.lastActivityAt) {
        current.lastActivityAt = event.createdAt;
      }
    }
  }

  const childReports = children.map((child) => {
    const current = aggregate.get(child.id);
    const dominantWorld = getDominantWorld(current?.worlds);
    const trend = computeTrend(current?.turnCount || 0, current?.recent3dCount || 0, current?.prev3dCount || 0);
    const riskLevel = computeRiskLevel(current?.riskHits || 0);
    const engagement = computeEngagementLevel(current?.turnCount || 0);

    return {
      childProfileId: child.id,
      nickname: child.nickname,
      dominantWorld,
      turnCount7d: current?.turnCount || 0,
      trend,
      riskLevel,
      homeworkCount7d: current?.homeworkCount || 0,
      playbookCount7d: current?.playbookCount || 0,
      ...buildChildNarrative({ language, dominantWorld, trend, riskLevel, engagement, turnCount7d: current?.turnCount || 0 }),
      updatedAt: current?.lastActivityAt ? current.lastActivityAt.toISOString() : null,
    } as WeeklyReportChild;
  }).sort((left, right) => {
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    return rightTime - leftTime;
  });

  const activeChildren = childReports.filter((child) => child.turnCount7d > 0).length;
  const totalTurns = childReports.reduce((sum, child) => sum + child.turnCount7d, 0);
  const highRiskChildren = childReports.filter((child) => child.riskLevel === "high").length;

  const response: WeeklyReportResponse = {
    generatedAt: now.toISOString(),
    windowDays: 7,
    summary: buildSummary(language, activeChildren, children.length, totalTurns, highRiskChildren),
    wins: buildWins(language, childReports, totalHomeworkAssignments, totalPlaybookRuns),
    focusAreas: buildFocusAreas(language, childReports),
    nextWeekPlan: buildNextWeekPlan(language, childReports),
    businessHint: buildBusinessHint(language, totalHomeworkAssignments, totalPlaybookRuns, activeChildren),
    metrics: {
      activeChildren,
      totalTurns,
      homeworkAssignments: totalHomeworkAssignments,
      playbookRuns: totalPlaybookRuns,
      highRiskChildren,
    },
    children: childReports,
  };

  return NextResponse.json(response, { status: 200 });
}

function normalizeLanguage(value: string | null): Language {
  return value === "en" ? "en" : "ar";
}

function parseChildTurnMetadata(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const childProfileId = typeof parsed.childProfileId === "string" ? parsed.childProfileId : "";
    if (!childProfileId) return null;

    return {
      childProfileId,
      childText: typeof parsed.childText === "string" ? parsed.childText.slice(0, 1200) : "",
      world: typeof parsed.world === "string" ? parsed.world.slice(0, 40) : "calm",
    };
  } catch {
    return null;
  }
}

function parseChildProfileId(value: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return typeof parsed.childProfileId === "string" ? parsed.childProfileId : "";
  } catch {
    return "";
  }
}

function getDominantWorld(worlds: Map<string, number> | undefined) {
  if (!worlds || worlds.size === 0) return "calm";

  let topWorld = "calm";
  let topCount = 0;

  for (const [world, count] of worlds.entries()) {
    if (count > topCount) {
      topWorld = world;
      topCount = count;
    }
  }

  return topWorld;
}

function computeTrend(count: number, recent3dCount: number, prev3dCount: number): PulseTrend {
  if (count === 0) return "quiet";
  if (recent3dCount >= prev3dCount + 2) return "up";
  if (prev3dCount >= recent3dCount + 2) return "down";
  return "steady";
}

function computeRiskLevel(riskHits: number): PulseRisk {
  if (riskHits >= 4) return "high";
  if (riskHits >= 1) return "medium";
  return "low";
}

function computeEngagementLevel(turnCount7d: number): EngagementLevel {
  if (turnCount7d >= 18) return "high";
  if (turnCount7d >= 8) return "medium";
  if (turnCount7d >= 1) return "low";
  return "quiet";
}

function normalizeSafetyText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreChildRiskSignals(childText: string) {
  const normalized = normalizeSafetyText(childText);
  if (!normalized) return 0;

  let score = 0;

  for (const signal of highRiskSignals) {
    if (normalized.includes(signal)) score += 2;
  }

  for (const signal of mediumRiskSignals) {
    if (normalized.includes(signal)) score += 1;
  }

  return Math.min(score, 6);
}

function buildChildNarrative(input: {
  language: Language;
  dominantWorld: string;
  trend: PulseTrend;
  riskLevel: PulseRisk;
  engagement: EngagementLevel;
  turnCount7d: number;
}) {
  const world = formatWorld(input.dominantWorld, input.language);
  const isArabic = input.language === "ar";

  if (input.riskLevel === "high") {
    return {
      headline: isArabic ? "أولوية أمان واحتواء" : "Safety and co-regulation first",
      summary: isArabic ? `ظهر هذا الأسبوع إشارات عالية، مع حضور متكرر في ${world}.` : `This week showed elevated signals, with repeated activity in ${world}.`,
      nextAction: isArabic ? "ابدأ اليوم بدقيقة قرب هادئة، ثم استخدم جملة أمان قصيرة قبل أي تصحيح." : "Start today with one calm minute of closeness, then use one safety sentence before any correction.",
    };
  }

  if (input.trend === "up" && (input.engagement === "high" || input.engagement === "medium")) {
    return {
      headline: isArabic ? "نافذة نمو مفتوحة" : "Growth window is open",
      summary: isArabic ? `النشاط صاعد (${input.turnCount7d} تفاعل) والعالم الغالب ${world}.` : `Activity is rising (${input.turnCount7d} turns) and ${world} is dominant.`,
      nextAction: isArabic ? "استثمر الزخم بسؤال متابعة واحد ثم مهمة قصيرة مشتركة." : "Use the momentum with one follow-up question and one short shared mission.",
    };
  }

  if (input.trend === "down" || input.riskLevel === "medium") {
    return {
      headline: isArabic ? "نحتاج إصلاحًا خفيفًا" : "Light repair week",
      summary: isArabic ? `هناك هبوط أو حساسية متوسطة، و${world} يظهر كمساحة متكررة.` : `There is a dip or medium sensitivity, and ${world} keeps returning.`,
      nextAction: isArabic ? "اختر سؤالًا واحدًا فقط الليلة، ثم قدم خيارين آمنين بدل كثرة الطلبات." : "Use one question tonight, then offer two safe choices instead of piling requests.",
    };
  }

  if (input.engagement === "quiet") {
    return {
      headline: isArabic ? "الأسبوع كان هادئًا" : "Quiet week",
      summary: isArabic ? "لا يوجد تفاعل كافٍ هذا الأسبوع لبناء نمط واضح." : "Not enough activity this week to form a clear pattern.",
      nextAction: isArabic ? "ابدأ بجلسة لعب أو واجب مصغر من دقيقتين لإعادة فتح القناة." : "Start with a two-minute play or mini-homework prompt to reopen the channel.",
    };
  }

  return {
    headline: isArabic ? "إيقاع مستقر" : "Steady rhythm",
    summary: isArabic ? `الإيقاع متوازن هذا الأسبوع مع حضور ${world}.` : `The week stayed balanced with ${world} showing up often.`,
    nextAction: isArabic ? "حافظ على طقس يومي قصير وثابت بدل فتح مواضيع كثيرة." : "Keep one short daily ritual instead of opening too many topics.",
  };
}

function buildSummary(language: Language, activeChildren: number, totalChildren: number, totalTurns: number, highRiskChildren: number) {
  if (language === "ar") {
    return `نشط هذا الأسبوع ${activeChildren} من ${totalChildren} أطفال، مع ${totalTurns} تفاعل مسجل.${highRiskChildren > 0 ? ` يوجد ${highRiskChildren} ملف يحتاج متابعة أهدأ.` : " لا توجد إشارات خطر مرتفعة حالياً."}`;
  }

  return `${activeChildren} of ${totalChildren} children were active this week with ${totalTurns} tracked turns.${highRiskChildren > 0 ? ` ${highRiskChildren} profile(s) need calmer safety follow-up.` : " No high-risk signals were detected."}`;
}

function buildWins(language: Language, children: WeeklyReportChild[], homeworkCount: number, playbookCount: number) {
  const topChild = [...children].sort((a, b) => b.turnCount7d - a.turnCount7d)[0];
  const wins: string[] = [];

  if (language === "ar") {
    if (topChild && topChild.turnCount7d > 0) {
      wins.push(`أكثر تفاعل: ${topChild.nickname} (${topChild.turnCount7d} تفاعل).`);
    }
    if (homeworkCount > 0) {
      wins.push(`تم إنشاء ${homeworkCount} واجب محول للطفل هذا الأسبوع.`);
    }
    if (playbookCount > 0) {
      wins.push(`تم استخدام دليل ولي الأمر ${playbookCount} مرة.`);
    }
    if (wins.length === 0) {
      wins.push("هذا الأسبوع مناسب لتجربة أول واجب أو خطة موقف لبناء عادة متابعة.");
    }
    return wins.slice(0, 3);
  }

  if (topChild && topChild.turnCount7d > 0) {
    wins.push(`Most active child: ${topChild.nickname} (${topChild.turnCount7d} turns).`);
  }
  if (homeworkCount > 0) {
    wins.push(`${homeworkCount} homework transformations were created this week.`);
  }
  if (playbookCount > 0) {
    wins.push(`Parent Playbook was used ${playbookCount} times.`);
  }
  if (wins.length === 0) {
    wins.push("This week is a good baseline week to start one homework and one playbook habit.");
  }
  return wins.slice(0, 3);
}

function buildFocusAreas(language: Language, children: WeeklyReportChild[]) {
  const highRisk = children.filter((child) => child.riskLevel === "high");
  const quietChildren = children.filter((child) => child.turnCount7d === 0);
  const downTrend = children.filter((child) => child.trend === "down");

  if (language === "ar") {
    const focus = [
      highRisk.length > 0 ? `أولوية الأمان: ${highRisk.map((child) => child.nickname).join("، ")}.` : "استمر في نبرة هادئة مع كل طفل قبل التصحيح.",
      quietChildren.length > 0 ? `أطفال هادئون هذا الأسبوع: ${quietChildren.map((child) => child.nickname).join("، ")}.` : "لا يوجد انقطاع كامل بالنشاط هذا الأسبوع.",
      downTrend.length > 0 ? `اتجاه هابط لدى: ${downTrend.map((child) => child.nickname).join("، ")}.` : "الاتجاهات ليست هابطة بشكل واضح الآن.",
    ];

    return focus;
  }

  return [
    highRisk.length > 0 ? `Safety priority: ${highRisk.map((child) => child.nickname).join(", ")}.` : "Keep a calm-first tone before correction for all children.",
    quietChildren.length > 0 ? `Quiet profiles this week: ${quietChildren.map((child) => child.nickname).join(", ")}.` : "No fully quiet profiles this week.",
    downTrend.length > 0 ? `Downward trend in: ${downTrend.map((child) => child.nickname).join(", ")}.` : "No clear downward trends right now.",
  ];
}

function buildNextWeekPlan(language: Language, children: WeeklyReportChild[]) {
  const mediumOrHigh = children.filter((child) => child.riskLevel !== "low").length;

  if (language === "ar") {
    return [
      "اختيار طقس ثابت 3 دقائق قبل النوم لكل طفل.",
      mediumOrHigh > 0 ? "استخدام جملة أمان واحدة يوميًا مع الملفات الحساسة." : "الحفاظ على سؤال متابعة واحد يوميًا بدل أسئلة كثيرة.",
      "تشغيل واجب محول واحد وخطة موقف واحدة على الأقل هذا الأسبوع.",
    ];
  }

  return [
    "Run one fixed 3-minute bedtime ritual per child.",
    mediumOrHigh > 0 ? "Use one safety sentence daily for sensitive profiles." : "Use one follow-up question daily instead of many prompts.",
    "Ship at least one homework transformation and one playbook this week.",
  ];
}

function buildBusinessHint(language: Language, homeworkCount: number, playbookCount: number, activeChildren: number) {
  if (language === "ar") {
    if (activeChildren === 0) return "نقطة نمو هذا الأسبوع: أعد تفعيل طفل واحد على الأقل عبر جلسة لعب قصيرة ثم احفظ النتيجة.";
    if (homeworkCount === 0 || playbookCount === 0) return "نقطة نمو هذا الأسبوع: اجمع بين محول الواجب ودليل ولي الأمر لنفس الطفل لرفع العودة الأسبوعية.";
    return "نقطة نمو هذا الأسبوع: شارك تقريرًا أسبوعيًا مختصرًا مع ولي الأمر الآخر كإثبات أثر منتظم.";
  }

  if (activeChildren === 0) return "Growth move this week: reactivate at least one child with a short play session, then save the outcome.";
  if (homeworkCount === 0 || playbookCount === 0) return "Growth move this week: pair Homework Transformer and Parent Playbook for the same child to increase weekly return.";
  return "Growth move this week: share one concise weekly report with the other parent as proof of consistent value.";
}

function formatWorld(world: string, language: Language) {
  const labels: Record<string, { ar: string; en: string }> = {
    calm: { ar: "هادئ", en: "Calm" },
    story: { ar: "حكاية", en: "Story" },
    faith: { ar: "إيمان", en: "Faith" },
    build: { ar: "بناء", en: "Build" },
    learning: { ar: "تعلم", en: "Learning" },
    celebration: { ar: "فرح", en: "Joy" },
    grief: { ar: "سكينة", en: "Stillness" },
  };

  return labels[world]?.[language] || world;
}
