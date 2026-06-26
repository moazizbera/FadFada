import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type AdminSessionUser = {
  role?: "USER" | "ADMIN";
};

export async function POST() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as AdminSessionUser | undefined;

  if (sessionUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      OR: [{ registrationRegion: null }, { registrationRegion: "unknown" }],
    },
    select: {
      id: true,
      visitorLogs: {
        where: { geographicRegion: { not: "unknown" } },
        orderBy: { timestamp: "desc" },
        select: { geographicRegion: true },
        take: 1,
      },
    },
  });

  let updated = 0;

  for (const user of users) {
    const geographicRegion = user.visitorLogs[0]?.geographicRegion;
    if (!geographicRegion) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: { registrationRegion: geographicRegion },
    });
    updated += 1;
  }

  return NextResponse.json({ ok: true, scanned: users.length, updated });
}