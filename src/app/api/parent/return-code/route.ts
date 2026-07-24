import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, buildParentReturnCode, requireParentWorkspace } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const { code, expiresAt } = buildParentReturnCode(parentContext.userId);
  return NextResponse.json({ code, expiresAt });
}
