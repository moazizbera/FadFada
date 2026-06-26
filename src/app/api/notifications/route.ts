import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const allowedNotificationTypes = new Set(["GENERAL", "NEW_FEATURE", "NEW_AVATAR", "MAINTENANCE", "EVENT", "PAYMENT"]);

type NotificationRequestBody = {
  type?: string;
  titleAr?: string;
  titleEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  priority?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
};

type AdminSessionUser = {
  id?: string;
  role?: "USER" | "ADMIN";
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNotificationMetadata(metadataJson: string | null) {
  try {
    return JSON.parse(metadataJson || "{}") as Required<Pick<NotificationRequestBody, "type" | "titleAr" | "titleEn" | "bodyAr" | "bodyEn">> & {
      priority?: number;
      isActive?: boolean;
      startsAt?: string;
      endsAt?: string | null;
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const now = new Date();
  const notificationEvents = await prisma.interactionEvent.findMany({
    where: { eventType: "admin_notification" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const notifications = notificationEvents
    .map((event) => {
      const metadata = parseNotificationMetadata(event.metadataJson);
      if (!metadata) return null;
      const startsAt = parseDate(metadata.startsAt) || event.createdAt;
      const endsAt = parseDate(metadata.endsAt);
      if (metadata.isActive === false || startsAt > now || (endsAt && endsAt <= now)) return null;

      return {
        id: event.id,
        type: metadata.type,
        titleAr: metadata.titleAr,
        titleEn: metadata.titleEn,
        bodyAr: metadata.bodyAr,
        bodyEn: metadata.bodyEn,
        priority: Math.max(1, Math.min(5, Math.round(Number(metadata.priority) || 2))),
        startsAt,
        endsAt,
        createdAt: event.createdAt,
      };
    })
    .filter((notification): notification is NonNullable<typeof notification> => Boolean(notification))
    .sort((a, b) => b.priority - a.priority || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      ...notification,
      startsAt: notification.startsAt.toISOString(),
      endsAt: notification.endsAt?.toISOString() || null,
      createdAt: notification.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as AdminSessionUser | undefined;

  if (sessionUser?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json()) as NotificationRequestBody;
  const type = cleanText(body.type, 40).toUpperCase() || "GENERAL";
  const titleAr = cleanText(body.titleAr, 90);
  const titleEn = cleanText(body.titleEn, 90);
  const bodyAr = cleanText(body.bodyAr, 500);
  const bodyEn = cleanText(body.bodyEn, 500);
  const priority = Math.max(1, Math.min(5, Math.round(Number(body.priority) || 2)));
  const startsAt = parseDate(body.startsAt) || new Date();
  const endsAt = parseDate(body.endsAt);

  if (!allowedNotificationTypes.has(type) || !titleAr || !titleEn || !bodyAr || !bodyEn) {
    return NextResponse.json({ ok: false, error: "INVALID_NOTIFICATION" }, { status: 400 });
  }

  if (endsAt && endsAt <= startsAt) {
    return NextResponse.json({ ok: false, error: "INVALID_DATE_RANGE" }, { status: 400 });
  }

  const metadata = {
    type,
    titleAr,
    titleEn,
    bodyAr,
    bodyEn,
    priority,
    isActive: body.isActive ?? true,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt?.toISOString() || null,
  };
  const notification = await prisma.interactionEvent.create({
    data: {
      userId: sessionUser.id,
      eventType: "admin_notification",
      metadataJson: JSON.stringify(metadata),
      geographicRegion: "admin",
    },
  });

  return NextResponse.json({ ok: true, notificationId: notification.id });
}
