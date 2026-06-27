import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const defaultConfiguration = {
  anonymousReflectionLimit: 5,
  signedGiftReflectionLimit: 15,
  anonymousPersonaLimit: 4,
  signedPersonaLimit: 10,
};

const configurationKeys = Object.keys(defaultConfiguration) as Array<keyof typeof defaultConfiguration>;

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

  for (const key of configurationKeys) {
    const numberValue = Number(value?.[key]);
    if (Number.isFinite(numberValue)) {
      configuration[key] = Math.max(1, Math.min(200, Math.round(numberValue)));
    }
  }

  return configuration;
}