import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, getChildWorkspaceContext, readAuthenticatedUserId } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type CompleteMissionRequest = {
  assignmentId?: unknown;
  missionPoints?: unknown;
  detectedTask?: unknown;
  subject?: unknown;
  correctAnswersCount?: unknown;
  totalAnswersCount?: unknown;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = readAuthenticatedUserId(session?.user);
  const childContext = getChildWorkspaceContext(session?.user);

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!childContext) {
    return NextResponse.json({ error: "CHILD_WORKSPACE_REQUIRED" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null) as CompleteMissionRequest | null;
  const assignmentId = typeof payload?.assignmentId === "string" ? payload.assignmentId.trim() : "";

  if (!assignmentId) {
    return NextResponse.json({ error: "ASSIGNMENT_ID_REQUIRED" }, { status: 400 });
  }

  const assignmentEvent = await prisma.interactionEvent.findFirst({
    where: {
      id: assignmentId,
      userId,
      eventType: "child_homework_assignment",
      metadataJson: { contains: childContext.childProfileId },
    },
    select: { id: true },
  });

  if (!assignmentEvent) {
    return NextResponse.json({ error: "ASSIGNMENT_NOT_FOUND" }, { status: 404 });
  }

  const duplicateCompletion = await prisma.interactionEvent.findFirst({
    where: {
      userId,
      eventType: "child_mission_completion",
      metadataJson: { contains: assignmentId },
    },
    select: { id: true },
  });

  if (duplicateCompletion) {
    return NextResponse.json({
      ok: true,
      assignmentId,
      duplicate: true,
      missionPoints: 0,
      completedAt: new Date().toISOString(),
    });
  }

  const missionPoints = clampMissionPoints(payload?.missionPoints);
  const nowIso = new Date().toISOString();
  const totalAnswersCount = clampAnswerCount(payload?.totalAnswersCount);
  const correctAnswersCount = Math.min(totalAnswersCount, clampAnswerCount(payload?.correctAnswersCount));

  await prisma.$transaction([
    prisma.interactionEvent.create({
      data: {
        userId,
        eventType: "child_mission_completion",
        geographicRegion: "child_workspace",
        metadataJson: JSON.stringify({
          childProfileId: childContext.childProfileId,
          assignmentId,
          missionPoints,
          correctAnswersCount,
          totalAnswersCount,
          detectedTask: typeof payload?.detectedTask === "string" ? payload.detectedTask.slice(0, 180) : "",
          subject: typeof payload?.subject === "string" ? payload.subject.slice(0, 40) : "mixed",
          completedAt: nowIso,
        }),
      },
    }),
    prisma.childProfile.updateMany({
      where: {
        id: childContext.childProfileId,
        parentId: userId,
      },
      data: {
        gamePoints: {
          increment: missionPoints,
        },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    assignmentId,
    duplicate: false,
    missionPoints,
    correctAnswersCount,
    totalAnswersCount,
    completedAt: nowIso,
  });
}

function clampMissionPoints(value: unknown) {
  const points = Number(value);
  if (!Number.isFinite(points)) return 8;
  return Math.max(1, Math.min(20, Math.round(points)));
}

function clampAnswerCount(value: unknown) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(100, Math.round(count)));
}
