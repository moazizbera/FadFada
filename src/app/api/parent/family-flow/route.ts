import crypto from "crypto";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, buildGeographicRegionFromHeaders, requireParentWorkspace } from "../../../../lib/auth";
import { approveFamilyFlowRoutine, completeFamilyFlowStep, createFamilyFlowRoutine, rescheduleFamilyFlowRoutine, type FamilyFlowRoutine } from "../../../../lib/familyFlow";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const eventType = "parent_family_flow_routine";

type FamilyFlowEventMetadata = {
  routineId: string;
  childProfileId: string;
  updatedAt: string;
  routine: FamilyFlowRoutine;
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const childProfileId = request.nextUrl.searchParams.get("childProfileId")?.trim() || "";
  if (!isUuid(childProfileId)) return NextResponse.json({ error: "CHILD_PROFILE_REQUIRED" }, { status: 400 });

  const childProfile = await findOwnedChildProfile(parentContext.userId, childProfileId);
  if (!childProfile) return NextResponse.json({ error: "CHILD_PROFILE_NOT_FOUND" }, { status: 404 });

  const metadata = await findLatestRoutine(parentContext.userId, childProfile.id);

  if (!metadata) {
    return NextResponse.json({ routine: null }, { status: 200 });
  }

  return NextResponse.json({ routine: metadata.routine, routineId: metadata.routineId, updatedAt: metadata.updatedAt }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const body = await readRequestBody(request);
  if (!body) return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });

  const childProfileId = readString(body.childProfileId);
  if (!isUuid(childProfileId)) return NextResponse.json({ error: "CHILD_PROFILE_REQUIRED" }, { status: 400 });

  const childProfile = await findOwnedChildProfile(parentContext.userId, childProfileId);
  if (!childProfile) return NextResponse.json({ error: "CHILD_PROFILE_NOT_FOUND" }, { status: 404 });

  const action = readString(body.action);
  const currentMetadata = await findLatestRoutine(parentContext.userId, childProfile.id);
  let routine: FamilyFlowRoutine;
  let routineId: string;

  if (action === "create") {
    const subject = readString(body.subject);
    const detectedTask = readString(body.detectedTask);
    const totalMinutes = readNumber(body.totalMinutes);
    if (!subject || !detectedTask || totalMinutes === null) {
      return NextResponse.json({ error: "ROUTINE_DETAILS_REQUIRED" }, { status: 400 });
    }
    routine = createFamilyFlowRoutine({ childProfileId: childProfile.id, subject, detectedTask, totalMinutes });
    routineId = crypto.randomUUID();
  } else {
    if (!currentMetadata) return NextResponse.json({ error: "ROUTINE_NOT_FOUND" }, { status: 404 });
    routineId = currentMetadata.routineId;

    if (action === "approve") {
      routine = approveFamilyFlowRoutine(currentMetadata.routine);
    } else if (action === "reschedule") {
      const totalMinutes = readNumber(body.totalMinutes);
      if (totalMinutes === null) return NextResponse.json({ error: "TOTAL_MINUTES_REQUIRED" }, { status: 400 });
      routine = rescheduleFamilyFlowRoutine(currentMetadata.routine, totalMinutes);
    } else if (action === "complete_step") {
      const stepId = readString(body.stepId);
      if (!stepId) return NextResponse.json({ error: "STEP_ID_REQUIRED" }, { status: 400 });
      routine = completeFamilyFlowStep(currentMetadata.routine, stepId);
    } else {
      return NextResponse.json({ error: "UNSUPPORTED_ACTION" }, { status: 400 });
    }
  }

  const updatedAt = new Date().toISOString();
  const metadata: FamilyFlowEventMetadata = { routineId, childProfileId: childProfile.id, updatedAt, routine };
  const headerStore = await headers();

  await prisma.interactionEvent.create({
    data: {
      userId: parentContext.userId,
      eventType,
      geographicRegion: buildGeographicRegionFromHeaders(headerStore),
      metadataJson: JSON.stringify(metadata),
    },
  });

  return NextResponse.json({ routine, routineId, updatedAt }, { status: 200 });
}

async function findOwnedChildProfile(parentId: string, childProfileId: string) {
  return prisma.childProfile.findFirst({
    where: { id: childProfileId, parentId },
    select: { id: true },
  });
}

async function findLatestRoutine(parentId: string, childProfileId: string) {
  const events = await prisma.interactionEvent.findMany({
    where: { userId: parentId, eventType },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true },
    take: 20,
  });

  for (const event of events) {
    const metadata = parseMetadata(event.metadataJson);
    if (metadata?.childProfileId === childProfileId) return metadata;
  }

  return null;
}

async function readRequestBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function parseMetadata(value: string | null | undefined): FamilyFlowEventMetadata | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const metadata = parsed as Partial<FamilyFlowEventMetadata>;
    if (!isUuid(metadata.childProfileId || "") || !isUuid(metadata.routineId || "") || !metadata.routine || typeof metadata.updatedAt !== "string") return null;
    return metadata as FamilyFlowEventMetadata;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}