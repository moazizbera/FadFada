import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, requireParentWorkspace } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type PulseTrend = "up" | "steady" | "down" | "quiet";
type PulseRisk = "low" | "medium" | "high";

type ChildPulseSummary = {
  childProfileId: string;
  nickname: string;
  turnCount7d: number;
  lastActivityAt: string | null;
  dominantWorld: string;
  trend: PulseTrend;
  riskLevel: PulseRisk;
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

export async function GET() {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

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
        eventType: "child_conversation_turn",
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
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
    count: number;
    recent3dCount: number;
    prev3dCount: number;
    riskHits: number;
    worlds: Map<string, number>;
    lastActivityAt: Date | null;
  }>();

  for (const child of children) {
    aggregate.set(child.id, {
      count: 0,
      recent3dCount: 0,
      prev3dCount: 0,
      riskHits: 0,
      worlds: new Map<string, number>(),
      lastActivityAt: null,
    });
  }

  for (const event of events) {
    const metadata = parseChildTurnMetadata(event.metadataJson);
    if (!metadata || !childById.has(metadata.childProfileId)) continue;

    const current = aggregate.get(metadata.childProfileId);
    if (!current) continue;

    current.count += 1;
    if (event.createdAt >= recent3dStart) {
      current.recent3dCount += 1;
    } else if (event.createdAt >= prev3dStart) {
      current.prev3dCount += 1;
    }

    if (!current.lastActivityAt || event.createdAt > current.lastActivityAt) {
      current.lastActivityAt = event.createdAt;
    }

    const worldKey = metadata.world || "calm";
    current.worlds.set(worldKey, (current.worlds.get(worldKey) || 0) + 1);

    current.riskHits += scoreChildRiskSignals(metadata.childText);
  }

  const pulse: ChildPulseSummary[] = children.map((child) => {
    const current = aggregate.get(child.id);
    const dominantWorld = getDominantWorld(current?.worlds);

    return {
      childProfileId: child.id,
      nickname: child.nickname,
      turnCount7d: current?.count || 0,
      lastActivityAt: current?.lastActivityAt ? current.lastActivityAt.toISOString() : null,
      dominantWorld,
      trend: computeTrend(current?.count || 0, current?.recent3dCount || 0, current?.prev3dCount || 0),
      riskLevel: computeRiskLevel(current?.riskHits || 0),
    };
  }).sort((left, right) => {
    const leftTime = left.lastActivityAt ? new Date(left.lastActivityAt).getTime() : 0;
    const rightTime = right.lastActivityAt ? new Date(right.lastActivityAt).getTime() : 0;
    return rightTime - leftTime;
  });

  return NextResponse.json({
    generatedAt: now.toISOString(),
    pulse,
  });
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
      assistantText: typeof parsed.assistantText === "string" ? parsed.assistantText.slice(0, 1200) : "",
      world: typeof parsed.world === "string" ? parsed.world.slice(0, 40) : "calm",
    };
  } catch {
    return null;
  }
}

function getDominantWorld(worlds: Map<string, number> | undefined) {
  if (!worlds || worlds.size === 0) return "calm";
  let topWorld = "calm";
  let topCount = 0;
  for (const [world, count] of worlds.entries()) {
    if (count > topCount) {
      topCount = count;
      topWorld = world;
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
