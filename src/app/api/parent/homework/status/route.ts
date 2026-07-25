import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, requireParentWorkspace } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

type ChildRow = {
  id: string;
  nickname: string;
};

type HomeworkAssignmentSummary = {
  id: string;
  childProfileId: string;
  childNickname: string;
  detectedTask: string;
  subject: "math" | "english" | "arabic" | "kg" | "mixed";
  assignedAt: string;
  missionCompleted: boolean;
  missionCompletedAt: string | null;
  missionPoints: number;
};

type ChildFollowup = {
  childProfileId: string;
  childNickname: string;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  completionRate: number;
  totalPoints: number;
  assignments: HomeworkAssignmentSummary[];
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const [children, events] = await Promise.all([
    prisma.childProfile.findMany({
      where: { parentId: parentContext.userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true },
    }),
    prisma.interactionEvent.findMany({
      where: {
        userId: parentContext.userId,
        eventType: { in: ["child_homework_assignment", "child_mission_completion"] },
      },
      orderBy: { createdAt: "desc" },
      take: 600,
      select: {
        id: true,
        eventType: true,
        metadataJson: true,
        createdAt: true,
      },
    }),
  ]);

  const childrenById = new Map<string, ChildRow>(children.map((child) => [child.id, child]));
  const completionByAssignmentId = new Map<string, { completedAt: string; missionPoints: number; childProfileId: string }>();

  for (const event of events) {
    if (event.eventType !== "child_mission_completion" || !event.metadataJson) continue;

    try {
      const metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
      const assignmentId = typeof metadata.assignmentId === "string" ? metadata.assignmentId : "";
      const childProfileId = typeof metadata.childProfileId === "string" ? metadata.childProfileId : "";
      if (!assignmentId || !childProfileId) continue;
      if (!childrenById.has(childProfileId) || completionByAssignmentId.has(assignmentId)) continue;

      completionByAssignmentId.set(assignmentId, {
        childProfileId,
        completedAt: typeof metadata.completedAt === "string" ? metadata.completedAt : event.createdAt.toISOString(),
        missionPoints: clampMissionPoints(metadata.missionPoints),
      });
    } catch {
      continue;
    }
  }

  const groupedByChild = new Map<string, HomeworkAssignmentSummary[]>();

  for (const event of events) {
    if (event.eventType !== "child_homework_assignment" || !event.metadataJson) continue;

    try {
      const metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
      const childProfileId = typeof metadata.childProfileId === "string" ? metadata.childProfileId : "";
      if (!childProfileId || !childrenById.has(childProfileId)) continue;

      const homework = metadata.homework as Record<string, unknown> | undefined;
      const detectedTask = typeof homework?.detectedTask === "string" && homework.detectedTask.trim() ? homework.detectedTask.trim().slice(0, 200) : "Homework";
      const subject = normalizeSubject(homework?.subject);
      const completion = completionByAssignmentId.get(event.id);
      const child = childrenById.get(childProfileId)!;

      const summary: HomeworkAssignmentSummary = {
        id: event.id,
        childProfileId,
        childNickname: child.nickname,
        detectedTask,
        subject,
        assignedAt: typeof metadata.assignedAt === "string" ? metadata.assignedAt : event.createdAt.toISOString(),
        missionCompleted: Boolean(completion),
        missionCompletedAt: completion?.completedAt || null,
        missionPoints: completion?.missionPoints || 0,
      };

      const current = groupedByChild.get(childProfileId) ?? [];
      current.push(summary);
      groupedByChild.set(childProfileId, current);
    } catch {
      continue;
    }
  }

  const childrenFollowup: ChildFollowup[] = children.map((child) => {
    const assignments = (groupedByChild.get(child.id) ?? [])
      .sort((left, right) => Date.parse(right.assignedAt) - Date.parse(left.assignedAt))
      .slice(0, 40);

    const completedAssignments = assignments.filter((assignment) => assignment.missionCompleted).length;
    const pendingAssignments = Math.max(0, assignments.length - completedAssignments);
    const totalPoints = assignments.reduce((sum, assignment) => sum + assignment.missionPoints, 0);

    return {
      childProfileId: child.id,
      childNickname: child.nickname,
      totalAssignments: assignments.length,
      completedAssignments,
      pendingAssignments,
      completionRate: assignments.length ? Math.round((completedAssignments / assignments.length) * 100) : 0,
      totalPoints,
      assignments,
    };
  });

  const totals = childrenFollowup.reduce(
    (accumulator, child) => {
      accumulator.totalAssignments += child.totalAssignments;
      accumulator.completedAssignments += child.completedAssignments;
      accumulator.pendingAssignments += child.pendingAssignments;
      accumulator.totalPoints += child.totalPoints;
      return accumulator;
    },
    { totalAssignments: 0, completedAssignments: 0, pendingAssignments: 0, totalPoints: 0 }
  );

  return NextResponse.json({
    children: childrenFollowup,
    totals,
  });
}

function normalizeSubject(value: unknown): HomeworkAssignmentSummary["subject"] {
  if (value === "math" || value === "english" || value === "arabic" || value === "kg" || value === "mixed") {
    return value;
  }
  return "mixed";
}

function clampMissionPoints(value: unknown) {
  const points = Number(value);
  if (!Number.isFinite(points)) return 0;
  return Math.max(0, Math.min(20, Math.round(points)));
}
