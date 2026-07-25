import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, getChildWorkspaceContext, readAuthenticatedUserId } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type HomeworkActivity = {
  type: "quiz" | "trace" | "match" | "story" | "challenge";
  title: string;
  prompt: string;
  hint: string;
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
  childIntro: string;
  activities: HomeworkActivity[];
};

type HomeworkAssignment = HomeworkPayload & {
  id: string;
  assignedAt: string;
  childProfileId: string;
  source: "image" | "hint";
  missionCompleted: boolean;
  missionCompletedAt: string | null;
  missionPoints: number;
};

type MissionSummary = {
  completedCount7d: number;
  streakDays: number;
  pointsTotal7d: number;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = readAuthenticatedUserId(session?.user);
  const childContext = getChildWorkspaceContext(session?.user);

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!childContext) {
    return NextResponse.json({ error: "CHILD_WORKSPACE_REQUIRED" }, { status: 403 });
  }

  const events = await prisma.interactionEvent.findMany({
    where: {
      userId,
      eventType: { in: ["child_homework_assignment", "child_mission_completion"] },
    },
    orderBy: { createdAt: "desc" },
    take: 160,
    select: {
      eventType: true,
      id: true,
      metadataJson: true,
      createdAt: true,
    },
  });

  const completionByAssignment = new Map<string, { completedAt: string; missionPoints: number }>();
  const completionDates = new Set<string>();
  let pointsTotal7d = 0;

  for (const event of events) {
    if (event.eventType !== "child_mission_completion") continue;
    const completion = parseMissionCompletion(event, childContext.childProfileId);
    if (!completion) continue;

    if (!completionByAssignment.has(completion.assignmentId)) {
      completionByAssignment.set(completion.assignmentId, {
        completedAt: completion.completedAt,
        missionPoints: completion.missionPoints,
      });
    }

    pointsTotal7d += completion.missionPoints;
    completionDates.add(completion.completedAt.slice(0, 10));
  }

  const assignments = events
    .filter((event) => event.eventType === "child_homework_assignment")
    .map((event) => parseHomeworkAssignment(event, childContext.childProfileId, completionByAssignment.get(event.id)))
    .filter((assignment): assignment is HomeworkAssignment => Boolean(assignment))
    .sort((left, right) => {
      if (left.missionCompleted !== right.missionCompleted) {
        return left.missionCompleted ? 1 : -1;
      }
      return Date.parse(right.assignedAt) - Date.parse(left.assignedAt);
    })
    .slice(0, 30);

  const missionSummary: MissionSummary = {
    completedCount7d: completionByAssignment.size,
    streakDays: computeCompletionStreakDays(completionDates),
    pointsTotal7d,
  };

  return NextResponse.json({ assignments, missionSummary });
}

function parseHomeworkAssignment(
  event: { id: string; metadataJson: string | null; createdAt: Date },
  childProfileId: string,
  missionCompletion?: { completedAt: string; missionPoints: number }
): HomeworkAssignment | null {
  if (!event.metadataJson) return null;

  try {
    const parsed = JSON.parse(event.metadataJson) as Record<string, unknown>;
    if (parsed.childProfileId !== childProfileId) return null;

    const homework = parsed.homework as Partial<HomeworkPayload> | undefined;
    if (!homework || !Array.isArray(homework.activities)) return null;

    const activities = homework.activities
      .filter((activity): activity is HomeworkActivity => Boolean(activity && typeof activity.prompt === "string" && activity.prompt.trim()))
      .slice(0, 7)
      .map((activity) => ({
        type: normalizeActivityType(activity.type),
        title: cleanText(activity.title, "Practice"),
        prompt: cleanText(activity.prompt, "Try one question."),
        hint: cleanText(activity.hint, "Start with one small clue."),
        choices: Array.isArray(activity.choices) ? activity.choices.filter((choice) => typeof choice === "string" && choice.trim()).slice(0, 4) : undefined,
        visual: normalizeActivityVisual(activity.visual, activity),
      }));

    if (activities.length === 0) return null;

    return {
      id: event.id,
      childProfileId,
      assignedAt: typeof parsed.assignedAt === "string" ? parsed.assignedAt : event.createdAt.toISOString(),
      source: parsed.source === "hint" ? "hint" : "image",
      subject: normalizeSubject(homework.subject),
      detectedTask: cleanText(homework.detectedTask, "Homework practice"),
      childIntro: cleanText(homework.childIntro, "Ready? Let’s practice together."),
      activities,
      missionCompleted: Boolean(missionCompletion),
      missionCompletedAt: missionCompletion?.completedAt || null,
      missionPoints: missionCompletion?.missionPoints || 0,
    };
  } catch {
    return null;
  }
}

function parseMissionCompletion(event: { metadataJson: string | null; createdAt: Date }, childProfileId: string) {
  if (!event.metadataJson) return null;

  try {
    const parsed = JSON.parse(event.metadataJson) as Record<string, unknown>;
    if (parsed.childProfileId !== childProfileId) return null;

    const assignmentId = typeof parsed.assignmentId === "string" ? parsed.assignmentId : "";
    if (!assignmentId) return null;

    const missionPoints = clampMissionPoints(parsed.missionPoints);
    const completedAt = typeof parsed.completedAt === "string" ? parsed.completedAt : event.createdAt.toISOString();

    return {
      assignmentId,
      missionPoints,
      completedAt,
    };
  } catch {
    return null;
  }
}

function clampMissionPoints(value: unknown) {
  const points = Number(value);
  if (!Number.isFinite(points)) return 5;
  return Math.max(1, Math.min(20, Math.round(points)));
}

function computeCompletionStreakDays(dateKeys: Set<string>) {
  if (dateKeys.size === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dateKeys.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function normalizeSubject(value: unknown): HomeworkPayload["subject"] {
  return value === "math" || value === "english" || value === "arabic" || value === "kg" || value === "mixed" ? value : "mixed";
}

function normalizeActivityType(value: unknown): HomeworkActivity["type"] {
  return value === "trace" || value === "match" || value === "story" || value === "challenge" ? value : "quiz";
}

function normalizeActivityVisual(value: unknown, activity: Partial<HomeworkActivity>): HomeworkActivityVisual {
  const visual = value && typeof value === "object" ? value as Partial<HomeworkActivityVisual> : {};
  const text = `${activity.title || ""} ${activity.prompt || ""} ${activity.hint || ""}`.toLowerCase();
  const kind = visual.kind === "stars" || visual.kind === "circles" || visual.kind === "triangles" || visual.kind === "squares" || visual.kind === "letters" || visual.kind === "numbers" || visual.kind === "mixed"
    ? visual.kind
    : /نجوم|نجمة|star/.test(text) ? "stars"
      : /دوائر|دائرة|circle/.test(text) ? "circles"
        : /مثلث|triang/.test(text) ? "triangles"
          : /مربع|square|box/.test(text) ? "squares"
            : /حرف|letter|abc|أ|ب|ت/.test(text) ? "letters"
              : /عدد|رقم|number|count|عد/.test(text) ? "numbers"
                : "mixed";
  const count = typeof visual.count === "number" && Number.isFinite(visual.count) ? Math.min(8, Math.max(2, Math.round(visual.count))) : undefined;
  const label = typeof visual.label === "string" && visual.label.trim() ? visual.label.trim().slice(0, 60) : undefined;
  return { kind, count, label };
}

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 700) : fallback;
}
