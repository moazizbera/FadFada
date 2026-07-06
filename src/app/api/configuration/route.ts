import { NextResponse } from "next/server";
import { personas } from "../../../lib/personas";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const defaultConfiguration = {
  anonymousReflectionLimit: 5,
  signedGiftReflectionLimit: 15,
  anonymousPersonaLimit: 4,
  signedPersonaLimit: 10,
  avatarsEnabled: true,
  blockedPersonaIds: [] as string[],
  anonymousPersonaIds: personas.slice(0, 4).map((persona) => persona.id),
  signedPersonaIds: personas.slice(0, 10).map((persona) => persona.id),
  plusPersonaIds: personas.map((persona) => persona.id),
};

const configurationNumberKeys = ["anonymousReflectionLimit", "signedGiftReflectionLimit", "anonymousPersonaLimit", "signedPersonaLimit"] as const;

export async function GET() {
  const latestConfigEvent = await prisma.interactionEvent.findFirst({
    where: { eventType: "admin_app_config" },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true },
  });

  return NextResponse.json({ configuration: cleanConfiguration(parseJson(latestConfigEvent?.metadataJson)) });
}

function parseJson(value: string | null | undefined) {
  if (!value) return null;

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function cleanConfiguration(value: Record<string, unknown> | null) {
  const configuration = { ...defaultConfiguration };

  for (const key of configurationNumberKeys) {
    const numberValue = Number(value?.[key]);
    if (Number.isFinite(numberValue)) {
      configuration[key] = Math.max(1, Math.min(200, Math.round(numberValue)));
    }
  }

  configuration.avatarsEnabled = value?.avatarsEnabled !== false;
  configuration.blockedPersonaIds = cleanPersonaIds(value?.blockedPersonaIds);
  configuration.anonymousPersonaIds = cleanPersonaIdsOrDefault(value?.anonymousPersonaIds, personas.slice(0, configuration.anonymousPersonaLimit).map((persona) => persona.id));
  configuration.signedPersonaIds = cleanPersonaIdsOrDefault(value?.signedPersonaIds, personas.slice(0, configuration.signedPersonaLimit).map((persona) => persona.id));
  configuration.plusPersonaIds = cleanPersonaIdsOrDefault(value?.plusPersonaIds, personas.map((persona) => persona.id));

  return configuration;
}

function cleanPersonaIds(value: unknown) {
  const validPersonaIds = new Set(personas.map((persona) => persona.id));
  return Array.from(new Set((Array.isArray(value) ? value : [])
    .map((item) => typeof item === "string" ? item.trim().slice(0, 80) : "")
    .filter((personaId) => validPersonaIds.has(personaId))));
}

function cleanPersonaIdsOrDefault(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  if (value.length === 0) return [];
  const cleanedPersonaIds = cleanPersonaIds(value);
  return cleanedPersonaIds.length > 0 ? cleanedPersonaIds : fallback;
}