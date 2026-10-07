import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createFamilyFlowRoutine, approveFamilyFlowRoutine, rescheduleFamilyFlowRoutine, type FamilyFlowRoutine } from "./familyFlow";
import { prisma } from "./prisma";

const eventType = "parent_family_flow_routine";

type FamilyFlowEventMetadata = {
  routineId: string;
  childProfileId: string;
  updatedAt: string;
  source?: "parent_ui" | "mcp";
  routine: FamilyFlowRoutine;
};

export function createFamilyFlowMcpServer(parentId: string) {
  const server = new McpServer({ name: "fadfada-family-flow", version: "0.1.112" });

  server.registerTool("get_family_routine", {
    title: "Get family routine",
    description: "Read the latest parent-owned homework routine for one child. It never returns child answers or a child conversation.",
    inputSchema: { childProfileId: z.string().uuid() },
  }, async ({ childProfileId }) => {
    const routine = await findLatestRoutine(parentId, childProfileId);
    return textResult(routine ? { routineId: routine.routineId, updatedAt: routine.updatedAt, routine: routine.routine } : { routine: null });
  });

  server.registerTool("create_family_routine", {
    title: "Create family routine",
    description: "Create a parent-reviewable homework routine. The routine remains awaiting parent approval and is not sent to the child.",
    inputSchema: {
      childProfileId: z.string().uuid(),
      subject: z.enum(["math", "english", "arabic", "mixed"]),
      detectedTask: z.string().trim().min(1).max(160),
      totalMinutes: z.number().int().min(5).max(45),
    },
  }, async ({ childProfileId, subject, detectedTask, totalMinutes }) => {
    await requireOwnedChildProfile(parentId, childProfileId);
    const routine = createFamilyFlowRoutine({ childProfileId, subject, detectedTask, totalMinutes });
    const metadata = await saveRoutine(parentId, crypto.randomUUID(), routine);
    return textResult({ routineId: metadata.routineId, updatedAt: metadata.updatedAt, routine: metadata.routine });
  });

  server.registerTool("reschedule_family_routine", {
    title: "Reschedule family routine",
    description: "Shorten or lengthen an existing routine while retaining completed steps. A rescheduled routine always requires parent approval again.",
    inputSchema: {
      childProfileId: z.string().uuid(),
      totalMinutes: z.number().int().min(5).max(45),
    },
  }, async ({ childProfileId, totalMinutes }) => {
    const current = await requireLatestRoutine(parentId, childProfileId);
    const metadata = await saveRoutine(parentId, current.routineId, rescheduleFamilyFlowRoutine(current.routine, totalMinutes));
    return textResult({ routineId: metadata.routineId, updatedAt: metadata.updatedAt, routine: metadata.routine });
  });

  server.registerTool("approve_family_routine", {
    title: "Approve family routine",
    description: "Record explicit parent approval for the latest routine. This does not contact a child or automatically assign homework.",
    inputSchema: { childProfileId: z.string().uuid() },
  }, async ({ childProfileId }) => {
    const current = await requireLatestRoutine(parentId, childProfileId);
    const metadata = await saveRoutine(parentId, current.routineId, approveFamilyFlowRoutine(current.routine));
    return textResult({ routineId: metadata.routineId, updatedAt: metadata.updatedAt, routine: metadata.routine });
  });

  return server;
}

async function requireOwnedChildProfile(parentId: string, childProfileId: string) {
  const childProfile = await prisma.childProfile.findFirst({
    where: { id: childProfileId, parentId },
    select: { id: true },
  });
  if (!childProfile) throw new Error("CHILD_PROFILE_NOT_FOUND");
  return childProfile;
}

async function findLatestRoutine(parentId: string, childProfileId: string) {
  await requireOwnedChildProfile(parentId, childProfileId);
  const events = await prisma.interactionEvent.findMany({
    where: { userId: parentId, eventType },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true },
    take: 50,
  });

  for (const event of events) {
    const metadata = parseMetadata(event.metadataJson);
    if (metadata?.childProfileId === childProfileId) return metadata;
  }

  return null;
}

async function requireLatestRoutine(parentId: string, childProfileId: string) {
  const routine = await findLatestRoutine(parentId, childProfileId);
  if (!routine) throw new Error("ROUTINE_NOT_FOUND");
  return routine;
}

async function saveRoutine(parentId: string, routineId: string, routine: FamilyFlowRoutine) {
  const metadata: FamilyFlowEventMetadata = {
    routineId,
    childProfileId: routine.childProfileId,
    updatedAt: new Date().toISOString(),
    source: "mcp",
    routine,
  };

  await prisma.interactionEvent.create({
    data: {
      userId: parentId,
      eventType,
      geographicRegion: "mcp",
      metadataJson: JSON.stringify(metadata),
    },
  });

  return metadata;
}

function parseMetadata(value: string | null): FamilyFlowEventMetadata | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const metadata = parsed as Partial<FamilyFlowEventMetadata>;
    if (!isUuid(metadata.routineId || "") || !isUuid(metadata.childProfileId || "") || !metadata.routine || typeof metadata.updatedAt !== "string") return null;
    return metadata as FamilyFlowEventMetadata;
  } catch {
    return null;
  }
}

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}