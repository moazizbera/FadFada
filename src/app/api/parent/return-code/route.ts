import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, buildParentReturnCode, readAuthenticatedUserId } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = readAuthenticatedUserId(session?.user);

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { code, expiresAt } = buildParentReturnCode(userId);
  return NextResponse.json({ code, expiresAt });
}
